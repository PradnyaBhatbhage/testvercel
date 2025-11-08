import React, { useState } from "react";
import "../css/Sidebar.css";

const Sidebar = ({ isOpen, user, onMenuClick }) => {
    const [activeMenu, setActiveMenu] = useState(null);

    const toggleSubMenu = (label) => {
        setActiveMenu(activeMenu === label ? null : label);
    };

    const menuItems = [
        { label: "Home", icon: "🏠" },
        { label: "Society", icon: "🏢" },
        {
            label: "Flat Master", icon: "🏘️", subItems: [
                { label: "Flat Owner" },
                { label: "Rental Detail" }
            ]
        },
        { label: "Category", icon: "📂" },
        { label: "Meetings", icon: "🗓️" },
        {
            label: "Activity Data", icon: "🎯", subItems: [
                { label: "Activity Details" },
                { label: "Activity Payment" },
                { label: "Activity Expenses" }
            ]
        },
        { label: "Expenses", icon: "💵" },
        { label: "Maintenance", icon: "🧾" },
        {
            label: "Reports", icon: "📊", subItems: [
                { label: "Owner Report" },
                { label: "Maintenance Report" }
            ]
        },
        { label: "Settings", icon: "⚙️" },
    ];

    return (
        <div className={`sidebar ${isOpen ? "open" : "closed"}`}>
            <h3 className="sidebar-title">
                {user?.role_type === "Admin" ? "Admin Panel" : "User Panel"}
            </h3>
            <ul className="menu-list">
                {menuItems.map((item, idx) => (
                    <li key={idx}>
                        <div
                            className={`menu-item ${activeMenu === item.label ? "active" : ""}`}
                            onClick={() =>
                                item.subItems
                                    ? toggleSubMenu(item.label)
                                    : onMenuClick(item.label)
                            }
                        >
                            <span className="icon">{item.icon}</span>
                            <span className="label">{item.label}</span>

                            {/* Clean arrow style */}
                            {item.subItems && (
                                <span
                                    className={`arrow ${activeMenu === item.label ? "rotate" : ""}`}
                                >
                                    ▶
                                </span>
                            )}
                        </div>

                        {/* Submenu */}
                        {item.subItems && (
                            <ul
                                className={`submenu ${activeMenu === item.label ? "show" : ""}`}
                            >
                                {item.subItems.map((sub, subIdx) => (
                                    <li
                                        key={subIdx}
                                        onClick={() => onMenuClick(sub.label)}
                                        className="submenu-item"
                                    >
                                        {sub.label}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default Sidebar;
