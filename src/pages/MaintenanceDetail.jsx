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
    const [editId, setEditId] = useState(null);
    const [ownerRates, setOwnerRates] = useState([]);

    const [formData, setFormData] = useState({
        owner_id: "",
        rate_id: "",
        bill_start_date: "",
        bill_end_date: "",
        bill_duration: "",
        total_amount: "",
        paid_amount: "",
        prev_balance_amount: "",
        status: "Pending",
    });

    // ✅ Fetch all data
    const fetchData = async () => {
        const [detailRes, ownerRes, rateRes] = await Promise.all([
            getMaintenanceDetails(),
            getOwners(),
            getMaintenanceRates(),
        ]);
        setDetails(detailRes.data);
        setOwners(ownerRes.data);
        setRates(rateRes.data);
    };

    useEffect(() => {
        fetchData();
    }, []);

    // ✅ Calculate duration in months or days
    const calculateDuration = (start, end) => {
        if (!start || !end) return "";
        const startDate = new Date(start);
        const endDate = new Date(end);
        const diffTime = endDate - startDate;
        if (diffTime < 0) return "Invalid Dates";
        const diffMonths =
            (endDate.getFullYear() - startDate.getFullYear()) * 12 +
            (endDate.getMonth() - startDate.getMonth());
        return diffMonths <= 1 ? "1 Month" : `${diffMonths} Months`;
    };

    // ✅ Auto update duration when dates change
    useEffect(() => {
        const duration = calculateDuration(formData.bill_start_date, formData.bill_end_date);
        setFormData((prev) => ({ ...prev, bill_duration: duration }));
    }, [formData.bill_start_date, formData.bill_end_date]);

    // ✅ Handle Owner Change -> Show rates for that flat type
    const handleOwnerChange = (e) => {
        const ownerId = e.target.value;
        const selectedOwner = owners.find((o) => o.owner_id === parseInt(ownerId));
        setFormData({ ...formData, owner_id: ownerId, rate_id: "" });

        if (selectedOwner) {
            const ownerFlatType = selectedOwner.flat_type_id;
            const relatedRates = rates.filter((r) => r.flat_type_id === ownerFlatType);
            setOwnerRates(relatedRates);

            // Calculate total automatically (sum of related rates)
            const total = relatedRates.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
            setFormData((prev) => ({ ...prev, total_amount: total }));
        } else {
            setOwnerRates([]);
            setFormData((prev) => ({ ...prev, total_amount: "" }));
        }
    };

    // ✅ Handle Submit (Add or Update)
    /*  const handleSubmit = async (e) => {
         e.preventDefault();
         if (editId) await updateMaintenanceDetail(editId, formData);
         else await addMaintenanceDetail(formData);
         setEditId(null);
         setFormData({
             owner_id: "",
             rate_id: "",
             bill_start_date: "",
             bill_end_date: "",
             bill_duration: "",
             total_amount: "",
             paid_amount: "",
             prev_balance_amount: "",
             status: "Pending",
         });
         fetchData();
     }; */

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Ensure total_amount is a number
        const payload = {
            ...formData,
            total_amount: parseFloat(formData.total_amount) || 0,
            paid_amount: parseFloat(formData.paid_amount) || 0,
            prev_balance_amount: parseFloat(formData.prev_balance_amount) || 0,
            rate_id: null // keep null, since multiple rates contribute
        };

        try {
            if (editId) await updateMaintenanceDetail(editId, payload);
            else await addMaintenanceDetail(payload);

            setEditId(null);
            setFormData({
                owner_id: "",
                rate_id: "",
                bill_start_date: "",
                bill_end_date: "",
                bill_duration: "",
                total_amount: "",
                paid_amount: "",
                prev_balance_amount: "",
                status: "Pending",
            });
            fetchData();
        } catch (err) {
            console.error(err);
            alert("Error saving maintenance detail. Check console.");
        }
    };

    const handleEdit = (item) => {
        setFormData(item);
        setEditId(item.maintain_id);
    };

    const handleDelete = async (id) => {
        const reason = prompt("Enter delete reason:");
        if (reason) await deleteMaintenanceDetail(id, reason);
        fetchData();
    };

    const handleRestore = async (id) => {
        await restoreMaintenanceDetail(id);
        fetchData();
    };

    return (
        <div className="maintenance-container">
            <h2>Maintenance Details</h2>

            <form onSubmit={handleSubmit} className="maintenance-form labeled">
                {/* Owner */}
                <label>Owner Name:</label>
                <select
                    value={formData.owner_id}
                    onChange={handleOwnerChange}
                    required
                >
                    <option value="">Select Owner</option>
                    {owners.map((o) => (
                        <option key={o.owner_id} value={o.owner_id}>
                            {o.owner_name}
                        </option>
                    ))}
                </select>

                {/* Display Rates (frozen / read-only) */}
                {ownerRates.length > 0 && (
                    <div className="rate-box">
                        <label>Applicable Rates:</label>
                        <ul className="rate-list">
                            {ownerRates.map((r) => (
                                <li key={r.rate_id}>
                                    💰 {r.componant_name || `Rate #${r.rate_id}`} — ₹{r.amount}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Date Fields */}
                <label>Bill Start Date:</label>
                <input
                    type="date"
                    value={formData.bill_start_date}
                    onChange={(e) => setFormData({ ...formData, bill_start_date: e.target.value })}
                    required
                />

                <label>Bill End Date:</label>
                <input
                    type="date"
                    value={formData.bill_end_date}
                    onChange={(e) => setFormData({ ...formData, bill_end_date: e.target.value })}
                    required
                />

                <label>Duration:</label>
                <input
                    type="text"
                    value={formData.bill_duration}
                    readOnly
                    placeholder="Auto calculated"
                />

                <label>Total Amount (auto-calculated):</label>
                <input
                    type="number"
                    value={formData.total_amount}
                    readOnly
                    placeholder="Auto total"
                />

                <label>Paid Amount:</label>
                <input
                    type="number"
                    placeholder="Enter paid amount"
                    value={formData.paid_amount}
                    onChange={(e) => setFormData({ ...formData, paid_amount: e.target.value })}
                />

                <label>Previous Balance:</label>
                <input
                    type="number"
                    placeholder="Previous balance"
                    value={formData.prev_balance_amount}
                    onChange={(e) =>
                        setFormData({ ...formData, prev_balance_amount: e.target.value })
                    }
                />

                <label>Status:</label>
                <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                    <option value="Pending">Pending</option>
                    <option value="Paid">Paid</option>
                </select>

                <button type="submit">{editId ? "Update" : "Add"}</button>
            </form>

            {/* Table Display */}
            <table className="maintenance-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Owner</th>
                        <th>Total</th>
                        <th>Paid</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {details.map((d) => (
                        <tr key={d.maintain_id}>
                            <td>{d.maintain_id}</td>
                            <td>{owners.find((o) => o.owner_id === d.owner_id)?.owner_name || "-"}</td>
                            <td>₹{d.total_amount}</td>
                            <td>₹{d.paid_amount}</td>
                            <td>{d.status}</td>
                            <td>
                                <button onClick={() => handleEdit(d)}>✏️</button>
                                <button onClick={() => handleDelete(d.maintain_id)}>🗑️</button>
                                <button onClick={() => handleRestore(d.maintain_id)}>♻️</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default MaintenanceDetail;
