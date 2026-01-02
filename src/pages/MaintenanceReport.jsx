import React, { useState, useEffect, useRef } from "react";
import { getMaintenanceDetails, getWings } from "../services/api";
import { getCurrentUserWingId } from "../utils/wingFilter";
import "../css/Reports.css";

const MaintenanceReport = () => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const [loading, setLoading] = useState(false);
    const [wings, setWings] = useState([]);
    const [reportData, setReportData] = useState([]);
    
    const [dateFilter, setDateFilter] = useState({
        startDate: "",
        endDate: "",
        wing_id: "",
    });

    const reportRef = useRef(null);
    const currentUserWingId = getCurrentUserWingId();

    useEffect(() => {
        fetchWings();
        fetchReport();
    }, []);

    useEffect(() => {
        fetchReport();
    }, [dateFilter]);

    const fetchWings = async () => {
        try {
            const res = await getWings();
            setWings(res.data || []);
        } catch (err) {
            console.error("Error fetching wings:", err);
        }
    };

    const fetchReport = async () => {
        setLoading(true);
        try {
            const res = await getMaintenanceDetails();
            console.log("Maintenance API Response:", res);
            
            // Extract data from axios response - handle both direct array and nested data
            let maintenance = [];
            if (Array.isArray(res)) {
                maintenance = res;
            } else if (Array.isArray(res?.data)) {
                maintenance = res.data;
            } else if (res?.data?.data && Array.isArray(res.data.data)) {
                maintenance = res.data.data;
            }
            
            console.log("Raw maintenance data count:", maintenance.length);
            if (maintenance.length > 0) {
                console.log("Sample maintenance record:", maintenance[0]);
            }
            
            // Filter by wing if selected (use wing_id directly from maintenance data)
            if (dateFilter.wing_id) {
                maintenance = maintenance.filter(m => {
                    // If wing_id is null/undefined, exclude it when a specific wing is selected
                    if (m.wing_id === null || m.wing_id === undefined || m.wing_id === '') {
                        return false;
                    }
                    return parseInt(m.wing_id) === parseInt(dateFilter.wing_id);
                });
                console.log("After wing filter (selected):", maintenance.length);
            } else if (currentUserWingId !== null) {
                // Filter by current user's wing (use wing_id directly from maintenance data)
                // Only filter if wing_id is present; show records without wing_id only if user has no wing restriction
                maintenance = maintenance.filter(m => {
                    // If wing_id is null/undefined, we can't match it, so exclude it
                    if (m.wing_id === null || m.wing_id === undefined || m.wing_id === '') {
                        return false;
                    }
                    return parseInt(m.wing_id) === parseInt(currentUserWingId);
                });
                console.log("After wing filter (current user):", maintenance.length);
            }
            
            // Filter by date range
            if (dateFilter.startDate && dateFilter.endDate) {
                maintenance = maintenance.filter(m => {
                    const billDate = new Date(m.bill_start_date || m.created_at);
                    const startDate = new Date(dateFilter.startDate);
                    const endDate = new Date(dateFilter.endDate);
                    endDate.setHours(23, 59, 59, 999); // Include entire end date
                    return billDate >= startDate && billDate <= endDate;
                });
                console.log("After date filter:", maintenance.length);
            }
            
            console.log("Final maintenance data count:", maintenance.length);
            console.log("Sample maintenance record:", maintenance[0]);
            
            setReportData(maintenance);
        } catch (err) {
            console.error("Error fetching maintenance report:", err);
            console.error("Error details:", err.response?.data || err.message);
            setReportData([]);
        } finally {
            setLoading(false);
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
        const emailSubject = `Maintenance Report - ${new Date().toLocaleDateString()}`;
        const emailBody = `Please find attached the Maintenance Report.\n\nGenerated on: ${new Date().toLocaleString()}`;
        const mailtoLink = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
        window.location.href = mailtoLink;
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

    const totalAmount = reportData.reduce((sum, m) => sum + parseFloat(m.total_amount || 0), 0);
    const paidAmount = reportData.reduce((sum, m) => sum + parseFloat(m.paid_amount || 0), 0);
    const pendingAmount = totalAmount - paidAmount;

    const summary = {
        total: reportData.length,
        totalAmount: totalAmount,
        paidAmount: paidAmount,
        pendingAmount: pendingAmount,
    };

    return (
        <div className="reports-container">
            <div className="reports-header">
                <div className="header-left">
                    <h2>🧾 Maintenance Report</h2>
                    <p>Generate and export maintenance payment report</p>
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
                    <button className="btn-filter" onClick={fetchReport}>
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

            {/* Report Content */}
            <div className="report-content" ref={reportRef}>
                {loading ? (
                    <div className="loading-state">Loading report data...</div>
                ) : (
                    <>
                        {/* Report Header */}
                        <div className="report-header print-header">
                            <div className="report-title-section">
                                <h1>Maintenance Report</h1>
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
                        </div>

                        {/* Report Table */}
                        <div className="report-table-container">
                            <table className="report-table">
                                <thead>
                                    <tr>
                                        <th>Sr. No.</th>
                                        <th>Owner Name</th>
                                        <th>Flat No</th>
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
                                            <td colSpan="8" className="no-data">No data available</td>
                                        </tr>
                                    ) : (
                                        reportData.map((maintenance, index) => {
                                            const ownerName = maintenance.owner_name || "-";
                                            const flatNo = maintenance.flat_no || "-";
                                            const pending = parseFloat(maintenance.total_amount || 0) - parseFloat(maintenance.paid_amount || 0);
                                            return (
                                                <tr key={maintenance.maintain_id}>
                                                    <td>{index + 1}</td>
                                                    <td>{ownerName}</td>
                                                    <td>{flatNo}</td>
                                                    <td>
                                                        {formatDate(maintenance.bill_start_date)} - {formatDate(maintenance.bill_end_date)}
                                                    </td>
                                                    <td>{formatCurrency(maintenance.total_amount)}</td>
                                                    <td className="success">{formatCurrency(maintenance.paid_amount)}</td>
                                                    <td className="warning">{formatCurrency(pending)}</td>
                                                    <td>
                                                        <span className={`status-badge ${(maintenance.status || "pending").toLowerCase()}`}>
                                                            {maintenance.status || "Pending"}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
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

export default MaintenanceReport;

