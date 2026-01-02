import React, { useState, useEffect, useRef } from "react";
import { getOwners, getWings } from "../services/api";
import { getCurrentUserWingId, filterOwnersByWing } from "../utils/wingFilter";
import "../css/Reports.css";

const OwnerReport = () => {
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
            const res = await getOwners();
            let owners = res.data || [];
            
            if (dateFilter.wing_id) {
                owners = owners.filter(o => o.wing_id === parseInt(dateFilter.wing_id));
            } else if (currentUserWingId !== null) {
                owners = filterOwnersByWing(owners, currentUserWingId);
            }
            
            setReportData(owners);
        } catch (err) {
            console.error("Error fetching owner report:", err);
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
        const emailSubject = `Owner Report - ${new Date().toLocaleDateString()}`;
        const emailBody = `Please find attached the Owner Report.\n\nGenerated on: ${new Date().toLocaleString()}`;
        const mailtoLink = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
        window.location.href = mailtoLink;
    };

    const formatDate = (dateString) => {
        if (!dateString) return "-";
        return new Date(dateString).toLocaleDateString('en-IN');
    };

    const summary = {
        total: reportData.length,
        totalFlats: reportData.reduce((sum, o) => sum + (o.flat_no ? 1 : 0), 0),
    };

    return (
        <div className="reports-container">
            <div className="reports-header">
                <div className="header-left">
                    <h2>👥 Owner Report</h2>
                    <p>Generate and export owner details report</p>
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
                                <h1>Owner Report</h1>
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
                                <div className="summary-label">Total Owners</div>
                                <div className="summary-value">{summary.total}</div>
                            </div>
                            <div className="summary-card">
                                <div className="summary-label">Total Flats</div>
                                <div className="summary-value">{summary.totalFlats}</div>
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
                                        reportData.map((owner, index) => (
                                            <tr key={owner.owner_id}>
                                                <td>{index + 1}</td>
                                                <td>{owner.owner_name}</td>
                                                <td>{owner.flat_no || "-"}</td>
                                                <td>{owner.owner_contactno || "-"}</td>
                                                <td>{owner.owner_email || "-"}</td>
                                                <td>{wings.find(w => w.wing_id === owner.wing_id)?.wing_name || "-"}</td>
                                                <td>{(owner.is_residence === 1 || owner.is_residence === '1' || owner.is_residence === true) ? "Yes" : "No"}</td>
                                            </tr>
                                        ))
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

export default OwnerReport;

