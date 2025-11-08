import React from "react";
import "../css/Navbar.css";

const Navbar = ({ user, onLogout, toggleSidebar }) => {
    return (
        <nav className="navbar">
            <div className="navbar-left">
                <button className="menu-btn" onClick={toggleSidebar}>
                    ☰
                </button>
                <h2>SocietySync Dashboard</h2>
            </div>
            <div className="navbar-right">
                <span className="user-info">{user?.user_name || "Guest"}</span>
                <button className="logout-btn" onClick={onLogout}>
                    Logout
                </button>
            </div>
        </nav>
    );
};

export default Navbar;
