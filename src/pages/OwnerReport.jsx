import React, { useState, useEffect, useRef } from "react";
import { getOwners, getWings } from "../services/api";
import { getCurrentUserWingId, filterOwnersByWing } from "../utils/wingFilter";
import "../css/Reports.css";

const OwnerReport = () => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const [loading, setLoading] = useState(false);
    const [wings, setWings] = useState([]);
    const [reportData, setReportData] = useState([]);
    
    // Search filter for Owner Report (searches both flat number and owner name)
    const [searchFilter, setSearchFilter] = useState({
        ownerSearch: "",
    });

    const reportRef = useRef(null);
    const currentUserWingId = getCurrentUserWingId();

    useEffect(() => {
        fetchWings();
        fetchReport();
    }, []);

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
            
            // Apply wing filter if user has wing restriction
            if (currentUserWingId !== null) {
                owners = filterOwnersByWing(owners, currentUserWingId);
            }
            
            // Apply search filter (searches both flat number and owner name)
            if (searchFilter.ownerSearch && searchFilter.ownerSearch.trim() !== "") {
                const searchTerm = searchFilter.ownerSearch.toLowerCase().trim();
                owners = owners.filter(owner => {
                    const flatNo = (owner.flat_no || "").toString().toLowerCase();
                    const ownerName = (owner.owner_name || "").toLowerCase();
                    return flatNo.includes(searchTerm) || ownerName.includes(searchTerm);
                });
            }
            
            setReportData(owners);
        } catch (err) {
            console.error("Error fetching owner report:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearchChange = (e) => {
        setSearchFilter(prev => ({ ...prev, ownerSearch: e.target.value }));
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
                <div className="filter-group" style={{ flex: '1 1 300px', minWidth: '300px' }}>
                    <label>Search by Flat Number or Owner Name</label>
                    <input
                        type="text"
                        name="ownerSearch"
                        placeholder="Enter flat number or owner name"
                        value={searchFilter.ownerSearch || ""}
                        onChange={handleSearchChange}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                                fetchReport();
                            }
                        }}
                        style={{ width: '100%', padding: '8px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ddd' }}
                    />
                </div>
                <div className="filter-group">
                    <button className="btn-filter" onClick={fetchReport}>
                        🔍 Search
                    </button>
                    <button 
                        className="btn-reset" 
                        onClick={() => {
                            setSearchFilter({ ownerSearch: "" });
                            fetchReport();
                        }}
                    >
                        🔄 Clear
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
                                    {searchFilter.ownerSearch && (
                                        <span> | Search: "{searchFilter.ownerSearch}"</span>
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

