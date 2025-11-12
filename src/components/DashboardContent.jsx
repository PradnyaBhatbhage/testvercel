import React from "react";
import "../css/DashboardContent.css";

const DashboardContent = ({ user }) => {
    return (
        <div className="dashboard-content">
            <div className="welcome-section">
                <h2>Welcome, {user?.user_name || "Guest"}!</h2>
                <div className="role-badge">{user?.role_type}</div>
                <p>This is your dashboard. Use the sidebar to navigate through different sections.</p>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-value">12</div>
                    <div className="stat-label">Total Flats</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">8</div>
                    <div className="stat-label">Active Activities</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">5</div>
                    <div className="stat-label">Pending Payments</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">3</div>
                    <div className="stat-label">Upcoming Meetings</div>
                </div>
            </div>
        </div>
    );
};

export default DashboardContent;
