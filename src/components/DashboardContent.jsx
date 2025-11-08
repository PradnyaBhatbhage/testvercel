import React from "react";
import "../css/DashboardContent.css";

const DashboardContent = ({ user }) => {
    return (
        <div className="dashboard-content">
            <h2>Welcome, {user?.user_name || "Guest"}!</h2>
            <p>Role: {user?.role_type}</p>
            <p>This is your dashboard. Use the sidebar to navigate.</p>
        </div>
    );
};

export default DashboardContent;
