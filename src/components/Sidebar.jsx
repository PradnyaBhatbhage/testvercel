import React, { useState, useMemo } from "react";
import "../css/Sidebar.css";
import {
    hasModuleAccess,
    canManageDelegations
} from "../utils/permissionChecker";

const Sidebar = ({ isOpen, user, onMenuClick, activeDelegations = [] }) => {
    const [activeMenu, setActiveMenu] = useState(null);

    const toggleSubMenu = (label) => {
        setActiveMenu(activeMenu === label ? null : label);
    };

    // Filter menu items based on permissions
    const menuItems = useMemo(() => {
        const isAdminOrSecretary = canManageDelegations();
        const isOwner = user?.role_type?.toLowerCase() === "owner";

        const allMenuItems = [
            { label: "Home", icon: "🏠", alwaysVisible: true },
            { label: "Society", icon: "🏢", moduleId: "society" },
            {
                label: "Flat Master", icon: "🏘️",
                subItems: [
                    { label: "Flat Owner", moduleId: "flat_owner" },
                    { label: "Rental Detail", moduleId: "rental_detail" }
                ]
            },
            { label: "Category", icon: "📂", moduleId: "category", hideForOwner: true },
            { label: "Meetings", icon: "🗓️", moduleId: "meetings", hideForOwner: true },
            {
                label: "Activity Data", icon: "🎯",
                subItems: [
                    { label: "Activity Details", moduleId: "activity_details" },
                    { label: "Activity Payment", moduleId: "activity_payment" },
                    { label: "Activity Expenses", moduleId: "activity_expenses" }
                ]
            },
            { label: "Expenses", icon: "💵", moduleId: "expenses" },
            {
                label: "Maintenance", icon: "🧾",
                subItems: [
                    { label: "Maintenance Component", moduleId: "maintenance_component", hideForOwner: true },
                    { label: "Maintenance Rate", moduleId: "maintenance_rate", hideForOwner: true },
                    { label: "Maintenance Detail", moduleId: "maintenance_detail" },
                ]
            },
            { label: "Complaint Box", icon: "📋", moduleId: "complaint_box" },
            { label: "Parking Details", icon: "🚗", moduleId: "parking_details" },
            { label: "Announcements", icon: "📢", alwaysVisible: true },
            {
                label: "Reports", icon: "📊",
                subItems: [
                    { label: "Owner Report" },
                    { label: "Maintenance Report" },
                    { label: "Expense Report" },
                    { label: "Rental Report" },
                    { label: "Meeting Report" },
                    { label: "Complete Report" }
                ],
                alwaysVisible: false, // Reports can be restricted if needed
                hideForOwner: true
            },
            { label: "Role Assignment", icon: "👥", requiresAdmin: true },
            { label: "Settings", icon: "⚙️", alwaysVisible: true },
        ];

        // Filter and map menu items based on permissions
        return allMenuItems
            .map(item => {
                // Hide items marked for Owner
                if (isOwner && item.hideForOwner) {
                    return null;
                }

                // Always show Home and Settings
                if (item.alwaysVisible) return item;

                // Role Assignment only for Admin/Secretary
                if (item.requiresAdmin) {
                    return isAdminOrSecretary ? item : null;
                }

                // For items with subItems, check if at least one subItem is accessible
                if (item.subItems) {
                    const accessibleSubItems = item.subItems.filter(subItem => {
                        // Hide subItems marked for Owner
                        if (isOwner && subItem.hideForOwner) {
                            return false;
                        }
                        if (!subItem.moduleId) return true; // Show if no module restriction
                        return isAdminOrSecretary || hasModuleAccess(subItem.moduleId, activeDelegations);
                    });

                    // Only show parent if it has accessible subItems
                    if (accessibleSubItems.length > 0) {
                        // Create a new item object with filtered subItems
                        return { ...item, subItems: accessibleSubItems };
                    }
                    return null;
                }

                // For regular items, check module access
                if (item.moduleId) {
                    return (isAdminOrSecretary || hasModuleAccess(item.moduleId, activeDelegations)) ? item : null;
                }

                // Default: show if no restrictions
                return item;
            })
            .filter(item => item !== null); // Remove null items
    }, [activeDelegations, user]);

    return (
        <div className={`sidebar ${isOpen ? "open" : "closed"}`}>
            <h3 className="sidebar-title">
                {user?.role_type?.toLowerCase() === "admin" ? "Admin Panel" :
                    user?.role_type?.toLowerCase() === "owner" ? "Owner Panel" : "User Panel"}
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
