import React, { useState, useEffect, useCallback } from "react";
import {
    getOwners,
    getRentals,
    getMaintenanceDetails,
    getExpenses,
    getAllPayments,
    getAllActivityExpenses,
    getMeetings,
    getSocieties,
} from "../services/api";
import {
    getCurrentUserWingId,
    filterOwnersByWing,
    filterMaintenanceDetailsByWing,
    filterByWing,
} from "../utils/wingFilter";
import {
    isOwnerRole,
    getCurrentOwnerId,
    filterOwnersByCurrentOwner,
    filterMaintenanceByCurrentOwner,
    filterRentalsByCurrentOwner,
    filterActivityPaymentsByCurrentOwner,
} from "../utils/ownerFilter";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import "../css/DashboardContent.css";

const DashboardContent = ({ user }) => {
    const [loading, setLoading] = useState(true);
    const [societyName, setSocietyName] = useState("");
    const [societyLogo, setSocietyLogo] = useState("");
    const [stats, setStats] = useState({
        totalOwners: 0,
        totalRentals: 0,
        totalMaintenanceAmount: 0,
        totalExpenseAmount: 0,
        totalActivityAmount: 0,
        totalActivityExpenseAmount: 0,
        totalMeetings: 0,
        totalMaintenanceCollected: 0,
        totalMaintenancePending: 0,
        totalFlats: 0,
    });

    // Get current user's wing_id
    const currentUserWingId = getCurrentUserWingId();

    // Colors for pie charts
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B6B'];

    // Fetch dashboard data - wrapped in useCallback to avoid recreating on every render
    const fetchDashboardData = useCallback(async () => {
        try {
            setLoading(true);

            // Fetch all data in parallel
            const [
                ownersRes,
                rentalsRes,
                maintenanceRes,
                expensesRes,
                activityPaymentsRes,
                activityExpensesRes,
                meetingsRes,
                societiesRes,
            ] = await Promise.all([
                getOwners(),
                getRentals(),
                getMaintenanceDetails(),
                getExpenses(),
                getAllPayments(),
                getAllActivityExpenses(),
                getMeetings(),
                getSocieties(),
            ]);

            // Fetch society name and logo
            if (societiesRes && societiesRes.data && societiesRes.data.length > 0) {
                const society = societiesRes.data[0];
                setSocietyName(society.soc_name || "");
                setSocietyLogo(society.soc_logo || society.logo_url || "");
            }

            // Get raw data
            const rawOwners = Array.isArray(ownersRes.data) ? ownersRes.data : ownersRes.data?.data || [];
            const rawRentals = Array.isArray(rentalsRes.data) ? rentalsRes.data : rentalsRes.data?.data || [];
            const rawMaintenanceDetails = Array.isArray(maintenanceRes.data) ? maintenanceRes.data : maintenanceRes.data?.data || [];
            const rawExpenses = Array.isArray(expensesRes.data) ? expensesRes.data : expensesRes.data?.data || [];
            const rawActivityPayments = Array.isArray(activityPaymentsRes.data) ? activityPaymentsRes.data : activityPaymentsRes.data?.data || [];
            const rawActivityExpenses = Array.isArray(activityExpensesRes.data) ? activityExpensesRes.data : activityExpensesRes.data?.data || [];
            const rawMeetings = Array.isArray(meetingsRes.data) ? meetingsRes.data : meetingsRes.data?.data || [];

            // Filter by wing if user has wing_id
            let owners, rentals, maintenanceDetails, expenses, activityPayments, activityExpenses, meetings;

            if (currentUserWingId !== null) {
                // Filter owners by wing
                owners = filterOwnersByWing(rawOwners, currentUserWingId);

                // Filter rentals by owner's wing
                const ownerWingMap = {};
                rawOwners.forEach(owner => {
                    if (owner && owner.owner_id) {
                        ownerWingMap[owner.owner_id] = Number(owner.wing_id);
                    }
                });
                rentals = rawRentals.filter(r => {
                    if (!r || !r.owner_id || r.is_deleted) return false;
                    const ownerWingId = ownerWingMap[r.owner_id];
                    return ownerWingId && Number(ownerWingId) === Number(currentUserWingId);
                });

                // Filter maintenance details by owner's wing
                maintenanceDetails = filterMaintenanceDetailsByWing(rawMaintenanceDetails, rawOwners, currentUserWingId);

                // Filter expenses by wing_id
                expenses = filterByWing(rawExpenses, currentUserWingId, 'wing_id');

                // Filter activity payments by flat_id -> owner -> wing_id
                const flatOwnerMap = {};
                rawOwners.forEach(owner => {
                    if (owner && owner.flat_id) {
                        flatOwnerMap[owner.flat_id] = Number(owner.wing_id);
                    }
                });
                activityPayments = rawActivityPayments.filter(ap => {
                    if (!ap || !ap.flat_id || ap.is_deleted) return false;
                    const flatWingId = flatOwnerMap[ap.flat_id];
                    return flatWingId && Number(flatWingId) === Number(currentUserWingId);
                });

                // Filter activity expenses by wing_id if they have it
                // Note: Activity expenses are linked to activities, which are typically society-wide
                // If activity expenses have wing_id, filter by it; otherwise show all (society-wide expenses)
                activityExpenses = rawActivityExpenses.filter(ae => {
                    if (!ae || ae.is_deleted) return false;
                    // If activity expense has wing_id, filter by it
                    if (ae.wing_id !== undefined && ae.wing_id !== null) {
                        return Number(ae.wing_id) === Number(currentUserWingId);
                    }
                    // If no wing_id, include all (treating as society-wide activity expenses)
                    return true;
                });

                // Filter meetings by wing_id
                meetings = filterByWing(rawMeetings, currentUserWingId, 'wing_id');
            } else {
                // If no wing_id, show all data (admin view)
                owners = rawOwners;
                rentals = rawRentals;
                maintenanceDetails = rawMaintenanceDetails;
                expenses = rawExpenses;
                activityPayments = rawActivityPayments;
                activityExpenses = rawActivityExpenses;
                meetings = rawMeetings;
            }

            // Filter by owner_id if user is owner role
            if (isOwnerRole()) {
                const ownerId = getCurrentOwnerId();
                if (ownerId) {
                    // Filter owners - show only current owner
                    owners = filterOwnersByCurrentOwner(owners);

                    // Filter rentals - show only rentals for current owner
                    rentals = filterRentalsByCurrentOwner(rentals);

                    // Filter maintenance details - show only current owner's maintenance
                    maintenanceDetails = filterMaintenanceByCurrentOwner(maintenanceDetails);

                    // Filter activity payments - show only for current owner's flat
                    activityPayments = filterActivityPaymentsByCurrentOwner(activityPayments, owners);

                    // Filter expenses - show only expenses related to current owner's flat/wing
                    // Note: Expenses are typically society-wide, but we can filter by wing_id if available
                    const ownerWingId = owners.length > 0 ? owners[0].wing_id : null;
                    if (ownerWingId) {
                        expenses = expenses.filter(e => {
                            if (!e || e.is_deleted) return false;
                            return e.wing_id && Number(e.wing_id) === Number(ownerWingId);
                        });
                    } else {
                        expenses = []; // No expenses if no wing_id
                    }

                    // Filter activity expenses - similar to expenses
                    if (ownerWingId) {
                        activityExpenses = activityExpenses.filter(ae => {
                            if (!ae || ae.is_deleted) return false;
                            if (ae.wing_id !== undefined && ae.wing_id !== null) {
                                return Number(ae.wing_id) === Number(ownerWingId);
                            }
                            return false; // Don't show society-wide expenses for owner
                        });
                    } else {
                        activityExpenses = [];
                    }

                    // Filter meetings - show only meetings for current owner's wing
                    if (ownerWingId) {
                        meetings = meetings.filter(m => {
                            if (!m || m.is_deleted) return false;
                            return m.wing_id && Number(m.wing_id) === Number(ownerWingId);
                        });
                    } else {
                        meetings = [];
                    }
                } else {
                    // If owner_id not found, show empty data
                    owners = [];
                    rentals = [];
                    maintenanceDetails = [];
                    expenses = [];
                    activityPayments = [];
                    activityExpenses = [];
                    meetings = [];
                }
            }

            // Process filtered owners
            const activeOwners = owners.filter(o => !o.is_deleted);
            const totalOwners = activeOwners.length;

            // Process filtered rentals
            const activeRentals = rentals.filter(r => !r.is_deleted);
            const totalRentals = activeRentals.length;

            // Process filtered maintenance details
            const activeMaintenance = maintenanceDetails.filter(m => !m.is_deleted);

            let totalMaintenanceAmount = 0;
            let totalMaintenanceCollected = 0;
            let totalMaintenancePending = 0;

            activeMaintenance.forEach(m => {
                const total = Number(m.total_amount || 0);
                const paid = Number(m.paid_amount || 0);
                totalMaintenanceAmount += total;
                totalMaintenanceCollected += paid;
                totalMaintenancePending += (total - paid);
            });

            // Process filtered expenses
            const activeExpenses = expenses.filter(e => !e.is_deleted);
            const totalExpenseAmount = activeExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

            // Process filtered activity payments
            const activeActivityPayments = activityPayments.filter(ap => !ap.is_deleted);
            const totalActivityAmount = activeActivityPayments.reduce((sum, ap) => sum + Number(ap.amount || 0), 0);

            // Process filtered activity expenses
            const activeActivityExpenses = activityExpenses.filter(ae => !ae.is_deleted);
            const totalActivityExpenseAmount = activeActivityExpenses.reduce((sum, ae) => sum + Number(ae.amount || 0), 0);

            // Process filtered meetings
            const activeMeetings = meetings.filter(m => !m.is_deleted);
            const totalMeetings = activeMeetings.length;

            // Get unique flats count from filtered owners
            const uniqueFlats = new Set(activeOwners.map(o => o.flat_id).filter(Boolean));
            const totalFlats = uniqueFlats.size;

            setStats({
                totalOwners,
                totalRentals,
                totalMaintenanceAmount,
                totalExpenseAmount,
                totalActivityAmount,
                totalActivityExpenseAmount,
                totalMeetings,
                totalMaintenanceCollected,
                totalMaintenancePending,
                totalFlats,
            });

            setLoading(false);
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
            setLoading(false);
        }
    }, [currentUserWingId]);

    useEffect(() => {
        fetchDashboardData();
        
        // Set up periodic check for pending maintenance (every 5 minutes)
        const intervalId = setInterval(() => {
            fetchDashboardData();
        }, 5 * 60 * 1000); // 5 minutes

        return () => clearInterval(intervalId);
    }, [fetchDashboardData]);

    // Prepare data for pie charts
    const financialData = [
        { name: 'Maintenance Collected', value: stats.totalMaintenanceCollected },
        { name: 'Maintenance Pending', value: stats.totalMaintenancePending },
        { name: 'Total Expenses', value: stats.totalExpenseAmount },
        { name: 'Activity Expenses', value: stats.totalActivityExpenseAmount },
    ].filter(item => item.value > 0);

    const entityData = [
        { name: 'Owners', value: stats.totalOwners },
        { name: 'Rentals', value: stats.totalRentals },
        { name: 'Flats', value: stats.totalFlats },
        { name: 'Meetings', value: stats.totalMeetings },
    ].filter(item => item.value > 0);

    const formatCurrency = (amount) => {
        return `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{
                    backgroundColor: 'white',
                    padding: '10px',
                    border: '1px solid #ccc',
                    borderRadius: '5px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                    <p style={{ margin: 0, fontWeight: 'bold' }}>{payload[0].name}</p>
                    <p style={{ margin: '5px 0 0 0', color: payload[0].payload.payload?.name?.includes('Amount') || payload[0].payload.payload?.name?.includes('Expense') ? '#0088FE' : '#00C49F' }}>
                        {payload[0].payload.payload?.name?.includes('Amount') || payload[0].payload.payload?.name?.includes('Expense') || payload[0].payload.payload?.name?.includes('Collected') || payload[0].payload.payload?.name?.includes('Pending')
                            ? formatCurrency(payload[0].value)
                            : `${payload[0].value}`}
                    </p>
                </div>
            );
        }
        return null;
    };

    if (loading) {
        return (
            <div className="dashboard-content">
                <div style={{ textAlign: 'center', padding: '50px' }}>
                    <div style={{ fontSize: '24px', color: '#023e8a' }}>Loading dashboard data...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-content">
            <div className="welcome-section">
                <div className="welcome-content">
                    <div className="welcome-text">
                        <h2>Welcome {societyName || "Society"}! 👋</h2>
                        <div className="role-badge">{user?.role_type || "User"}</div>
                        <p>Here's an overview of your society management system.</p>
                    </div>
                    {societyLogo && (
                        <div className="welcome-logo">
                            <img 
                                src={societyLogo} 
                                alt={`${societyName || 'Society'} Logo`}
                                className="society-logo-dashboard"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Key Statistics Cards */}
            <div className="stats-grid">
                <div className="stat-card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                    <div className="stat-icon">👥</div>
                    <div className="stat-value">{stats.totalOwners}</div>
                    <div className="stat-label">Total Owners</div>
                </div>

                <div className="stat-card" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
                    <div className="stat-icon">🏠</div>
                    <div className="stat-value">{stats.totalRentals}</div>
                    <div className="stat-label">Total Rentals</div>
                </div>

                <div className="stat-card" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
                    <div className="stat-icon">🏘️</div>
                    <div className="stat-value">{stats.totalFlats}</div>
                    <div className="stat-label">Total Flats</div>
                </div>

                <div className="stat-card" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
                    <div className="stat-icon">💰</div>
                    <div className="stat-value">{formatCurrency(stats.totalMaintenanceAmount)}</div>
                    <div className="stat-label">Total Maintenance</div>
                </div>

                <div className="stat-card" style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }}>
                    <div className="stat-icon">💸</div>
                    <div className="stat-value">{formatCurrency(stats.totalExpenseAmount)}</div>
                    <div className="stat-label">Total Expenses</div>
                </div>

                <div className="stat-card" style={{ background: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)' }}>
                    <div className="stat-icon">🎯</div>
                    <div className="stat-value">{formatCurrency(stats.totalActivityAmount)}</div>
                    <div className="stat-label">Activity Payments Received</div>
                </div>

                <div className="stat-card" style={{ background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' }}>
                    <div className="stat-icon">📊</div>
                    <div className="stat-value">{formatCurrency(stats.totalActivityExpenseAmount)}</div>
                    <div className="stat-label">Activity Expenses</div>
                </div>

                <div className="stat-card" style={{ background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)' }}>
                    <div className="stat-icon">📅</div>
                    <div className="stat-value">{stats.totalMeetings}</div>
                    <div className="stat-label">Total Meetings</div>
                </div>
            </div>

            {/* Additional Financial Stats */}
            <div className="stats-grid" style={{ marginTop: '20px' }}>
                <div className="stat-card" style={{ background: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)' }}>
                    <div className="stat-icon">✅</div>
                    <div className="stat-value">{formatCurrency(stats.totalMaintenanceCollected)}</div>
                    <div className="stat-label">Maintenance Collected</div>
                </div>

                <div className="stat-card" style={{ background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)' }}>
                    <div className="stat-icon">⏳</div>
                    <div className="stat-value">{formatCurrency(stats.totalMaintenancePending)}</div>
                    <div className="stat-label">Maintenance Pending</div>
                </div>

                <div className="stat-card" style={{ background: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)' }}>
                    <div className="stat-icon">📈</div>
                    <div className="stat-value">{formatCurrency(stats.totalMaintenanceCollected - stats.totalExpenseAmount - stats.totalActivityExpenseAmount)}</div>
                    <div className="stat-label">Net Balance</div>
                </div>
            </div>

            {/* Pie Charts Section */}
            <div className="charts-section">
                <div className="chart-container">
                    <h3 className="chart-title">💰 Financial Overview</h3>
                    {financialData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={financialData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {financialData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '50px', color: '#999' }}>
                            No financial data available
                        </div>
                    )}
                </div>

                <div className="chart-container">
                    <h3 className="chart-title">📊 Entity Overview</h3>
                    {entityData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={entityData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {entityData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '50px', color: '#999' }}>
                            No entity data available
                        </div>
                    )}
                </div>
            </div>

            {/* Detailed Breakdown */}
            <div className="breakdown-section">
                <h3>📋 Detailed Breakdown</h3>
                <div className="breakdown-grid">
                    <div className="breakdown-card">
                        <h4>Maintenance Summary</h4>
                        <div className="breakdown-item">
                            <span>Total Amount:</span>
                            <strong>{formatCurrency(stats.totalMaintenanceAmount)}</strong>
                        </div>
                        <div className="breakdown-item">
                            <span>Collected:</span>
                            <strong style={{ color: '#00C49F' }}>{formatCurrency(stats.totalMaintenanceCollected)}</strong>
                        </div>
                        <div className="breakdown-item">
                            <span>Pending:</span>
                            <strong style={{ color: '#FF8042' }}>{formatCurrency(stats.totalMaintenancePending)}</strong>
                        </div>
                        <div className="breakdown-item">
                            <span>Collection Rate:</span>
                            <strong>
                                {stats.totalMaintenanceAmount > 0
                                    ? `${((stats.totalMaintenanceCollected / stats.totalMaintenanceAmount) * 100).toFixed(1)}%`
                                    : '0%'}
                            </strong>
                        </div>
                    </div>

                    <div className="breakdown-card">
                        <h4>Expense Summary</h4>
                        <div className="breakdown-item">
                            <span>Total Expenses:</span>
                            <strong>{formatCurrency(stats.totalExpenseAmount)}</strong>
                        </div>
                        <div className="breakdown-item">
                            <span>Activity Expenses:</span>
                            <strong>{formatCurrency(stats.totalActivityExpenseAmount)}</strong>
                        </div>
                        <div className="breakdown-item">
                            <span>Total Expenses:</span>
                            <strong>{formatCurrency(stats.totalExpenseAmount + stats.totalActivityExpenseAmount)}</strong>
                        </div>
                    </div>

                    <div className="breakdown-card">
                        <h4>Activity Summary</h4>
                        <div className="breakdown-item">
                            <span>Activity Payments Received:</span>
                            <strong>{formatCurrency(stats.totalActivityAmount)}</strong>
                        </div>
                        <div className="breakdown-item">
                            <span>Activity Expenses:</span>
                            <strong>{formatCurrency(stats.totalActivityExpenseAmount)}</strong>
                        </div>
                        <div className="breakdown-item">
                            <span>Net Activity Profit:</span>
                            <strong style={{ color: stats.totalActivityAmount - stats.totalActivityExpenseAmount >= 0 ? '#00C49F' : '#FF8042' }}>
                                {formatCurrency(stats.totalActivityAmount - stats.totalActivityExpenseAmount)}
                            </strong>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardContent;
