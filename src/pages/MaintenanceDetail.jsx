import React, { useEffect, useState, useCallback } from "react";
import {
    getMaintenanceDetails,
    addMaintenanceDetail,
    updateMaintenanceDetail,
    deleteMaintenanceDetail,
    getOwners,
    getMaintenanceRates,
    sendReceiptByEmail,
    sendReceiptByWhatsApp,
    sendMonthlyReminders,
} from "../services/api";
import {
    getCurrentUserWingId,
    filterOwnersByWing,
    filterRatesByWing,
    filterMaintenanceDetailsByWing,
} from "../utils/wingFilter";
import {
    isOwnerRole,
    filterMaintenanceByCurrentOwner,
    filterOwnersByCurrentOwner,
    canEdit,
    canDelete,
} from "../utils/ownerFilter";

import "../css/MaintenanceDetail.css";

const MaintenanceDetail = () => {
    const [details, setDetails] = useState([]);
    const [owners, setOwners] = useState([]);
    const [rates, setRates] = useState([]);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [searchText, setSearchText] = useState("");
    const [expandedOwners, setExpandedOwners] = useState({}); // Track which owners are expanded

    // Get current user's wing_id
    const currentUserWingId = getCurrentUserWingId();

    const [lastMonthBalance, setLastMonthBalance] = useState(0); // Fixed
    //const [remainingBalance, setRemainingBalance] = useState(0); // Will change

    const [form, setForm] = useState({
        owner_id: "",
        rate_id: "",
        bill_start_date: "",
        bill_end_date: "",
        bill_duration: 0,
        paid_amount: 0,
        payment_mode: "",
        status: "Pending",
        prev_balance_amount: 0,
        total_amount: 0,
    });

    const [totalRateAmount, setTotalRateAmount] = useState(0);
    //const [prevBalance, setPrevBalance] = useState(0);
    const [finalTotal, setFinalTotal] = useState(0);

    // WhatsApp modal state
    const [whatsappModal, setWhatsappModal] = useState({
        show: false,
        phoneNumber: '',
        message: '',
        whatsappLink: '',
        ownerName: ''
    });

    // Reminders modal state
    const [remindersModal, setRemindersModal] = useState({
        show: false,
        reminderLinks: []
    });

    // Fetch data function - wrapped in useCallback to avoid recreating on every render
    const fetchData = useCallback(async () => {
        const ownersData = await getOwners();
        const rateData = await getMaintenanceRates();
        const detailsData = await getMaintenanceDetails();

        // Get raw data
        const rawOwners = Array.isArray(ownersData) ? ownersData : ownersData.data || [];
        const rawRates = Array.isArray(rateData) ? rateData : rateData.data || [];
        const rawDetails = Array.isArray(detailsData) ? detailsData : detailsData.data || [];

        // Filter by current user's wing if wing_id is available
        let filteredOwners = rawOwners;
        let filteredRates = rawRates;
        let filteredDetails = rawDetails;
        
        if (currentUserWingId !== null) {
            // Filter owners by wing
            filteredOwners = filterOwnersByWing(rawOwners, currentUserWingId);
            // Filter rates by wing
            filteredRates = filterRatesByWing(rawRates, currentUserWingId);
            // Filter details by owner's wing (use rawOwners to check all owners' wings)
            filteredDetails = filterMaintenanceDetailsByWing(rawDetails, rawOwners, currentUserWingId);
        }
        
        // Filter by owner_id if user is owner role
        if (isOwnerRole()) {
            filteredOwners = filterOwnersByCurrentOwner(filteredOwners);
            filteredDetails = filterMaintenanceByCurrentOwner(filteredDetails);
        }
        
        setOwners(filteredOwners);
        setRates(filteredRates);
        setDetails(filteredDetails);
    }, [currentUserWingId]);

    // Load data on page load
    useEffect(() => {
        fetchData();
    }, [fetchData]);

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
                // Filter rates by both wing_id AND flat_type_id
                const ownerWingId = selectedOwner.wing_id;
                const ownerFlatTypeId = selectedOwner.flat_type_id;

                const bhkRates = rates
                    .filter(r => {
                        const rateWingId = Number(r.wing_id) || parseInt(String(r.wing_id), 10);
                        const rateFlatTypeId = Number(r.flat_type_id) || parseInt(String(r.flat_type_id), 10);
                        const ownerWing = Number(ownerWingId) || parseInt(String(ownerWingId), 10);
                        const ownerFlatType = Number(ownerFlatTypeId) || parseInt(String(ownerFlatTypeId), 10);
                        return rateWingId === ownerWing && rateFlatTypeId === ownerFlatType;
                    })
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
        // Filter by both wing_id and flat_type_id
        const ownerWingId = Number(selectedOwner.wing_id) || parseInt(String(selectedOwner.wing_id), 10);
        const ownerFlatTypeId = Number(selectedOwner.flat_type_id) || parseInt(String(selectedOwner.flat_type_id), 10);

        const firstRateId = rates.find(
            r => {
                const rateWingId = Number(r.wing_id) || parseInt(String(r.wing_id), 10);
                const rateFlatTypeId = Number(r.flat_type_id) || parseInt(String(r.flat_type_id), 10);
                return rateWingId === ownerWingId && rateFlatTypeId === ownerFlatTypeId;
            }
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


    // Check for duplicate date ranges
    const checkDuplicateDates = (ownerId, startDate, endDate, excludeId = null) => {
        if (!startDate || !endDate) return false;

        const start = new Date(startDate);
        const end = new Date(endDate);
        const startYear = start.getFullYear();
        const startMonth = start.getMonth();
        const endYear = end.getFullYear();
        const endMonth = end.getMonth();

        // Check if any existing record overlaps with the date range for the same owner
        const duplicate = details.find(d => {
            if (!d.bill_start_date || !d.bill_end_date) return false;
            if (d.owner_id !== parseInt(ownerId)) return false;
            if (d.is_deleted) return false;
            if (excludeId && d.maintain_id === excludeId) return false; // Exclude current record when editing

            const dStart = new Date(d.bill_start_date);
            const dEnd = new Date(d.bill_end_date);
            const dStartYear = dStart.getFullYear();
            const dStartMonth = dStart.getMonth();
            const dEndYear = dEnd.getFullYear();
            const dEndMonth = dEnd.getMonth();

            // Check if months overlap
            // Create date ranges and check for overlap
            const range1Start = startYear * 12 + startMonth;
            const range1End = endYear * 12 + endMonth;
            const range2Start = dStartYear * 12 + dStartMonth;
            const range2End = dEndYear * 12 + dEndMonth;

            // Check if ranges overlap
            return !(range1End < range2Start || range1Start > range2End);
        });

        return !!duplicate;
    };

    const handleSubmit = async () => {
        // Validate required fields
        if (!form.owner_id) {
            alert("Please select an owner");
            return;
        }
        if (!form.bill_start_date || !form.bill_end_date) {
            alert("Please select start and end dates");
            return;
        }

        // Check for duplicate date ranges (only for new entries, or when editing different dates)
        if (!isEditing || (isEditing && (form.bill_start_date || form.bill_end_date))) {
            const isDuplicate = checkDuplicateDates(form.owner_id, form.bill_start_date, form.bill_end_date, isEditing ? editId : null);
            if (isDuplicate) {
                alert("Maintenance for this date range already exists for this owner. Please select a different date range.");
                return;
            }
        }

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
            let savedMaintenance;
            if (isEditing) {
                savedMaintenance = await updateMaintenanceDetail(editId, payload);
                alert("Maintenance Updated Successfully");
            } else {
                savedMaintenance = await addMaintenanceDetail(payload);
                alert("Maintenance Added Successfully");
            }

            // If payment is complete (status is "Paid") or advance is available, offer to send receipt
            if (status === "Paid" || status === "Advance Available") {
                const maintainId = isEditing ? editId : (savedMaintenance?.data?.insertId || savedMaintenance?.data?.maintain_id);
                if (maintainId) {
                    const messageText = status === "Paid"
                        ? "Payment completed! Would you like to send the receipt via Email or WhatsApp?\n\nClick OK to choose, or Cancel to skip."
                        : "Advance payment received! Would you like to send the receipt via Email or WhatsApp?\n\nClick OK to choose, or Cancel to skip.";

                    const sendReceipt = window.confirm(messageText);

                    if (sendReceipt) {
                        const receiptMethod = window.prompt(
                            "How would you like to send the receipt?\n\n" +
                            "Enter 'email' for Email\n" +
                            "Enter 'whatsapp' for WhatsApp\n" +
                            "Or click Cancel to skip"
                        );

                        if (receiptMethod && receiptMethod.toLowerCase() === 'email') {
                            try {
                                await sendReceiptByEmail(maintainId);
                                alert("Receipt sent successfully via Email!");
                            } catch (error) {
                                console.error("Error sending receipt via email:", error);
                                const errorMessage = error.response?.data?.error || error.response?.data?.details || error.message || "Failed to send receipt via email. Please try again later.";
                                const errorDetails = error.response?.data?.details ? `\n\nDetails: ${error.response.data.details}` : '';
                                alert(`Failed to send receipt via Email.\n\n${errorMessage}${errorDetails}`);
                            }
                        } else if (receiptMethod && receiptMethod.toLowerCase() === 'whatsapp') {
                            try {
                                const response = await sendReceiptByWhatsApp(maintainId);
                                const data = response.data || response;

                                if (data.whatsappLink) {
                                    // Show modal with message and options
                                    const selectedOwner = owners.find(o => o.owner_id === parseInt(form.owner_id));
                                    setWhatsappModal({
                                        show: true,
                                        phoneNumber: data.phoneNumber,
                                        message: data.receiptMessage,
                                        whatsappLink: data.whatsappLink,
                                        ownerName: selectedOwner?.owner_name || 'Owner'
                                    });
                                } else {
                                    alert("Receipt link generated successfully!");
                                }
                            } catch (error) {
                                console.error("Error sending receipt via WhatsApp:", error);
                                const errorMessage = error.response?.data?.error || error.response?.data?.details || error.message || "Failed to generate WhatsApp link. Please try again later.";
                                alert(`Failed to generate WhatsApp link.\n\n${errorMessage}`);
                            }
                        }
                    }
                }
            }

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
            payment_mode: "",
            status: "Pending",
            prev_balance_amount: 0,
            total_amount: 0,
        });
        setTotalRateAmount(0);
        setLastMonthBalance(0);
        setFinalTotal(0);
        setShowForm(false);
        setIsEditing(false);
        setEditId(null);
    };

    const handleEdit = (row) => {
        setIsEditing(true);
        setEditId(row.maintain_id);
        setShowForm(true);

        // Format dates for HTML date input (YYYY-MM-DD format)
        const formatDateForInput = (dateString) => {
            if (!dateString) return "";
            try {
                // If date is already in YYYY-MM-DD format, return as is
                if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
                    return dateString;
                }
                // Otherwise, parse and format
                const date = new Date(dateString);
                if (isNaN(date.getTime())) return "";
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            } catch (e) {
                console.error("Error formatting date:", e, dateString);
                return "";
            }
        };

        setForm({
            owner_id: row.owner_id,
            rate_id: row.rate_id,
            bill_start_date: formatDateForInput(row.bill_start_date),
            bill_end_date: formatDateForInput(row.bill_end_date),
            bill_duration: row.bill_duration,
            paid_amount: row.paid_amount,
            payment_mode: row.payment_mode || "",
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

    const handleCancel = () => {
        resetForm();
    };

    // Filter details based on search
    const filteredDetails = details.filter((row) => {
        if (!searchText) return true;
        const owner = owners.find(o => o.owner_id === row.owner_id);
        const ownerName = owner?.owner_name || '';
        const flatNo = owner?.flat_no || '';
        const searchLower = searchText.toLowerCase();
        return (
            ownerName.toLowerCase().includes(searchLower) ||
            flatNo.toLowerCase().includes(searchLower) ||
            String(row.maintain_id).includes(searchLower)
        );
    });

    // ===== Group Maintenance Details by Owner =====
    const groupDetailsByOwner = () => {
        const grouped = {};

        filteredDetails.forEach(detail => {
            const ownerId = detail.owner_id;
            const owner = owners.find(o => o.owner_id === ownerId);
            const ownerName = owner?.owner_name || `Owner ${ownerId}`;
            const flatNo = owner?.flat_no || 'N/A';
            const bhk = owner?.flat_type_name || 'N/A';

            if (!grouped[ownerId]) {
                grouped[ownerId] = {
                    ownerId: ownerId,
                    ownerName: ownerName,
                    flatNo: flatNo,
                    bhk: bhk,
                    details: [],
                    totalPaid: 0,
                    totalAmount: 0,
                    totalPending: 0,
                    totalAdvance: 0
                };
            }

            grouped[ownerId].details.push(detail);

            const total = Number(detail.total_amount || 0);
            const paid = Number(detail.paid_amount || 0);
            const remaining = total - paid;

            grouped[ownerId].totalPaid += paid;
            grouped[ownerId].totalAmount += total;

            if (remaining > 0) {
                grouped[ownerId].totalPending += remaining;
            } else if (remaining < 0) {
                grouped[ownerId].totalAdvance += Math.abs(remaining);
            }
        });

        // Sort details within each group by maintain_id (most recent first)
        Object.values(grouped).forEach(group => {
            group.details.sort((a, b) => {
                const aId = Number(a.maintain_id) || parseInt(String(a.maintain_id), 10);
                const bId = Number(b.maintain_id) || parseInt(String(b.maintain_id), 10);
                return bId - aId; // Descending - most recent first
            });
        });

        // Calculate current pending: Only the remaining amount from the most recent record
        Object.values(grouped).forEach(group => {
            if (group.details.length > 0) {
                // Get the most recent record (first in sorted array)
                const mostRecent = group.details[0];
                const total = Number(mostRecent.total_amount || 0);
                const paid = Number(mostRecent.paid_amount || 0);
                const currentRemaining = total - paid;

                // Reset totals and recalculate based on current remaining only
                group.totalPending = currentRemaining > 0 ? currentRemaining : 0;
                group.totalAdvance = currentRemaining < 0 ? Math.abs(currentRemaining) : 0;
            }
        });

        // Convert to array and sort by owner name
        return Object.values(grouped).sort((a, b) => {
            // Sort by flat number if available, otherwise by owner name
            if (a.flatNo !== 'N/A' && b.flatNo !== 'N/A') {
                return a.flatNo.localeCompare(b.flatNo, undefined, { numeric: true, sensitivity: 'base' });
            }
            return a.ownerName.localeCompare(b.ownerName);
        });
    };

    const groupedDetails = groupDetailsByOwner();

    // ===== Toggle Owner Expansion =====
    const toggleOwner = (ownerId) => {
        setExpandedOwners(prev => ({
            ...prev,
            [ownerId]: !prev[ownerId]
        }));
    };

    // Calculate summary statistics
    const calculateSummary = () => {
        let totalCollected = 0;
        let totalPending = 0;
        let totalAdvance = 0;

        filteredDetails.forEach((row) => {
            const total = Number(row.total_amount || 0);
            const paid = Number(row.paid_amount || 0);
            const remaining = total - paid;

            // Total collected (paid amount)
            totalCollected += paid;

            // Total pending (positive remaining)
            if (remaining > 0) {
                totalPending += remaining;
            }

            // Total advance (negative remaining)
            if (remaining < 0) {
                totalAdvance += Math.abs(remaining);
            }
        });

        return {
            totalCollected: totalCollected.toFixed(2),
            totalPending: totalPending.toFixed(2),
            totalAdvance: totalAdvance.toFixed(2)
        };
    };

    const summary = calculateSummary();

    return (
        <div className="maintenance-detail-container">
            <h2>Maintenance Records</h2>

            {/* Controls (New Entry + Search) - Only show when form is not visible */}
            {!showForm && (
                <div className="maintenance-controls">
                    {canEdit() && (
                        <button className="new-entry-btn" onClick={() => {
                            setIsEditing(false);
                            setEditId(null);
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
                            setShowForm(true);
                        }}>
                            New Entry
                        </button>
                    )}
                    <div className="maintenance-controls-right">
                        <button
                            className="send-reminders-btn"
                            onClick={async () => {
                                if (window.confirm("Generate WhatsApp links for payment reminders to all owners with pending payments?")) {
                                    try {
                                        const response = await sendMonthlyReminders();
                                        const data = response.data || response;

                                        if (data.reminderLinks && data.reminderLinks.length > 0) {
                                            // Show modal with all reminder links
                                            setRemindersModal({
                                                show: true,
                                                reminderLinks: data.reminderLinks
                                            });
                                        } else {
                                            let message = `No reminders to send!\n\n`;
                                            message += `✅ Processed: ${data.remindersSent || 0}\n`;
                                            message += `❌ Failed: ${data.failed || 0}\n`;
                                            message += `📊 Total: ${data.totalOwners || 0}`;

                                            if (data.failedOwners && data.failedOwners.length > 0) {
                                                message += `\n\nFailed owners:\n`;
                                                data.failedOwners.slice(0, 5).forEach(owner => {
                                                    message += `- ${owner.owner_name} (${owner.flat_no}): ${owner.reason}\n`;
                                                });
                                            }

                                            alert(message);
                                        }
                                    } catch (error) {
                                        console.error("Error sending reminders:", error);
                                        const errorMessage = error.response?.data?.error || error.response?.data?.details || error.message || "Failed to generate reminder links. Please try again later.";
                                        alert(`Failed to generate reminder links.\n\n${errorMessage}`);
                                    }
                                }
                            }}
                        >
                            📱 Send Reminders
                        </button>
                        <div className="search-bar">
                            <input
                                type="text"
                                placeholder="Search by owner name, flat no, or ID..."
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            )}

            {showForm && (
                <div className="maintenance-form-wrapper">
                    <div className="form-header">
                        <h3>{isEditing ? "Edit Maintenance" : "Add New Maintenance"}</h3>
                    </div>
                    <div className="form-section">
                        <label>Owner</label>
                        <select value={form.owner_id} onChange={(e) => handleOwnerSelect(e.target.value)}>
                            <option value="">Select Owner</option>
                            {owners.map((o) => (
                                <option key={o.owner_id} value={o.owner_id}>
                                    {o.owner_name} - {o.flat_no || 'N/A'} ({o.wing_name || 'N/A'} - {o.flat_type_name})
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

                        <label>Payment Mode</label>
                        <input
                            type="text"
                            placeholder="Cash / UPI / Bank Transfer"
                            value={form.payment_mode}
                            onChange={(e) => setForm({ ...form, payment_mode: e.target.value })}
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
                                            <p><b>Remaining (Advance Available):</b> <span className="advance-amount">₹{Math.abs(remaining).toFixed(2)}</span></p>
                                        ) : (
                                            <p><b>Remaining Balance (will be next month's prev balance):</b> ₹{remaining.toFixed(2)}</p>
                                        );
                                    })()}
                                </>
                            )}
                        </div>

                        <div className="form-actions">
                            <button className="submit-btn" onClick={handleSubmit}>
                                {isEditing ? "Update Maintenance" : "Add Maintenance"}
                            </button>
                            <button className="cancel-btn" onClick={handleCancel}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {!showForm && (
                <>
                    {groupedDetails.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                            {searchText ? 'No records found matching your search.' : 'No maintenance records found.'}
                        </div>
                    ) : (
                        <div className="maintenance-owner-groups">
                            {groupedDetails.map((group) => {
                                const isExpanded = expandedOwners[group.ownerId] === true; // Default to false (collapsed)
                                const recordCount = group.details.length;

                                return (
                                    <div key={group.ownerId} className="owner-group">
                                        {/* Owner Header - Clickable */}
                                        <div
                                            className="owner-header"
                                            onClick={() => toggleOwner(group.ownerId)}
                                            style={{
                                                cursor: 'pointer',
                                                padding: '15px 20px',
                                                backgroundColor: '#f8f9fa',
                                                border: '1px solid #dee2e6',
                                                borderRadius: '8px',
                                                marginBottom: '10px',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                transition: 'background-color 0.2s',
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e9ecef'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1 }}>
                                                <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#495057' }}>
                                                    {isExpanded ? '▼' : '▶'} {group.ownerName}
                                                </span>
                                                <span style={{
                                                    fontSize: '14px',
                                                    color: '#6c757d'
                                                }}>
                                                    Flat: {group.flatNo} | BHK: {group.bhk}
                                                </span>
                                                <span style={{
                                                    fontSize: '14px',
                                                    color: '#6c757d',
                                                    backgroundColor: '#e9ecef',
                                                    padding: '4px 10px',
                                                    borderRadius: '12px'
                                                }}>
                                                    {recordCount} record{recordCount !== 1 ? 's' : ''}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontSize: '12px', color: '#6c757d' }}>Total Paid</div>
                                                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#28a745' }}>
                                                        ₹{group.totalPaid.toFixed(2)}
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontSize: '12px', color: '#6c757d' }}>Pending</div>
                                                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#ffc107' }}>
                                                        ₹{group.totalPending.toFixed(2)}
                                                    </div>
                                                </div>
                                                {group.totalAdvance > 0 && (
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ fontSize: '12px', color: '#6c757d' }}>Advance</div>
                                                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#17a2b8' }}>
                                                            ₹{group.totalAdvance.toFixed(2)}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Maintenance Details Table - Collapsible */}
                                        {isExpanded && (
                                            <div className="owner-details-table" style={{ marginBottom: '20px' }}>
                                                <table className="maintenance-table" style={{ width: '100%' }}>
                                                    <thead>
                                                        <tr>
                                                            <th>Start Date</th>
                                                            <th>End Date</th>
                                                            <th>Duration (Months)</th>
                                                            <th>Total Amount (₹)</th>
                                                            <th>Paid (₹)</th>
                                                            <th>Payment Mode</th>
                                                            <th>Previous Balance (₹)</th>
                                                            <th>Remaining (₹)</th>
                                                            <th>Status</th>
                                                            <th>Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {group.details.length === 0 ? (
                                                            <tr>
                                                                <td colSpan="10" style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                                                                    No maintenance records found for this owner.
                                                                </td>
                                                            </tr>
                                                        ) : (
                                                            group.details.map((row) => {
                                                                // Calculate previous balance: Find the most recent previous record for same owner
                                                                let prevBalanceDisplay = 0;

                                                                // Convert to numbers for comparison (handle string/number conversion)
                                                                const currentOwnerId = Number(row.owner_id) || parseInt(String(row.owner_id), 10);
                                                                const currentMaintainId = Number(row.maintain_id) || parseInt(String(row.maintain_id), 10);

                                                                // Find the previous record: same owner, lower maintain_id, not deleted
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
                                                                    const prevRecord = prevRecords[0];
                                                                    const prevTotal = Number(prevRecord.total_amount) || 0;
                                                                    const prevPaid = Number(prevRecord.paid_amount) || 0;
                                                                    prevBalanceDisplay = prevTotal - prevPaid;
                                                                } else {
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
                                                                        <td>{formatDate(row.bill_start_date)}</td>
                                                                        <td>{formatDate(row.bill_end_date)}</td>
                                                                        <td>{duration}</td>
                                                                        <td>₹{total.toFixed(2)}</td>
                                                                        <td>₹{paid.toFixed(2)}</td>
                                                                        <td>{row.payment_mode || "-"}</td>
                                                                        <td>₹{prevBalanceDisplay.toFixed(2)}</td>
                                                                        <td>
                                                                            {remaining < 0 ? (
                                                                                <span className="advance-amount">₹{Math.abs(remaining).toFixed(2)} (Advance)</span>
                                                                            ) : (
                                                                                `₹${remaining.toFixed(2)}`
                                                                            )}
                                                                        </td>
                                                                        <td>{displayStatus}</td>
                                                                        <td>
                                                                            {canEdit() && (
                                                                                <button className="edit-btn" onClick={() => handleEdit(row)}>Edit</button>
                                                                            )}
                                                                            {canDelete() && (
                                                                                <button className="delete-btn" onClick={() => handleDelete(row.maintain_id)}>Delete</button>
                                                                            )}
                                                                            {isOwnerRole() && (
                                                                                <span style={{ color: '#999', fontSize: '12px' }}>View Only</span>
                                                                            )}
                                                                            {(displayStatus === "Paid" || displayStatus === "Advance Available") && !row.is_deleted && (
                                                                                <div style={{ display: 'inline-flex', gap: '5px', marginLeft: '5px' }}>
                                                                                    <button
                                                                                        className="receipt-btn email"
                                                                                        onClick={async () => {
                                                                                            if (window.confirm("Send receipt via Email?")) {
                                                                                                try {
                                                                                                    await sendReceiptByEmail(row.maintain_id);
                                                                                                    alert("Receipt sent successfully via Email!");
                                                                                                } catch (error) {
                                                                                                    console.error("Error sending receipt:", error);
                                                                                                    const errorMessage = error.response?.data?.error || error.response?.data?.details || error.message || "Failed to send receipt. Please try again.";
                                                                                                    const errorDetails = error.response?.data?.details ? `\n\nDetails: ${error.response.data.details}` : '';
                                                                                                    alert(`Failed to send receipt via Email.\n\n${errorMessage}${errorDetails}`);
                                                                                                }
                                                                                            }
                                                                                        }}
                                                                                    >
                                                                                        📧 Email
                                                                                    </button>
                                                                                    <button
                                                                                        className="receipt-btn whatsapp"
                                                                                        onClick={async () => {
                                                                                            try {
                                                                                                const response = await sendReceiptByWhatsApp(row.maintain_id);
                                                                                                const data = response.data || response;

                                                                                                if (data.whatsappLink) {
                                                                                                    const owner = owners.find(o => o.owner_id === row.owner_id);
                                                                                                    setWhatsappModal({
                                                                                                        show: true,
                                                                                                        phoneNumber: data.phoneNumber,
                                                                                                        message: data.receiptMessage,
                                                                                                        whatsappLink: data.whatsappLink,
                                                                                                        ownerName: owner?.owner_name || 'Owner'
                                                                                                    });
                                                                                                } else {
                                                                                                    alert("Receipt link generated successfully!");
                                                                                                }
                                                                                            } catch (error) {
                                                                                                console.error("Error sending receipt:", error);
                                                                                                const errorMessage = error.response?.data?.error || error.response?.data?.details || error.message || "Failed to generate WhatsApp link. Please try again.";
                                                                                                alert(`Failed to generate WhatsApp link.\n\n${errorMessage}`);
                                                                                            }
                                                                                        }}
                                                                                    >
                                                                                        💬 WhatsApp
                                                                                    </button>
                                                                                </div>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Summary Statistics - Only show when form is not visible */}
                    {!showForm && (
                        <div className="maintenance-summary">
                            <div className="summary-card collected">
                                <div className="summary-icon">💰</div>
                                <div className="summary-content">
                                    <h3>Total Collected</h3>
                                    <p className="summary-amount">₹{summary.totalCollected}</p>
                                </div>
                            </div>
                            <div className="summary-card pending">
                                <div className="summary-icon">⏳</div>
                                <div className="summary-content">
                                    <h3>Total Pending</h3>
                                    <p className="summary-amount">₹{summary.totalPending}</p>
                                </div>
                            </div>
                            <div className="summary-card advance">
                                <div className="summary-icon">✨</div>
                                <div className="summary-content">
                                    <h3>Total Advance</h3>
                                    <p className="summary-amount">₹{summary.totalAdvance}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* WhatsApp Modal */}
            {whatsappModal.show && (
                <div
                    className="whatsapp-modal-overlay"
                    onClick={() => setWhatsappModal({ ...whatsappModal, show: false })}
                >
                    <div
                        className="whatsapp-modal-content"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="modal-header whatsapp">
                            <h3>💬 Send WhatsApp Message</h3>
                            <button
                                className="modal-close-btn"
                                onClick={() => setWhatsappModal({ ...whatsappModal, show: false })}
                            >
                                ×
                            </button>
                        </div>

                        <div className="modal-section">
                            <strong>To:</strong> {whatsappModal.ownerName} ({whatsappModal.phoneNumber})
                        </div>

                        <div className="modal-section">
                            <strong>Message:</strong>
                            <textarea
                                readOnly
                                value={whatsappModal.message}
                                className="modal-textarea"
                            />
                        </div>

                        <div className="modal-button-group">
                            <button
                                className="modal-button whatsapp"
                                onClick={() => {
                                    window.open(whatsappModal.whatsappLink, '_blank');
                                }}
                            >
                                📱 Open WhatsApp
                            </button>
                            <button
                                className="modal-button email"
                                onClick={() => {
                                    navigator.clipboard.writeText(whatsappModal.message);
                                    alert('Message copied to clipboard!');
                                }}
                            >
                                📋 Copy Message
                            </button>
                            <button
                                className="modal-button phone"
                                onClick={() => {
                                    navigator.clipboard.writeText(whatsappModal.phoneNumber);
                                    alert('Phone number copied to clipboard!');
                                }}
                            >
                                📞 Copy Phone
                            </button>
                        </div>

                        <div className="modal-tip">
                            💡 Tip: If WhatsApp doesn't open, copy the message and send it manually
                        </div>
                    </div>
                </div>
            )}

            {/* Reminders Modal */}
            {remindersModal.show && (
                <div
                    className="reminders-modal-overlay"
                    onClick={() => setRemindersModal({ show: false, reminderLinks: [] })}
                >
                    <div
                        className="reminders-modal-content"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="modal-header reminders">
                            <h3>📱 Send Reminders via WhatsApp</h3>
                            <button
                                className="modal-close-btn"
                                onClick={() => setRemindersModal({ show: false, reminderLinks: [] })}
                            >
                                ×
                            </button>
                        </div>

                        <div className="reminders-info">
                            <strong>Total Reminders:</strong> {remindersModal.reminderLinks.length}
                            <br />
                            <small>Click "Open WhatsApp" for each owner to send the reminder</small>
                        </div>

                        <div className="reminders-list">
                            {remindersModal.reminderLinks.map((link, index) => (
                                <div key={index} className="reminder-item">
                                    <div className="reminder-item-header">
                                        <strong>{index + 1}. {link.owner_name}</strong> (Flat: {link.flat_no})
                                        <br />
                                        <small>Phone: {link.phoneNumber}</small>
                                    </div>
                                    <div className="reminder-item-actions">
                                        <button
                                            className="reminder-item-button whatsapp"
                                            onClick={() => {
                                                window.open(link.whatsappLink, '_blank');
                                            }}
                                        >
                                            📱 Open WhatsApp
                                        </button>
                                        <button
                                            className="reminder-item-button email"
                                            onClick={() => {
                                                navigator.clipboard.writeText(link.reminderMessage);
                                                alert(`Message for ${link.owner_name} copied to clipboard!`);
                                            }}
                                        >
                                            📋 Copy Message
                                        </button>
                                        <button
                                            className="reminder-item-button phone"
                                            onClick={() => {
                                                navigator.clipboard.writeText(link.phoneNumber);
                                                alert(`Phone number for ${link.owner_name} copied!`);
                                            }}
                                        >
                                            📞 Copy Phone
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="reminders-actions">
                            <button
                                className="modal-button whatsapp"
                                onClick={() => {
                                    // Open all links one by one with delay
                                    remindersModal.reminderLinks.forEach((link, index) => {
                                        setTimeout(() => {
                                            window.open(link.whatsappLink, '_blank');
                                        }, index * 2000); // 2 second delay
                                    });
                                    alert(`Opening ${remindersModal.reminderLinks.length} WhatsApp windows...\n\nThey will open one by one. Just click "Send" in each window.`);
                                }}
                            >
                                📱 Open All WhatsApp Links
                            </button>
                            <button
                                className="modal-button email"
                                onClick={() => {
                                    // Copy all messages
                                    const allMessages = remindersModal.reminderLinks.map((link, index) =>
                                        `${index + 1}. ${link.owner_name} (${link.flat_no}):\n${link.reminderMessage}\n\n`
                                    ).join('');
                                    navigator.clipboard.writeText(allMessages);
                                    alert('All reminder messages copied to clipboard!');
                                }}
                            >
                                📋 Copy All Messages
                            </button>
                        </div>

                        <div className="modal-tip">
                            💡 Tip: If WhatsApp doesn't open, copy the messages and send them manually
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MaintenanceDetail;

