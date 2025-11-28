import React, { useEffect, useState } from "react";
import {
    getMaintenanceDetails,
    addMaintenanceDetail,
    updateMaintenanceDetail,
    deleteMaintenanceDetail,
    restoreMaintenanceDetail,
    getOwners,
    getMaintenanceRates,
} from "../services/api";

import "../css/Maintenance.css";

const MaintenanceDetail = () => {
    const [details, setDetails] = useState([]);
    const [owners, setOwners] = useState([]);
    const [rates, setRates] = useState([]);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);

    const [lastMonthBalance, setLastMonthBalance] = useState(0); // Fixed
    //const [remainingBalance, setRemainingBalance] = useState(0); // Will change

    const [form, setForm] = useState({
        owner_id: "",
        rate_id: "",
        bill_start_date: "",
        bill_end_date: "",
        bill_duration: 0,
        paid_amount: 0,
        status: "Pending",
        prev_balance_amount: 0,
        total_amount: 0,
    });

    const [totalRateAmount, setTotalRateAmount] = useState(0);
    //const [prevBalance, setPrevBalance] = useState(0);
    const [finalTotal, setFinalTotal] = useState(0);

    // Load data on page load
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const ownersData = await getOwners();
        const rateData = await getMaintenanceRates();
        const detailsData = await getMaintenanceDetails();

        setOwners(Array.isArray(ownersData) ? ownersData : ownersData.data || []);
        setRates(Array.isArray(rateData) ? rateData : rateData.data || []);
        setDetails(Array.isArray(detailsData) ? detailsData : detailsData.data || []);
    };

    // Auto-calc total when rate changes
    /* useEffect(() => {
        if (form.rate_id) {
            const selectedRate = rates.find((r) => r.rate_id === parseInt(form.rate_id));
            const rateAmount = selectedRate ? selectedRate.amount : 0;
            setTotalRateAmount(rateAmount);
            setFinalTotal(rateAmount + prevBalance);
        }
    }, [form.rate_id, prevBalance, rates]); */

    // Calculate total when owner, rates, duration, or previous balance changes
    useEffect(() => {
        if (form.owner_id) {
            const selectedOwner = owners.find(o => o.owner_id === parseInt(form.owner_id));

            if (selectedOwner) {
                const bhkRates = rates
                    .filter(r => r.flat_type_id === selectedOwner.flat_type_id)
                    .map(r => Number(r.amount));

                const totalRate = bhkRates.reduce((sum, a) => sum + a, 0);

                setTotalRateAmount(totalRate);

                // Total = (rates per month * duration) + previous balance
                const duration = Number(form.bill_duration) || 1;
                const monthlyTotal = totalRate * duration;
                setFinalTotal(monthlyTotal + lastMonthBalance);
            }
        }
    }, [form.owner_id, form.bill_duration, rates, owners, lastMonthBalance]);





    // Auto-calc duration when start or end date changes
    useEffect(() => {
        if (form.bill_start_date && form.bill_end_date) {
            const start = new Date(form.bill_start_date);
            const end = new Date(form.bill_end_date);

            if (end >= start) {
                const months =
                    (end.getFullYear() - start.getFullYear()) * 12 +
                    (end.getMonth() - start.getMonth()) + 1; // inclusive
                setForm((prev) => ({ ...prev, bill_duration: months }));
            } else {
                setForm((prev) => ({ ...prev, bill_duration: 0 }));
            }
        }
    }, [form.bill_start_date, form.bill_end_date]);

    // Owner selection → auto-select rate based on BHK
    /*  const handleOwnerSelect = (ownerId) => {
         const selectedOwner = owners.find((o) => o.owner_id === parseInt(ownerId));
         setForm({
             ...form,
             owner_id: ownerId,
             rate_id: rates.find(r => r.flat_type_id === selectedOwner.flat_type_id)?.rate_id || "",
         });
 
         // Previous balance calculation
         const lastRecord = details
             .filter((d) => d.owner_id === parseInt(ownerId))
             .sort((a, b) => b.maintain_id - a.maintain_id)[0];
 
         const balance = lastRecord ? lastRecord.prev_balance_amount : 0;
         setPrevBalance(balance);
     }; */

    const handleOwnerSelect = (ownerId) => {
        if (!ownerId) {
            // Reset if owner is cleared
            setForm({ ...form, owner_id: "", rate_id: "" });
            setLastMonthBalance(0);
            setTotalRateAmount(0);
            setFinalTotal(0);
            return;
        }

        const selectedOwner = owners.find(o => o.owner_id === parseInt(ownerId));
        if (!selectedOwner) return;

        // Auto-select first rate (not used for total, only stored)
        const firstRateId = rates.find(
            r => r.flat_type_id === selectedOwner.flat_type_id
        )?.rate_id || "";

        setForm({
            ...form,
            owner_id: ownerId,
            rate_id: firstRateId,
        });

        // Previous balance from last record = total_amount - paid_amount from last record
        const lastRecord = details
            .filter(d => d.owner_id === parseInt(ownerId) && !d.is_deleted)
            .sort((a, b) => b.maintain_id - a.maintain_id)[0];

        // Previous balance = remaining amount from last record (total - paid)
        const balance = lastRecord
            ? Number(lastRecord.total_amount) - Number(lastRecord.paid_amount)
            : 0;

        setLastMonthBalance(balance);
    };
    /* 
        const handlePaidAmount = (value) => {
            const paid = Number(value);
            const remaining = finalTotal - paid;
            setPrevBalance(remaining);
            setForm({ ...form, paid_amount: paid });
        }; */

    const handlePaidAmount = (value) => {
        const paid = Number(value);
        const total = finalTotal;
        const remaining = total - paid;

        // Auto-update status based on payment
        let status = "Pending";
        if (remaining < 0) {
            status = "Advance Available";
        } else if (remaining === 0 && total > 0) {
            status = "Paid";
        } else if (paid > 0) {
            status = "Pending";
        } else {
            status = "Pending";
        }

        setForm({ ...form, paid_amount: paid, status });
    };


    const handleSubmit = async () => {
        // Calculate prev_balance_amount (from last record) and total_amount
        const prevBalance = lastMonthBalance; // This is already calculated from last record
        const totalAmount = finalTotal; // totalRateAmount + prevBalance
        const paidAmount = Number(form.paid_amount) || 0;

        // Auto-update status based on payment
        const remaining = totalAmount - paidAmount;
        let status = form.status;
        if (remaining < 0) {
            status = "Advance Available";
        } else if (remaining === 0 && totalAmount > 0) {
            status = "Paid";
        } else if (paidAmount > 0) {
            status = "Pending";
        } else {
            status = "Pending";
        }

        const payload = {
            ...form,
            total_rate_amount: totalRateAmount,
            paid_amount: paidAmount,
            prev_balance_amount: prevBalance,
            total_amount: totalAmount,
            status: status,
        };

        try {
            if (isEditing) {
                await updateMaintenanceDetail(editId, payload);
                alert("Maintenance Updated Successfully");
            } else {
                await addMaintenanceDetail(payload);
                alert("Maintenance Added Successfully");
            }

            setIsEditing(false);
            setEditId(null);
            resetForm();
            fetchData();
        } catch (error) {
            console.error("Error saving maintenance:", error);
            alert(`Error: ${error.response?.data?.error || error.message || "Failed to save maintenance"}`);
        }
    };

    const resetForm = () => {
        setForm({
            owner_id: "",
            rate_id: "",
            bill_start_date: "",
            bill_end_date: "",
            bill_duration: 0,
            paid_amount: 0,
            status: "Pending",
            prev_balance_amount: 0,
            total_amount: 0,
        });
        setTotalRateAmount(0);
        setLastMonthBalance(0);
        setFinalTotal(0);
    };

    const handleEdit = (row) => {
        setIsEditing(true);
        setEditId(row.maintain_id);

        setForm({
            owner_id: row.owner_id,
            rate_id: row.rate_id,
            bill_start_date: row.bill_start_date,
            bill_end_date: row.bill_end_date,
            bill_duration: row.bill_duration,
            paid_amount: row.paid_amount,
            status: row.status,
            prev_balance_amount: row.prev_balance_amount,
            total_amount: row.total_amount,
        });

        // For editing, use the stored prev_balance_amount (previous balance that was used)
        // and total_rate_amount from the record (or calculate if not available)
        const prevBalance = Number(row.prev_balance_amount) || 0;
        const total = Number(row.total_amount) || 0;
        const duration = Number(row.bill_duration) || 1;

        // Calculate total_rate_amount: if not stored, calculate from total and prev_balance
        let totalRate = 0;
        if (row.total_rate_amount !== undefined && row.total_rate_amount !== null) {
            totalRate = Number(row.total_rate_amount);
        } else {
            // Calculate: total = (rates * duration) + prev_balance
            // So: rates = (total - prev_balance) / duration
            totalRate = duration > 0 ? (total - prevBalance) / duration : (total - prevBalance);
        }

        setLastMonthBalance(prevBalance);
        setTotalRateAmount(totalRate);
        setFinalTotal(total);
    };

    const handleDelete = async (id) => {
        const reason = prompt("Enter delete reason:");
        if (!reason) return alert("Delete reason required");
        await deleteMaintenanceDetail(id, reason);
        alert("Maintenance Deleted Successfully");
        fetchData();
    };

    const handleRestore = async (id) => {
        await restoreMaintenanceDetail(id);
        alert("Record Restored");
        fetchData();
    };

    return (
        <div className="maintenance-container">
            <h2>Maintenance Entry</h2>

            <div className="form-section">
                <label>Owner</label>
                <select value={form.owner_id} onChange={(e) => handleOwnerSelect(e.target.value)}>
                    <option value="">Select Owner</option>
                    {owners.map((o) => (
                        <option key={o.owner_id} value={o.owner_id}>
                            {o.owner_name} ({o.flat_type_name})
                        </option>
                    ))}
                </select>

                <label>Rate (Auto-selected by BHK)</label>
                <select value={form.rate_id} disabled>
                    <option value="">Rate</option>
                    {rates.map((r) => (
                        <option key={r.rate_id} value={r.rate_id}>
                            ₹{r.amount} ({r.flat_type_id} BHK)
                        </option>
                    ))}
                </select>

                <label>Bill Start Date</label>
                <input
                    type="date"
                    value={form.bill_start_date}
                    onChange={(e) => setForm({ ...form, bill_start_date: e.target.value })}
                />

                <label>Bill End Date</label>
                <input
                    type="date"
                    value={form.bill_end_date}
                    onChange={(e) => setForm({ ...form, bill_end_date: e.target.value })}
                />

                <label>Bill Duration (Months)</label>
                <input
                    type="number"
                    value={form.bill_duration}
                    readOnly
                />

                <label>Paid Amount</label>
                <input
                    type="number"
                    placeholder="Paid Amount"
                    value={form.paid_amount}
                    onChange={(e) => handlePaidAmount(e.target.value)}
                />

                <div className="summary-box">
                    <p><b>Rate Amount (per month):</b> ₹{totalRateAmount.toFixed(2)}</p>
                    <p><b>Duration:</b> {form.bill_duration || 1} month(s)</p>
                    <p><b>Rate Amount (total):</b> ₹{(totalRateAmount * (form.bill_duration || 1)).toFixed(2)}</p>
                    <p><b>Previous Balance:</b> ₹{lastMonthBalance.toFixed(2)}</p>
                    <p><b>Total Amount:</b> ₹{finalTotal.toFixed(2)}</p>
                    {form.paid_amount > 0 && (
                        <>
                            {(() => {
                                const remaining = finalTotal - (Number(form.paid_amount) || 0);
                                return remaining < 0 ? (
                                    <p><b>Remaining (Advance Available):</b> <span style={{ color: 'green' }}>₹{Math.abs(remaining).toFixed(2)}</span></p>
                                ) : (
                                    <p><b>Remaining Balance (will be next month's prev balance):</b> ₹{remaining.toFixed(2)}</p>
                                );
                            })()}
                        </>
                    )}
                </div>

                <button onClick={handleSubmit}>{isEditing ? "Update" : "Submit"}</button>
                {isEditing && (
                    <button className="cancel-btn" onClick={() => { setIsEditing(false); resetForm(); }}>
                        Cancel
                    </button>
                )}
            </div>

            <hr />

            <h3>Maintenance Records</h3>

            <table>
                <thead>
                    <tr>
                        <th>Owner Name</th>
                        <th>Flat No</th>
                        <th>BHK</th>
                        <th>Monthly Rate (₹)</th>
                        <th>Start Date</th>
                        <th>End Date</th>
                        <th>Duration (Months)</th>
                        <th>Total Amount (₹)</th>
                        <th>Paid (₹)</th>
                        <th>Previous Balance (₹)</th>
                        <th>Remaining (₹)</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>

                <tbody>
                    {details.map((row, index) => {
                        // Get owner details
                        const owner = owners.find(o => o.owner_id === row.owner_id);
                        const ownerName = owner?.owner_name || row.owner_id;
                        const flatNo = owner?.flat_no || '-';
                        const bhk = owner?.flat_type_name || '-';

                        // Calculate previous balance: Find the most recent previous record for same owner
                        let prevBalanceDisplay = 0;

                        // Convert to numbers for comparison (handle string/number conversion)
                        const currentOwnerId = Number(row.owner_id) || parseInt(String(row.owner_id), 10);
                        const currentMaintainId = Number(row.maintain_id) || parseInt(String(row.maintain_id), 10);

                        // Find the previous record: same owner, lower maintain_id, not deleted
                        // Sort all matching records by maintain_id descending to get the most recent one
                        const prevRecords = details
                            .filter(d => {
                                if (!d || !d.owner_id || !d.maintain_id) return false;
                                const dOwnerId = Number(d.owner_id) || parseInt(String(d.owner_id), 10);
                                const dMaintainId = Number(d.maintain_id) || parseInt(String(d.maintain_id), 10);
                                const isDeleted = d.is_deleted === 1 || d.is_deleted === true || d.is_deleted === '1';
                                return dOwnerId === currentOwnerId &&
                                    dMaintainId < currentMaintainId &&
                                    !isDeleted;
                            })
                            .sort((a, b) => {
                                const aId = Number(a.maintain_id) || parseInt(String(a.maintain_id), 10);
                                const bId = Number(b.maintain_id) || parseInt(String(b.maintain_id), 10);
                                return bId - aId; // Descending to get most recent
                            });

                        if (prevRecords.length > 0) {
                            // Get the most recent previous record (highest maintain_id that's still less than current)
                            const prevRecord = prevRecords[0];
                            const prevTotal = Number(prevRecord.total_amount) || 0;
                            const prevPaid = Number(prevRecord.paid_amount) || 0;
                            prevBalanceDisplay = prevTotal - prevPaid;
                        } else {
                            // No previous record found - this is the first record for this owner
                            prevBalanceDisplay = 0;
                        }

                        // Format dates for display (DD-MM-YYYY)
                        const formatDate = (dateString) => {
                            if (!dateString) return '-';
                            try {
                                const date = new Date(dateString);
                                const day = String(date.getDate()).padStart(2, '0');
                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                const year = date.getFullYear();
                                return `${day}-${month}-${year}`;
                            } catch (e) {
                                return '-';
                            }
                        };

                        // Calculate values
                        const total = Number(row.total_amount || 0);
                        const paid = Number(row.paid_amount || 0);
                        const duration = Number(row.bill_duration || 1);
                        const monthlyRate = Number(row.total_rate_amount || 0);
                        const remaining = total - paid;

                        // Calculate status
                        let displayStatus = row.status || "Pending";
                        if (remaining < 0) {
                            displayStatus = "Advance Available";
                        } else if (remaining === 0 && total > 0) {
                            displayStatus = "Paid";
                        } else if (paid > 0) {
                            displayStatus = "Pending";
                        } else {
                            displayStatus = "Pending";
                        }

                        return (
                            <tr key={row.maintain_id}>
                                <td>{ownerName}</td>
                                <td>{flatNo}</td>
                                <td>{bhk}</td>
                                <td>₹{monthlyRate.toFixed(2)}</td>
                                <td>{formatDate(row.bill_start_date)}</td>
                                <td>{formatDate(row.bill_end_date)}</td>
                                <td>{duration}</td>
                                <td>₹{total.toFixed(2)}</td>
                                <td>₹{paid.toFixed(2)}</td>
                                <td>₹{prevBalanceDisplay.toFixed(2)}</td>
                                <td>
                                    {remaining < 0 ? (
                                        <span style={{ color: 'green' }}>₹{Math.abs(remaining).toFixed(2)} (Advance)</span>
                                    ) : (
                                        `₹${remaining.toFixed(2)}`
                                    )}
                                </td>
                                <td>{displayStatus}</td>
                                <td>
                                    <button className="edit-btn" onClick={() => handleEdit(row)}>Edit</button>
                                    {!row.is_deleted ? (
                                        <button className="delete-btn" onClick={() => handleDelete(row.maintain_id)}>Delete</button>
                                    ) : (
                                        <button className="restore-btn" onClick={() => handleRestore(row.maintain_id)}>Restore</button>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default MaintenanceDetail;

