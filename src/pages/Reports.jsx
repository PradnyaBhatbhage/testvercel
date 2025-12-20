import React, { useState, useEffect, useRef } from "react";
import {
    getOwners,
    getMaintenanceDetails,
    getExpenses,
    getRentals,
    getMeetings,
    getWings,
    getFlats,
    getMaintenancePayments,
    getAllPayments,
    getAllActivityExpenses,
} from "../services/api";
import { getCurrentUserWingId, filterOwnersByWing, filterMaintenanceDetailsByWing, filterByWing } from "../utils/wingFilter";
import "../css/Reports.css";

const Reports = ({ reportType }) => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    // Map report type from sidebar to internal ID
    const getReportIdFromType = (type) => {
        const mapping = {
            "Owner Report": "owner",
            "Maintenance Report": "maintenance",
            "Expense Report": "expense",
            "Rental Report": "rental",
            "Meeting Report": "meeting",
            "Complete Report": "complete"
        };
        return mapping[type] || "owner";
    };

    const [activeReport, setActiveReport] = useState(() => {
        return reportType ? getReportIdFromType(reportType) : "owner";
    });
    const [loading, setLoading] = useState(false);
    const [wings, setWings] = useState([]);

    // Date filters
    const [dateFilter, setDateFilter] = useState({
        startDate: "",
        endDate: "",
        wing_id: "",
    });

    // Report data
    const [ownerReportData, setOwnerReportData] = useState([]);
    const [allOwnersForMaintenance, setAllOwnersForMaintenance] = useState([]); // Store owners for maintenance report
    const [maintenanceReportData, setMaintenanceReportData] = useState([]);
    const [expenseReportData, setExpenseReportData] = useState([]);
    const [rentalReportData, setRentalReportData] = useState([]);
    const [meetingReportData, setMeetingReportData] = useState([]);
    const [completeReportData, setCompleteReportData] = useState(null);
    const [isFormulaExpanded, setIsFormulaExpanded] = useState(false); // Track formula section expansion

    const reportRef = useRef(null);
    const currentUserWingId = getCurrentUserWingId();

    // Update activeReport when reportType prop changes and fetch data
    useEffect(() => {
        if (reportType) {
            const reportId = getReportIdFromType(reportType);
            setActiveReport(reportId);
            // Fetch data when reportType changes
            fetchWings();
            fetchAllReports();
        }
    }, [reportType]);

    useEffect(() => {
        fetchWings();
        fetchAllReports();
    }, []);

    useEffect(() => {
        fetchAllReports();
    }, [dateFilter]);

    const fetchWings = async () => {
        try {
            const res = await getWings();
            setWings(res.data || []);
        } catch (err) {
            console.error("Error fetching wings:", err);
        }
    };

    const fetchAllReports = async () => {
        setLoading(true);
        try {
            await Promise.all([
                fetchOwnerReport(),
                fetchMaintenanceReport(),
                fetchExpenseReport(),
                fetchRentalReport(),
                fetchMeetingReport(),
                fetchCompleteReport(),
            ]);
        } catch (err) {
            console.error("Error fetching reports:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchOwnerReport = async () => {
        try {
            const res = await getOwners();
            let owners = res.data || [];

            // Filter by wing if selected
            if (dateFilter.wing_id) {
                owners = owners.filter(o => o.wing_id === parseInt(dateFilter.wing_id));
            } else if (currentUserWingId !== null) {
                owners = filterOwnersByWing(owners, currentUserWingId);
            }

            setOwnerReportData(owners);
        } catch (err) {
            console.error("Error fetching owner report:", err);
        }
    };

    const fetchMaintenanceReport = async () => {
        try {
            const res = await getMaintenanceDetails();
            let maintenance = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);

            console.log("Maintenance data fetched:", maintenance.length, "records");

            // Fetch owners for wing filtering (if needed)
            const ownersRes = await getOwners();
            let allOwners = Array.isArray(ownersRes.data) ? ownersRes.data : (Array.isArray(ownersRes) ? ownersRes : []);

            // Store all owners for maintenance report to use in rendering
            setAllOwnersForMaintenance(allOwners);

            // Filter by wing if selected (use wing_id from maintenance data)
            if (dateFilter.wing_id) {
                const filteredCount = maintenance.length;
                maintenance = maintenance.filter(m => {
                    if (!m.wing_id) {
                        // If wing_id is not in maintenance data, check owner's wing
                        const owner = allOwners.find(o => o.owner_id === m.owner_id);
                        return owner && owner.wing_id && parseInt(owner.wing_id) === parseInt(dateFilter.wing_id);
                    }
                    return parseInt(m.wing_id) === parseInt(dateFilter.wing_id);
                });
                console.log(`Filtered by wing ${dateFilter.wing_id}: ${filteredCount} -> ${maintenance.length} records`);
            } else if (currentUserWingId !== null) {
                // Filter by current user's wing
                const filteredCount = maintenance.length;
                maintenance = maintenance.filter(m => {
                    if (!m.wing_id) {
                        // If wing_id is not in maintenance data, check owner's wing
                        const owner = allOwners.find(o => o.owner_id === m.owner_id);
                        return owner && owner.wing_id && parseInt(owner.wing_id) === parseInt(currentUserWingId);
                    }
                    return parseInt(m.wing_id) === parseInt(currentUserWingId);
                });
                console.log(`Filtered by user wing ${currentUserWingId}: ${filteredCount} -> ${maintenance.length} records`);
            }

            // Filter by date range
            if (dateFilter.startDate && dateFilter.endDate) {
                const dateFilterCount = maintenance.length;
                maintenance = maintenance.filter(m => {
                    const billDate = new Date(m.bill_start_date || m.created_at);
                    const startDate = new Date(dateFilter.startDate);
                    const endDate = new Date(dateFilter.endDate);
                    return billDate >= startDate && billDate <= endDate;
                });
                console.log(`Filtered by date range: ${dateFilterCount} -> ${maintenance.length} records`);
            }

            console.log("Setting maintenance report data:", maintenance.length, "records");
            setMaintenanceReportData(maintenance);
        } catch (err) {
            console.error("Error fetching maintenance report:", err);
            setMaintenanceReportData([]);
        }
    };

    const fetchExpenseReport = async () => {
        try {
            const res = await getExpenses();
            let expenses = res.data || [];

            // Filter by wing if selected
            if (dateFilter.wing_id) {
                expenses = expenses.filter(e => e.wing_id === parseInt(dateFilter.wing_id));
            } else if (currentUserWingId !== null) {
                expenses = filterByWing(expenses, currentUserWingId, 'wing_id');
            }

            // Filter by date range
            if (dateFilter.startDate && dateFilter.endDate) {
                expenses = expenses.filter(e => {
                    const expenseDate = new Date(e.date);
                    const startDate = new Date(dateFilter.startDate);
                    const endDate = new Date(dateFilter.endDate);
                    return expenseDate >= startDate && expenseDate <= endDate;
                });
            }

            setExpenseReportData(expenses);
        } catch (err) {
            console.error("Error fetching expense report:", err);
        }
    };

    const fetchRentalReport = async () => {
        try {
            const res = await getRentals();
            let rentals = res.data || [];

            // Filter by date range
            if (dateFilter.startDate && dateFilter.endDate) {
                rentals = rentals.filter(r => {
                    const rentalDate = new Date(r.start_date || r.created_at);
                    const startDate = new Date(dateFilter.startDate);
                    const endDate = new Date(dateFilter.endDate);
                    return rentalDate >= startDate && rentalDate <= endDate;
                });
            }

            setRentalReportData(rentals);
        } catch (err) {
            console.error("Error fetching rental report:", err);
        }
    };

    const fetchMeetingReport = async () => {
        try {
            const res = await getMeetings();
            let meetings = res.data || [];

            // Filter by date range
            if (dateFilter.startDate && dateFilter.endDate) {
                meetings = meetings.filter(m => {
                    const meetingDate = new Date(m.meeting_date || m.created_at);
                    const startDate = new Date(dateFilter.startDate);
                    const endDate = new Date(dateFilter.endDate);
                    return meetingDate >= startDate && meetingDate <= endDate;
                });
            }

            setMeetingReportData(meetings);
        } catch (err) {
            console.error("Error fetching meeting report:", err);
        }
    };

    const fetchCompleteReport = async () => {
        try {
            // Fetch all required data
            // NOTE: Maintenance payments are stored in maintenance_detail.paid_amount, not in a separate maintenance_payment table
            const [maintenanceDetailsRes, activityPaymentsRes, activityExpensesRes, expensesRes, ownersRes, flatsRes] = await Promise.all([
                getMaintenanceDetails(),
                getAllPayments(),
                getAllActivityExpenses(),
                getExpenses(),
                getOwners(),
                getFlats(),
            ]);

            // Handle different API response structures (axios wraps responses in .data)
            let allMaintenanceDetails = Array.isArray(maintenanceDetailsRes)
                ? maintenanceDetailsRes
                : (maintenanceDetailsRes?.data || []);
            let activityPayments = activityPaymentsRes?.data || [];
            let activityExpenses = activityExpensesRes?.data || [];
            let expenses = expensesRes?.data || [];
            let allOwners = ownersRes?.data || [];
            let allFlats = flatsRes?.data || [];

            // Ensure we have arrays
            if (!Array.isArray(allMaintenanceDetails)) allMaintenanceDetails = [];
            if (!Array.isArray(activityPayments)) activityPayments = [];
            if (!Array.isArray(activityExpenses)) activityExpenses = [];
            if (!Array.isArray(expenses)) expenses = [];
            if (!Array.isArray(allOwners)) allOwners = [];
            if (!Array.isArray(allFlats)) allFlats = [];

            console.log("Complete Report - Raw data counts:", {
                maintenanceDetails: allMaintenanceDetails.length,
                activityPayments: activityPayments.length,
                activityExpenses: activityExpenses.length,
                expenses: expenses.length,
                allOwners: allOwners.length,
                allFlats: allFlats.length
            });

            // Filter maintenance details by wing if explicitly selected in filter, or if user has wing restriction
            const shouldFilterByWing = dateFilter.wing_id || (currentUserWingId !== null);

            let filteredMaintenanceDetails = allMaintenanceDetails;

            if (shouldFilterByWing) {
                const wingId = dateFilter.wing_id || currentUserWingId;

                console.log("Filtering by wing:", wingId);

                // Filter maintenance details by owner's wing
                const wingOwnerIds = new Set(
                    allOwners
                        .filter(o => o.wing_id && parseInt(o.wing_id) === parseInt(wingId))
                        .map(o => parseInt(o.owner_id))
                );

                console.log("Wing owner IDs:", Array.from(wingOwnerIds).slice(0, 5), "...");
                console.log("Maintenance details before wing filter:", filteredMaintenanceDetails.length);

                filteredMaintenanceDetails = filteredMaintenanceDetails.filter(m => {
                    const ownerId = m.owner_id ? parseInt(m.owner_id) : null;
                    return ownerId && wingOwnerIds.has(ownerId);
                });

                console.log("Maintenance details after wing filter:", filteredMaintenanceDetails.length);

                // Filter activity payments by flat's wing
                const wingFlatIds = new Set(
                    allFlats
                        .filter(f => f.wing_id && parseInt(f.wing_id) === parseInt(wingId))
                        .map(f => f.flat_id)
                );
                activityPayments = activityPayments.filter(p =>
                    p.flat_id && wingFlatIds.has(p.flat_id)
                );

                // Note: Activity expenses are not linked to flats/wings, so we don't filter them by wing
                // They are linked to activities which may not have wing associations
                // If you need to filter activity expenses by wing, you'd need to join through activities

                // Filter expenses by wing
                expenses = expenses.filter(e =>
                    e.wing_id && parseInt(e.wing_id) === parseInt(wingId)
                );
            }

            // Filter by date range
            if (dateFilter.startDate && dateFilter.endDate) {
                const startDate = new Date(dateFilter.startDate);
                const endDate = new Date(dateFilter.endDate);
                endDate.setHours(23, 59, 59, 999); // Include entire end date

                // Filter maintenance details by bill date
                filteredMaintenanceDetails = filteredMaintenanceDetails.filter(m => {
                    const billDate = m.bill_start_date ? new Date(m.bill_start_date) : (m.created_at ? new Date(m.created_at) : null);
                    if (!billDate) return true; // Include if no date available
                    return billDate >= startDate && billDate <= endDate;
                });

                activityPayments = activityPayments.filter(p => {
                    if (!p.payment_date) return false;
                    const paymentDate = new Date(p.payment_date);
                    return paymentDate >= startDate && paymentDate <= endDate;
                });

                // Activity expenses don't have a date field, use created_at if available, otherwise include all
                activityExpenses = activityExpenses.filter(e => {
                    const expenseDate = e.date ? new Date(e.date) : (e.created_at ? new Date(e.created_at) : null);
                    if (!expenseDate) return true; // Include if no date available
                    return expenseDate >= startDate && expenseDate <= endDate;
                });

                expenses = expenses.filter(e => {
                    if (!e.date) return false;
                    const expenseDate = new Date(e.date);
                    return expenseDate >= startDate && expenseDate <= endDate;
                });
            }

            console.log("Complete Report - After filtering:", {
                maintenanceDetails: filteredMaintenanceDetails.length,
                activityPayments: activityPayments.length,
                activityExpenses: activityExpenses.length,
                expenses: expenses.length
            });

            // Debug: Log sample data to see structure
            if (filteredMaintenanceDetails.length > 0) {
                console.log("Sample maintenance detail:", filteredMaintenanceDetails[0]);
            }
            if (activityExpenses.length > 0) {
                console.log("Sample activity expense:", activityExpenses[0]);
            }

            // Calculate breakdowns by payment mode
            const normalizePaymentMode = (mode) => {
                if (!mode) return "Other";
                const modeLower = mode.toLowerCase();
                if (modeLower.includes("cash")) return "Cash";
                if (modeLower.includes("upi")) return "UPI";
                if (modeLower.includes("bank") || modeLower.includes("transfer")) return "Bank Transfer";
                return mode; // Return original if no match
            };

            // Helper function to group by payment mode
            const groupByPaymentMode = (items, amountField) => {
                const grouped = {};
                items.forEach(item => {
                    const mode = normalizePaymentMode(item.payment_mode);
                    if (!grouped[mode]) {
                        grouped[mode] = 0;
                    }
                    const amount = parseFloat(item[amountField] || 0);
                    grouped[mode] += amount;
                });
                return grouped;
            };

            // Calculate totals by payment mode
            // NOTE: Maintenance Collected = Sum of all paid_amount from maintenance_detail table (only paid amounts, NOT pending)
            // Now that maintenance_detail has payment_mode, we can group by payment mode
            const maintenanceCollectedByMode = groupByPaymentMode(filteredMaintenanceDetails, "paid_amount");

            // Group by payment mode for other categories
            const expenseByMode = groupByPaymentMode(expenses, "amount");
            const activityPaymentByMode = groupByPaymentMode(activityPayments, "amount");
            const activityExpenseByMode = groupByPaymentMode(activityExpenses, "amount");

            // Calculate total maintenance collected
            const totalMaintenanceCollected = Object.values(maintenanceCollectedByMode).reduce((sum, val) => sum + val, 0);

            console.log("Totals by mode:", {
                maintenanceCollectedByMode,
                expenseByMode,
                activityPaymentByMode,
                activityExpenseByMode
            });

            // Get all unique payment modes
            const allModes = new Set([
                ...Object.keys(maintenanceCollectedByMode),
                ...Object.keys(expenseByMode),
                ...Object.keys(activityPaymentByMode),
                ...Object.keys(activityExpenseByMode),
            ]);

            // Calculate totals
            // totalMaintenanceCollected is already calculated above from filteredMaintenanceDetails
            const totalExpense = Object.values(expenseByMode).reduce((sum, val) => sum + val, 0);
            const totalActivityPayment = Object.values(activityPaymentByMode).reduce((sum, val) => sum + val, 0);
            const totalActivityExpense = Object.values(activityExpenseByMode).reduce((sum, val) => sum + val, 0);

            // Calculate balances by payment mode
            const maintenanceBalanceByMode = {};
            const activityBalanceByMode = {};
            const totalBalanceByMode = {};

            allModes.forEach(mode => {
                const maintCollected = maintenanceCollectedByMode[mode] || 0;
                const expense = expenseByMode[mode] || 0;
                maintenanceBalanceByMode[mode] = maintCollected - expense;

                const actPayment = activityPaymentByMode[mode] || 0;
                const actExpense = activityExpenseByMode[mode] || 0;
                activityBalanceByMode[mode] = actPayment - actExpense;

                totalBalanceByMode[mode] = maintenanceBalanceByMode[mode] + activityBalanceByMode[mode];
            });

            // Calculate grand totals
            const totalMaintenanceBalance = totalMaintenanceCollected - totalExpense;
            const totalActivityBalance = totalActivityPayment - totalActivityExpense;
            const grandTotalBalance = totalMaintenanceBalance + totalActivityBalance;

            setCompleteReportData({
                maintenanceCollectedByMode,
                expenseByMode,
                maintenanceBalanceByMode,
                activityPaymentByMode,
                activityExpenseByMode,
                activityBalanceByMode,
                totalBalanceByMode,
                totalMaintenanceCollected,
                totalExpense,
                totalMaintenanceBalance,
                totalActivityPayment,
                totalActivityExpense,
                totalActivityBalance,
                grandTotalBalance,
                allModes: Array.from(allModes).sort(),
            });
        } catch (err) {
            console.error("Error fetching complete report:", err);
            setCompleteReportData(null);
        }
    };

    const handleDateFilterChange = (e) => {
        const { name, value } = e.target;
        setDateFilter(prev => ({ ...prev, [name]: value }));
    };

    const handlePrint = () => {
        window.print();
    };

    const handleEmail = async () => {
        const reportTitle = getReportTitle();
        const emailSubject = `${reportTitle} - ${new Date().toLocaleDateString()}`;
        const emailBody = `Please find attached the ${reportTitle}.\n\nGenerated on: ${new Date().toLocaleString()}`;

        const mailtoLink = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
        window.location.href = mailtoLink;
    };

    const getReportTitle = () => {
        const titles = {
            owner: "Owner Report",
            maintenance: "Maintenance Report",
            expense: "Expense Report",
            rental: "Rental Report",
            meeting: "Meeting Report",
            complete: "Complete Report",
        };
        return titles[activeReport] || "Report";
    };

    const getCurrentReportData = () => {
        switch (activeReport) {
            case "owner":
                return ownerReportData;
            case "maintenance":
                return maintenanceReportData;
            case "expense":
                return expenseReportData;
            case "rental":
                return rentalReportData;
            case "meeting":
                return meetingReportData;
            case "complete":
                return completeReportData;
            default:
                return [];
        }
    };

    const getReportSummary = () => {
        const data = getCurrentReportData();
        switch (activeReport) {
            case "owner":
                return {
                    total: data.length,
                    totalFlats: data.reduce((sum, o) => sum + (o.flat_no ? 1 : 0), 0),
                };
            case "maintenance":
                const totalAmount = data.reduce((sum, m) => sum + parseFloat(m.total_amount || 0), 0);
                const paidAmount = data.reduce((sum, m) => sum + parseFloat(m.paid_amount || 0), 0);
                const pendingAmount = totalAmount - paidAmount;
                return {
                    total: data.length,
                    totalAmount: totalAmount,
                    paidAmount: paidAmount,
                    pendingAmount: pendingAmount,
                };
            case "expense":
                const totalExpense = data.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
                return {
                    total: data.length,
                    totalAmount: totalExpense,
                };
            case "rental":
                return {
                    total: data.length,
                };
            case "meeting":
                return {
                    total: data.length,
                };
            default:
                return {};
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(amount || 0);
    };

    const formatDate = (dateString) => {
        if (!dateString) return "-";
        return new Date(dateString).toLocaleDateString('en-IN');
    };

    const reportTypes = [
        { id: "owner", label: "Owner Report", icon: "👥" },
        { id: "maintenance", label: "Maintenance Report", icon: "🧾" },
        { id: "expense", label: "Expense Report", icon: "💵" },
        { id: "rental", label: "Rental Report", icon: "🏠" },
        { id: "meeting", label: "Meeting Report", icon: "🗓️" },
        { id: "complete", label: "Complete Report", icon: "📊" },
    ];

    const summary = getReportSummary();
    const reportData = getCurrentReportData();

    return (
        <div className="reports-container">
            <div className="reports-header">
                <div className="header-left">
                    <h2>📊 {reportType || "Reports"}</h2>
                    <p>Generate and export detailed reports</p>
                </div>
                <div className="header-actions">
                    <button className="btn-print" onClick={handlePrint}>
                        🖨️ Print
                    </button>
                    <button className="btn-email" onClick={handleEmail}>
                        📧 Email
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="reports-filters">
                <div className="filter-group">
                    <label>Start Date</label>
                    <input
                        type="date"
                        name="startDate"
                        value={dateFilter.startDate}
                        onChange={handleDateFilterChange}
                    />
                </div>
                <div className="filter-group">
                    <label>End Date</label>
                    <input
                        type="date"
                        name="endDate"
                        value={dateFilter.endDate}
                        onChange={handleDateFilterChange}
                    />
                </div>
                <div className="filter-group">
                    <label>Wing</label>
                    <select
                        name="wing_id"
                        value={dateFilter.wing_id}
                        onChange={handleDateFilterChange}
                    >
                        <option value="">All Wings</option>
                        {wings.map((wing) => (
                            <option key={wing.wing_id} value={wing.wing_id}>
                                {wing.wing_name}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="filter-group">
                    <button className="btn-filter" onClick={fetchAllReports}>
                        🔍 Apply Filters
                    </button>
                    <button
                        className="btn-reset"
                        onClick={() => setDateFilter({ startDate: "", endDate: "", wing_id: "" })}
                    >
                        🔄 Reset
                    </button>
                </div>
            </div>

            {/* Report Tabs - Only show if no specific reportType is passed */}
            {!reportType && (
                <div className="reports-tabs">
                    {reportTypes.map((type) => (
                        <button
                            key={type.id}
                            className={`tab-button ${activeReport === type.id ? "active" : ""}`}
                            onClick={() => setActiveReport(type.id)}
                        >
                            <span className="tab-icon">{type.icon}</span>
                            <span className="tab-label">{type.label}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* Report Content */}
            <div className="report-content" ref={reportRef}>
                {loading ? (
                    <div className="loading-state">Loading report data...</div>
                ) : (
                    <>
                        {/* Report Header */}
                        <div className="report-header print-header">
                            <div className="report-title-section">
                                <h1>{reportType || getReportTitle()}</h1>
                                <p className="report-meta">
                                    Generated on: {new Date().toLocaleString('en-IN')}
                                    {dateFilter.startDate && dateFilter.endDate && (
                                        <span> | Period: {formatDate(dateFilter.startDate)} to {formatDate(dateFilter.endDate)}</span>
                                    )}
                                    {dateFilter.wing_id && (
                                        <span> | Wing: {wings.find(w => w.wing_id === parseInt(dateFilter.wing_id))?.wing_name || "All"}</span>
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* Summary Cards */}
                        <div className="report-summary">
                            {activeReport === "owner" && (
                                <>
                                    <div className="summary-card">
                                        <div className="summary-label">Total Owners</div>
                                        <div className="summary-value">{summary.total}</div>
                                    </div>
                                    <div className="summary-card">
                                        <div className="summary-label">Total Flats</div>
                                        <div className="summary-value">{summary.totalFlats}</div>
                                    </div>
                                </>
                            )}
                            {activeReport === "maintenance" && (
                                <>
                                    <div className="summary-card">
                                        <div className="summary-label">Total Records</div>
                                        <div className="summary-value">{summary.total}</div>
                                    </div>
                                    <div className="summary-card">
                                        <div className="summary-label">Total Amount</div>
                                        <div className="summary-value">{formatCurrency(summary.totalAmount)}</div>
                                    </div>
                                    <div className="summary-card">
                                        <div className="summary-label">Paid Amount</div>
                                        <div className="summary-value success">{formatCurrency(summary.paidAmount)}</div>
                                    </div>
                                    <div className="summary-card">
                                        <div className="summary-label">Pending Amount</div>
                                        <div className="summary-value warning">{formatCurrency(summary.pendingAmount)}</div>
                                    </div>
                                </>
                            )}
                            {activeReport === "expense" && (
                                <>
                                    <div className="summary-card">
                                        <div className="summary-label">Total Expenses</div>
                                        <div className="summary-value">{summary.total}</div>
                                    </div>
                                    <div className="summary-card">
                                        <div className="summary-label">Total Amount</div>
                                        <div className="summary-value">{formatCurrency(summary.totalAmount)}</div>
                                    </div>
                                </>
                            )}
                            {(activeReport === "rental" || activeReport === "meeting") && (
                                <div className="summary-card">
                                    <div className="summary-label">Total Records</div>
                                    <div className="summary-value">{summary.total}</div>
                                </div>
                            )}
                        </div>

                        {/* Report Table */}
                        <div className="report-table-container">
                            {activeReport === "owner" && (
                                <table className="report-table">
                                    <thead>
                                        <tr>
                                            <th>Owner ID</th>
                                            <th>Owner Name</th>
                                            <th>Flat No</th>
                                            <th>Contact</th>
                                            <th>Email</th>
                                            <th>Wing</th>
                                            <th>Residence</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reportData.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" className="no-data">No data available</td>
                                            </tr>
                                        ) : (
                                            reportData.map((owner) => (
                                                <tr key={owner.owner_id}>
                                                    <td>{owner.owner_id}</td>
                                                    <td>{owner.owner_name}</td>
                                                    <td>{owner.flat_no || "-"}</td>
                                                    <td>{owner.owner_contactno || "-"}</td>
                                                    <td>{owner.owner_email || "-"}</td>
                                                    <td>{wings.find(w => w.wing_id === owner.wing_id)?.wing_name || "-"}</td>
                                                    <td>{owner.is_residence ? "Yes" : "No"}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            )}

                            {activeReport === "maintenance" && (
                                <table className="report-table">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Owner Name</th>
                                            <th>Bill Period</th>
                                            <th>Total Amount</th>
                                            <th>Paid Amount</th>
                                            <th>Pending Amount</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reportData.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" className="no-data">No data available</td>
                                            </tr>
                                        ) : (
                                            reportData.map((maintenance) => {
                                                // Use owner_name directly from maintenance data (now included in backend query)
                                                const ownerName = maintenance.owner_name || "-";
                                                const pending = parseFloat(maintenance.total_amount || 0) - parseFloat(maintenance.paid_amount || 0);
                                                return (
                                                    <tr key={maintenance.maintain_id}>
                                                        <td>{maintenance.maintain_id}</td>
                                                        <td>{ownerName}</td>
                                                        <td>
                                                            {formatDate(maintenance.bill_start_date)} - {formatDate(maintenance.bill_end_date)}
                                                        </td>
                                                        <td>{formatCurrency(maintenance.total_amount)}</td>
                                                        <td className="success">{formatCurrency(maintenance.paid_amount)}</td>
                                                        <td className="warning">{formatCurrency(pending)}</td>
                                                        <td>
                                                            <span className={`status-badge ${maintenance.status?.toLowerCase() || "pending"}`}>
                                                                {maintenance.status || "Pending"}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            )}

                            {activeReport === "expense" && (
                                <table className="report-table">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Date</th>
                                            <th>Category</th>
                                            <th>Description</th>
                                            <th>Amount</th>
                                            <th>Payment Mode</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reportData.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" className="no-data">No data available</td>
                                            </tr>
                                        ) : (
                                            reportData.map((expense) => (
                                                <tr key={expense.exp_id}>
                                                    <td>{expense.exp_id}</td>
                                                    <td>{formatDate(expense.date)}</td>
                                                    <td>{expense.catg_name || "-"}</td>
                                                    <td>{expense.description || "-"}</td>
                                                    <td>{formatCurrency(expense.amount)}</td>
                                                    <td>{expense.payment_mode || "-"}</td>
                                                    <td>
                                                        <span className={`status-badge ${expense.payment_status?.toLowerCase()}`}>
                                                            {expense.payment_status || "Pending"}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            )}

                            {activeReport === "rental" && (
                                <table className="report-table">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Flat No</th>
                                            <th>Owner</th>
                                            <th>Tenant</th>
                                            <th>Start Date</th>
                                            <th>End Date</th>
                                            <th>Monthly Rent</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reportData.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" className="no-data">No data available</td>
                                            </tr>
                                        ) : (
                                            reportData.map((rental) => (
                                                <tr key={rental.rental_id}>
                                                    <td>{rental.rental_id}</td>
                                                    <td>{rental.flat_no || "-"}</td>
                                                    <td>{rental.owner_name || "-"}</td>
                                                    <td>{rental.tenant_name || "-"}</td>
                                                    <td>{formatDate(rental.start_date)}</td>
                                                    <td>{formatDate(rental.end_date)}</td>
                                                    <td>{formatCurrency(rental.monthly_rent)}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            )}

                            {activeReport === "meeting" && (
                                <table className="report-table">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Meeting Date</th>
                                            <th>Title</th>
                                            <th>Agenda</th>
                                            <th>Location</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reportData.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="no-data">No data available</td>
                                            </tr>
                                        ) : (
                                            reportData.map((meeting) => (
                                                <tr key={meeting.meeting_id}>
                                                    <td>{meeting.meeting_id}</td>
                                                    <td>{formatDate(meeting.meeting_date)}</td>
                                                    <td>{meeting.meeting_name || "-"}</td>
                                                    <td>{meeting.purpose || "-"}</td>
                                                    <td>{meeting.description || "-"}</td>
                                                    <td>
                                                        <span className={`status-badge ${meeting.status?.toLowerCase() || "scheduled"}`}>
                                                            {meeting.status || "Scheduled"}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            )}

                            {activeReport === "complete" && completeReportData && (
                                <div className="complete-report">
                                    {/* Summary Section */}
                                    <div className="complete-report-summary">
                                        <h3>📊 Financial Summary</h3>
                                        <div className="summary-grid">
                                            <div className="summary-item">
                                                <div className="summary-label">Total Maintenance Collected</div>
                                                <div className="summary-value success">{formatCurrency(completeReportData.totalMaintenanceCollected)}</div>
                                            </div>
                                            <div className="summary-item">
                                                <div className="summary-label">Total Expense</div>
                                                <div className="summary-value danger">{formatCurrency(completeReportData.totalExpense)}</div>
                                            </div>
                                            <div className="summary-item">
                                                <div className="summary-label">Maintenance Balance</div>
                                                <div className={`summary-value balance-maintenance ${completeReportData.totalMaintenanceBalance < 0 ? 'negative' : ''}`}>
                                                    {formatCurrency(completeReportData.totalMaintenanceBalance)}
                                                </div>
                                            </div>
                                            <div className="summary-item">
                                                <div className="summary-label">Activity Total Payment</div>
                                                <div className="summary-value success">{formatCurrency(completeReportData.totalActivityPayment)}</div>
                                            </div>
                                            <div className="summary-item">
                                                <div className="summary-label">Activity Total Expense</div>
                                                <div className="summary-value danger">{formatCurrency(completeReportData.totalActivityExpense)}</div>
                                            </div>
                                            <div className="summary-item">
                                                <div className="summary-label">Activity Balance</div>
                                                <div className={`summary-value balance-activity ${completeReportData.totalActivityBalance < 0 ? 'negative' : ''}`}>
                                                    {formatCurrency(completeReportData.totalActivityBalance)}
                                                </div>
                                            </div>
                                            <div className="summary-item highlight">
                                                <div className="summary-label">Total Balance / Profit</div>
                                                <div className={`summary-value balance-total ${completeReportData.grandTotalBalance < 0 ? 'negative' : ''}`}>
                                                    {formatCurrency(completeReportData.grandTotalBalance)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Payment Breakdown by Payment Mode */}
                                    <div className="payment-mode-breakdown">
                                        <h3>💳 Payment Breakdown by Payment Mode</h3>
                                        <div className="report-table-container">
                                            <table className="report-table payment-breakdown-table">
                                                <colgroup>
                                                    <col style={{ width: '12.5%' }} />
                                                    <col style={{ width: '12.5%' }} />
                                                    <col style={{ width: '12.5%' }} />
                                                    <col style={{ width: '12.5%' }} />
                                                    <col style={{ width: '12.5%' }} />
                                                    <col style={{ width: '12.5%' }} />
                                                    <col style={{ width: '12.5%' }} />
                                                    <col style={{ width: '12.5%' }} />
                                                </colgroup>
                                                <thead>
                                                    <tr>
                                                        <th>Payment Mode</th>
                                                        <th>Maintenance Collected</th>
                                                        <th>Expense</th>
                                                        <th>Maintenance Balance</th>
                                                        <th>Activity Payment</th>
                                                        <th>Activity Expense</th>
                                                        <th>Activity Balance</th>
                                                        <th>Total Balance</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(() => {
                                                        // Define payment modes in consistent order (priority order)
                                                        const priorityModes = ['UPI', 'Cash', 'Bank Transfer', 'Other'];

                                                        // Get all modes from data
                                                        const allModesFromData = completeReportData.allModes || [];

                                                        // Create ordered list: priority modes first, then any other modes
                                                        const orderedModes = [
                                                            ...priorityModes.filter(mode => allModesFromData.includes(mode)),
                                                            ...allModesFromData.filter(mode => !priorityModes.includes(mode))
                                                        ];

                                                        // Filter to only show modes that have data
                                                        const modesWithData = orderedModes.filter(mode => {
                                                            const hasMaintenance = (completeReportData.maintenanceCollectedByMode[mode] || 0) > 0;
                                                            const hasExpense = (completeReportData.expenseByMode[mode] || 0) > 0;
                                                            const hasActivityPayment = (completeReportData.activityPaymentByMode[mode] || 0) > 0;
                                                            const hasActivityExpense = (completeReportData.activityExpenseByMode[mode] || 0) > 0;
                                                            return hasMaintenance || hasExpense || hasActivityPayment || hasActivityExpense;
                                                        });

                                                        if (modesWithData.length === 0) {
                                                            return (
                                                                <tr>
                                                                    <td colSpan="8" className="no-data">No data available</td>
                                                                </tr>
                                                            );
                                                        }

                                                        return modesWithData.map((mode) => {
                                                            const maintCollected = completeReportData.maintenanceCollectedByMode[mode] || 0;
                                                            const expense = completeReportData.expenseByMode[mode] || 0;
                                                            const maintBalance = completeReportData.maintenanceBalanceByMode[mode] || 0;
                                                            const actPayment = completeReportData.activityPaymentByMode[mode] || 0;
                                                            const actExpense = completeReportData.activityExpenseByMode[mode] || 0;
                                                            const actBalance = completeReportData.activityBalanceByMode[mode] || 0;
                                                            const totalBalance = completeReportData.totalBalanceByMode[mode] || 0;

                                                            return (
                                                                <tr key={mode}>
                                                                    <td><strong>{mode}</strong></td>
                                                                    <td className="success">{formatCurrency(maintCollected)}</td>
                                                                    <td className="danger">{formatCurrency(expense)}</td>
                                                                    <td className={`balance-maintenance ${maintBalance < 0 ? 'negative' : ''}`}>
                                                                        {formatCurrency(maintBalance)}
                                                                    </td>
                                                                    <td className="success">{formatCurrency(actPayment)}</td>
                                                                    <td className="danger">{formatCurrency(actExpense)}</td>
                                                                    <td className={`balance-activity ${actBalance < 0 ? 'negative' : ''}`}>
                                                                        {formatCurrency(actBalance)}
                                                                    </td>
                                                                    <td className={`balance-total ${totalBalance < 0 ? 'negative' : ''}`}>
                                                                        <strong>{formatCurrency(totalBalance)}</strong>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        });
                                                    })()}

                                                </tbody>
                                                <tfoot>
                                                    <tr className="total-row">
                                                        <td><strong>GRAND TOTAL</strong></td>
                                                        <td className="success"><strong>{formatCurrency(completeReportData.totalMaintenanceCollected)}</strong></td>
                                                        <td className="danger"><strong>{formatCurrency(completeReportData.totalExpense)}</strong></td>
                                                        <td className={`balance-maintenance ${completeReportData.totalMaintenanceBalance < 0 ? 'negative' : ''}`}>
                                                            <strong>{formatCurrency(completeReportData.totalMaintenanceBalance)}</strong>
                                                        </td>
                                                        <td className="success"><strong>{formatCurrency(completeReportData.totalActivityPayment)}</strong></td>
                                                        <td className="danger"><strong>{formatCurrency(completeReportData.totalActivityExpense)}</strong></td>
                                                        <td className={`balance-activity ${completeReportData.totalActivityBalance < 0 ? 'negative' : ''}`}>
                                                            <strong>{formatCurrency(completeReportData.totalActivityBalance)}</strong>
                                                        </td>
                                                        <td className={`balance-total ${completeReportData.grandTotalBalance < 0 ? 'negative' : ''}`}>
                                                            <strong>{formatCurrency(completeReportData.grandTotalBalance)}</strong>
                                                        </td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Formula Section */}
                                    <div className="formula-section">
                                        <h3
                                            onClick={() => setIsFormulaExpanded(!isFormulaExpanded)}
                                            style={{ cursor: 'pointer', userSelect: 'none' }}
                                        >
                                            {isFormulaExpanded ? '▼' : '▶'} 📐 Calculation Formulas
                                        </h3>
                                        {isFormulaExpanded && (
                                            <div className="formula-list">
                                                <div className="formula-item">
                                                    <strong>Maintenance Balance</strong> = Total Maintenance Collected - Total Expense
                                                    <div className="formula-result">
                                                        = {formatCurrency(completeReportData.totalMaintenanceCollected)} - {formatCurrency(completeReportData.totalExpense)}
                                                        = <span className={completeReportData.totalMaintenanceBalance >= 0 ? 'success' : 'danger'}>
                                                            {formatCurrency(completeReportData.totalMaintenanceBalance)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="formula-item">
                                                    <strong>Activity Balance</strong> = Activity Total Payment - Activity Total Expense
                                                    <div className="formula-result">
                                                        = {formatCurrency(completeReportData.totalActivityPayment)} - {formatCurrency(completeReportData.totalActivityExpense)}
                                                        = <span className={completeReportData.totalActivityBalance >= 0 ? 'success' : 'danger'}>
                                                            {formatCurrency(completeReportData.totalActivityBalance)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="formula-item highlight">
                                                    <strong>Total Balance / Profit</strong> = Maintenance Balance + Activity Balance
                                                    <div className="formula-result">
                                                        = {formatCurrency(completeReportData.totalMaintenanceBalance)} + {formatCurrency(completeReportData.totalActivityBalance)}
                                                        = <span className={completeReportData.grandTotalBalance >= 0 ? 'success' : 'danger'}>
                                                            <strong>{formatCurrency(completeReportData.grandTotalBalance)}</strong>
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeReport === "complete" && !completeReportData && (
                                <div className="no-data">No data available for complete report</div>
                            )}
                        </div>

                        {/* Report Footer */}
                        <div className="report-footer print-footer">
                            <p>This report was generated by {user?.user_name || "System"} on {new Date().toLocaleString('en-IN')}</p>
                            <p className="footer-note">SocietySync Management System</p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Reports;

