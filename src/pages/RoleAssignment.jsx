import React, { useState, useEffect, useCallback } from "react";
import {
    getUsers,
    createRoleDelegation,
    getRoleDelegations,
    updateRoleDelegation,
    revokeRoleDelegation,
} from "../services/api";
import "../css/RoleAssignment.css";

const RoleAssignment = () => {
    const user = JSON.parse(localStorage.getItem("user"));
    const [users, setUsers] = useState([]);
    const [delegations, setDelegations] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [search, setSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Available modules/permissions
    const availableModules = [
        { id: "society", label: "Society", description: "Manage society information" },
        { id: "flat_owner", label: "Flat Owner", description: "Manage flat owners" },
        { id: "rental_detail", label: "Rental Detail", description: "Manage rental details" },
        { id: "category", label: "Category", description: "Manage categories" },
        { id: "meetings", label: "Meetings", description: "Manage meetings" },
        { id: "activity_details", label: "Activity Details", description: "Manage activity details" },
        { id: "activity_payment", label: "Activity Payment", description: "Manage activity payments" },
        { id: "activity_expenses", label: "Activity Expenses", description: "Manage activity expenses" },
        { id: "expenses", label: "Expenses", description: "Manage expenses" },
        { id: "maintenance_component", label: "Maintenance Component", description: "Manage maintenance components" },
        { id: "maintenance_rate", label: "Maintenance Rate", description: "Manage maintenance rates" },
        { id: "maintenance_detail", label: "Maintenance Detail", description: "Manage maintenance details" },
    ];

    const [form, setForm] = useState({
        delegated_to_user_id: "",
        delegated_to_user_name: "",
        start_date: "",
        end_date: "",
        permissions: [],
        reason: "",
        is_active: true,
    });

    const fetchUsers = useCallback(async () => {
        try {
            const res = await getUsers();
            // Backend returns { data: [...] }, so we need res.data.data
            const usersData = res.data?.data || res.data || [];
            const usersArray = Array.isArray(usersData) ? usersData : [];

            // Filter out current user and only show users with role 'user' or 'secretary' (case-insensitive)
            const filteredUsers = usersArray.filter((u) => {
                if (u.user_id === user?.user_id) return false;
                const roleType = (u.role_type || "").toLowerCase();
                return roleType === "user" || roleType === "secretary";
            });
            setUsers(filteredUsers);
        } catch (err) {
            console.error("Error fetching users:", err);
            console.error("Error response:", err.response);
            console.error("Error message:", err.message);

            // Extract error message properly
            let errorMessage = "Unknown error";
            if (err.response?.data) {
                if (typeof err.response.data === 'string') {
                    errorMessage = err.response.data;
                } else if (err.response.data.error) {
                    errorMessage = typeof err.response.data.error === 'string'
                        ? err.response.data.error
                        : JSON.stringify(err.response.data.error);
                } else if (err.response.data.message) {
                    errorMessage = err.response.data.message;
                } else {
                    errorMessage = JSON.stringify(err.response.data);
                }
            } else if (err.message) {
                errorMessage = err.message;
            }

            alert(`Error fetching users: ${errorMessage}`);
            setUsers([]); // Set empty array on error
        }
    }, [user]);

    const fetchDelegations = useCallback(async () => {
        try {
            const res = await getRoleDelegations();
            // Backend returns { data: [...] }, so we need res.data.data
            const delegationsData = res.data?.data || res.data || [];
            setDelegations(Array.isArray(delegationsData) ? delegationsData : []);
        } catch (err) {
            console.error("Error fetching delegations:", err);
            setDelegations([]); // Set empty array on error
        }
    }, []);

    useEffect(() => {
        fetchUsers();
        fetchDelegations();
    }, [fetchUsers, fetchDelegations]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === "delegated_to_user_id") {
            const selectedUser = users.find((u) => u.user_id === parseInt(value));
            setForm({
                ...form,
                delegated_to_user_id: value,
                delegated_to_user_name: selectedUser ? selectedUser.user_name : "",
            });
        } else {
            setForm({ ...form, [name]: value });
        }
    };

    const handlePermissionChange = (moduleId) => {
        const updatedPermissions = form.permissions.includes(moduleId)
            ? form.permissions.filter((p) => p !== moduleId)
            : [...form.permissions, moduleId];
        setForm({ ...form, permissions: updatedPermissions });
    };

    const handleSelectAll = () => {
        if (form.permissions.length === availableModules.length) {
            setForm({ ...form, permissions: [] });
        } else {
            setForm({ ...form, permissions: availableModules.map((m) => m.id) });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.delegated_to_user_id) {
            alert("Please select a user to delegate to");
            return;
        }

        if (form.permissions.length === 0) {
            alert("Please select at least one permission");
            return;
        }

        if (!form.start_date || !form.end_date) {
            alert("Please select start and end dates");
            return;
        }

        if (new Date(form.start_date) >= new Date(form.end_date)) {
            alert("End date must be after start date");
            return;
        }

        try {
            const delegationData = {
                ...form,
                delegated_by_user_id: user.user_id,
                delegated_by_user_name: user.user_name,
            };

            if (editingId) {
                await updateRoleDelegation(editingId, delegationData);
                alert("Delegation updated successfully");
            } else {
                await createRoleDelegation(delegationData);
                alert("Role delegation created successfully");
            }

            clearForm();
            fetchDelegations();
        } catch (err) {
            console.error("Error saving delegation:", err);
            alert(err.response?.data?.message || "Error saving delegation");
        }
    };

    const handleEdit = (delegation) => {
        setForm({
            delegated_to_user_id: delegation.delegated_to_user_id,
            delegated_to_user_name: delegation.delegated_to_user_name,
            start_date: delegation.start_date ? delegation.start_date.split("T")[0] : "",
            end_date: delegation.end_date ? delegation.end_date.split("T")[0] : "",
            permissions: delegation.permissions || [],
            reason: delegation.reason || "",
            is_active: delegation.is_active !== false,
        });
        setEditingId(delegation.delegation_id);
        setShowForm(true);
    };

    const handleRevoke = async (id) => {
        if (!window.confirm("Are you sure you want to revoke this delegation?")) {
            return;
        }

        try {
            await revokeRoleDelegation(id);
            alert("Delegation revoked successfully");
            fetchDelegations();
        } catch (err) {
            console.error("Error revoking delegation:", err);
            alert("Error revoking delegation");
        }
    };

    const clearForm = () => {
        setForm({
            delegated_to_user_id: "",
            delegated_to_user_name: "",
            start_date: "",
            end_date: "",
            permissions: [],
            reason: "",
            is_active: true,
        });
        setEditingId(null);
        setShowForm(false);
    };

    const isDelegationActive = (delegation) => {
        if (!delegation.is_active) return false;
        const now = new Date();
        const startDate = new Date(delegation.start_date);
        const endDate = new Date(delegation.end_date);
        return now >= startDate && now <= endDate;
    };

    // Ensure delegations is always an array
    const delegationsArray = Array.isArray(delegations) ? delegations : [];

    const filteredDelegations = delegationsArray.filter((d) => {
        const searchLower = search.toLowerCase();
        return (
            d.delegated_to_user_name?.toLowerCase().includes(searchLower) ||
            d.delegated_by_user_name?.toLowerCase().includes(searchLower) ||
            d.reason?.toLowerCase().includes(searchLower)
        );
    });

    // Pagination logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentDelegations = filteredDelegations.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredDelegations.length / itemsPerPage);

    // Reset to page 1 when search changes
    React.useEffect(() => {
        setCurrentPage(1);
    }, [search]);

    // Check if current user can manage delegations
    // Support both "Admin" and "admin" for flexibility
    const canManageDelegations =
        user?.role_type === "Admin" ||
        user?.role_type === "admin" ||
        user?.role_type === "secretary" ||
        user?.role_type === "Secretary";

    if (!canManageDelegations) {
        return (
            <div className="role-assignment-container">
                <div className="access-denied">
                    <h2>Access Denied</h2>
                    <p>You do not have permission to manage role delegations.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="role-assignment-container">
            <div className="role-assignment-header">
                <h2>Role Assignment & Delegation</h2>
            </div>

            {/* Controls (New Entry + Search) - Only show when form is not visible */}
            {!showForm && (
                <div className="role-assignment-controls">
                    <button className="new-entry-btn" onClick={() => setShowForm(true)}>
                        New Entry
                    </button>
                    <div className="search-bar">
                        <input
                            type="text"
                            placeholder="Search by user name or reason..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
            )}

            {/* Form */}
            {showForm && (
                <form className="delegation-form" onSubmit={handleSubmit}>
                    <h3>{editingId ? "Edit Delegation" : "Create New Delegation"}</h3>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Delegate To User *</label>
                            <select
                                name="delegated_to_user_id"
                                value={form.delegated_to_user_id}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Select User</option>
                                {users.map((u) => (
                                    <option key={u.user_id} value={u.user_id}>
                                        {u.user_name} ({u.role_type})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Start Date *</label>
                            <input
                                type="date"
                                name="start_date"
                                value={form.start_date}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>End Date *</label>
                            <input
                                type="date"
                                name="end_date"
                                value={form.end_date}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Reason for Delegation</label>
                        <textarea
                            name="reason"
                            value={form.reason}
                            onChange={handleChange}
                            placeholder="Enter reason for delegation (e.g., temporary absence, vacation, etc.)"
                            rows="3"
                        />
                    </div>

                    <div className="permissions-section">
                        <div className="permissions-header">
                            <label>Select Permissions (Modules) *</label>
                            <button
                                type="button"
                                className="select-all-btn"
                                onClick={handleSelectAll}
                            >
                                {form.permissions.length === availableModules.length
                                    ? "Deselect All"
                                    : "Select All"}
                            </button>
                        </div>

                        <div className="permissions-grid">
                            {availableModules.map((module) => (
                                <div key={module.id} className="permission-item">
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={form.permissions.includes(module.id)}
                                            onChange={() => handlePermissionChange(module.id)}
                                        />
                                        <span className="permission-label">{module.label}</span>
                                        <span className="permission-desc">{module.description}</span>
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="form-actions">
                        <button type="submit" className="submit-btn">
                            {editingId ? "Update Delegation" : "Create Delegation"}
                        </button>
                        <button type="button" className="cancel-btn" onClick={clearForm}>
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            {/* Delegations List */}
            {!showForm && (
                <div className="delegations-table-container">
                    <table className="delegations-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Delegated To</th>
                                <th>Delegated By</th>
                                <th>Start Date</th>
                                <th>End Date</th>
                                <th>Permissions</th>
                                <th>Status</th>
                                <th>Reason</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredDelegations.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="no-data">
                                        No delegations found
                                    </td>
                                </tr>
                            ) : (
                                currentDelegations.map((d) => {
                                    const isActive = isDelegationActive(d);
                                    return (
                                        <tr key={d.delegation_id} className={!d.is_active ? "revoked" : ""}>
                                            <td>{d.delegation_id}</td>
                                            <td>{d.delegated_to_user_name}</td>
                                            <td>{d.delegated_by_user_name}</td>
                                            <td>{new Date(d.start_date).toLocaleDateString()}</td>
                                            <td>{new Date(d.end_date).toLocaleDateString()}</td>
                                            <td>
                                                <div className="permissions-list">
                                                    {(d.permissions || []).slice(0, 3).map((p) => (
                                                        <span key={p} className="permission-badge">
                                                            {availableModules.find((m) => m.id === p)?.label || p}
                                                        </span>
                                                    ))}
                                                    {(d.permissions || []).length > 3 && (
                                                        <span className="permission-badge more">
                                                            +{(d.permissions || []).length - 3} more
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <span
                                                    className={`status-badge ${!d.is_active
                                                        ? "revoked"
                                                        : isActive
                                                            ? "active"
                                                            : "inactive"
                                                        }`}
                                                >
                                                    {!d.is_active
                                                        ? "Revoked"
                                                        : isActive
                                                            ? "Active"
                                                            : "Inactive"}
                                                </span>
                                            </td>
                                            <td className="reason-cell">{d.reason || "-"}</td>
                                            <td>
                                                <div className="action-buttons">
                                                    <button
                                                        onClick={() => handleEdit(d)}
                                                        className="edit-btn"
                                                        title="Edit"
                                                    >
                                                        Edit ✏️
                                                    </button>
                                                    {d.is_active && (
                                                        <button
                                                            onClick={() => handleRevoke(d.delegation_id)}
                                                            className="revoke-btn"
                                                            title="Revoke"
                                                        >
                                                            Revoke 🚫
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                    {totalPages > 1 && (
                        <div className="pagination">
                            <button disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)}>⟸ Prev</button>
                            <span>Page {currentPage} of {totalPages}</span>
                            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(currentPage + 1)}>Next ⟹</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default RoleAssignment;

