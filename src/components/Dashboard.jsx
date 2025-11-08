import React, { useState } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import SocietyForm from "../pages/SocietyForm";
import "../css/Dashboard.css";
import FlatOwner from "../pages/FlatOwner";
import RentalDetail from "../pages/RentalDetail";
import Category from "../pages/Category";
import Meeting from "../pages/Meeting";
import Activity from "../pages/Activity";
import ActivityPayment from "../pages/ActivityPayment";
import ActivityExpense from "../pages/ActivityExpense";
import ExpenseEntry from "../pages/ExpenseEntry";

const Dashboard = () => {
    const user = JSON.parse(localStorage.getItem("user"));
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [activeMenu, setActiveMenu] = useState("Home"); // track which menu is active

    const handleLogout = () => {
        localStorage.removeItem("user");
        window.location.href = "/login";
    };

    const renderContent = () => {
        switch (activeMenu) {
            case "Society":
                return <SocietyForm />; // show society form
            case "Flat Owner":
                return <FlatOwner />;
            case "Rental Detail":
                return <RentalDetail />;
            case "Category":
                return <Category />;
            case "Meetings":
                return <Meeting />
            case "Activity Details":
                return <Activity />;
            case "Activity Payment":
                return <ActivityPayment />;
            case "Activity Expenses":
                return <ActivityExpense />;
            case "Expenses":
                return <ExpenseEntry />;
            case "Home":
                return (
                    <>
                        <h2>Welcome, {user?.user_name || "Guest"}!</h2>
                        <p>Role: {user?.role_type}</p>
                        <p>This is your dashboard. Use the sidebar to navigate.</p>
                    </>
                );
            default:
                return <p>Module "{activeMenu}" is under construction.</p>;
        }
    };

    return (
        <div className="dashboard-container">
            <Navbar
                user={user}
                onLogout={handleLogout}
                toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            />
            <div className="main-section">
                <Sidebar isOpen={sidebarOpen} user={user} onMenuClick={setActiveMenu} />
                <div className={`content-section ${sidebarOpen ? "sidebar-open" : ""}`}>
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
