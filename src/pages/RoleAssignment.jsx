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
    const [user, setUser] = useState(null);
    const [users, setUsers] = useState([]);
    const [delegations, setDelegations] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [search, setSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [usersLoading, setUsersLoading] = useState(true);
    const [delegationsLoading, setDelegationsLoading] = useState(true);
    const [error, setError] = useState("");
    const [mounted, setMounted] = useState(false);
    const itemsPerPage = 10;

    // Load user from localStorage once on mount
    useEffect(() => {
        try {
            const userStr = localStorage.getItem("user");
            if (userStr) {
                const parsedUser = JSON.parse(userStr);
                setUser(parsedUser);
                console.log('✅ [RoleAssignment] User loaded from localStorage:', parsedUser.user_id);
            } else {
                console.warn('⚠️ [RoleAssignment] No user found in localStorage');
                setUser(null);
            }
            setMounted(true);
        } catch (err) {
            console.error('❌ [RoleAssignment] Error parsing user from localStorage:', err);
            setUser(null);
            setMounted(true);
        }
    }, []);

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
            // Get current user from state
            const currentUser = user;
            
            console.log('🔄 [RoleAssignment] fetchUsers - Starting to fetch users...', {
                currentUserId: currentUser?.user_id
            });
            setUsersLoading(true);
            setError("");

            const res = await getUsers();
            
            console.log('📊 [RoleAssignment] fetchUsers - API Response:', {
                status: res.status,
                statusText: res.statusText,
                data: res.data,
                dataType: typeof res.data,
                isArray: Array.isArray(res.data),
                hasDataProperty: !!res.data?.data
            });

            // Ensure we have valid data
            if (!res || !res.data) {
                console.error('❌ [RoleAssignment] fetchUsers - Invalid response structure:', res);
                throw new Error('Invalid response from server');
            }

            // Handle different response structures
            let usersData = [];
            if (Array.isArray(res.data)) {
                usersData = res.data;
            } else if (res.data && Array.isArray(res.data.data)) {
                usersData = res.data.data;
            } else if (res.data && typeof res.data === 'object') {
                // Try to find array property
                const arrayKey = Object.keys(res.data).find(key => Array.isArray(res.data[key]));
                if (arrayKey) {
                    usersData = res.data[arrayKey];
                } else {
                    console.warn('⚠️ [RoleAssignment] fetchUsers - Response data is not an array:', res.data);
                    usersData = [];
                }
            } else {
                console.warn('⚠️ [RoleAssignment] fetchUsers - Unexpected data type:', typeof res.data);
                usersData = [];
            }

            // Final validation
            if (!Array.isArray(usersData)) {
                console.error('❌ [RoleAssignment] fetchUsers - usersData is not an array after processing:', usersData);
                usersData = [];
            }

            console.log('✅ [RoleAssignment] fetchUsers - Raw users loaded:', usersData.length);

            // Filter out current user and only show users with role 'user' or 'secretary' (case-insensitive)
            const filteredUsers = usersData.filter((u) => {
                try {
                    if (!u || !u.user_id) return false;
                    if (currentUser && u.user_id === currentUser.user_id) return false;
                    const roleType = String(u.role_type || "").toLowerCase();
                    return roleType === "user" || roleType === "secretary";
                } catch (err) {
                    console.error('❌ [RoleAssignment] fetchUsers - Error filtering user:', err, u);
                    return false;
                }
            });

            console.log('✅ [RoleAssignment] fetchUsers - Filtered users:', filteredUsers.length);
            setUsers(filteredUsers);
            setUsersLoading(false);
        } catch (err) {
            console.error('❌ [RoleAssignment] fetchUsers - Error:', {
                message: err.message,
                name: err.name,
                code: err.code,
                response: err.response?.data,
                status: err.response?.status,
                statusText: err.response?.statusText,
                url: err.config?.url,
                method: err.config?.method,
                stack: err.stack
            });

            setUsersLoading(false);
            setUsers([]);

            // Handle different error types
            let errorMessage = "Unknown error";
            if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
                errorMessage = "Network Error: Cannot connect to server. Please check your internet connection and ensure the backend server is running.";
            } else if (err.response?.status === 403) {
                errorMessage = "Access Forbidden: You don't have permission to access this resource. Please check CORS configuration or authentication.";
            } else if (err.response?.status === 401) {
                errorMessage = "Unauthorized: Please log in again.";
            } else if (err.response?.status === 500) {
                errorMessage = "Server Error: The server encountered an error. Please try again later.";
            } else if (err.response?.data) {
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

            setError(`Error fetching users: ${errorMessage}`);
            alert(`Error fetching users: ${errorMessage}`);
        }
    }, [user]); // Keep user dependency but it's now stable after mount

    const fetchDelegations = useCallback(async () => {
        try {
            console.log('🔄 [RoleAssignment] fetchDelegations - Starting to fetch delegations...');
            setDelegationsLoading(true);
            setError("");

            const res = await getRoleDelegations();
            
            console.log('📊 [RoleAssignment] fetchDelegations - API Response:', {
                status: res.status,
                statusText: res.statusText,
                data: res.data,
                dataType: typeof res.data,
                isArray: Array.isArray(res.data),
                hasDataProperty: !!res.data?.data
            });

            // Ensure we have valid data
            if (!res || !res.data) {
                console.error('❌ [RoleAssignment] fetchDelegations - Invalid response structure:', res);
                throw new Error('Invalid response from server');
            }

            // Handle different response structures
            let delegationsData = [];
            if (Array.isArray(res.data)) {
                delegationsData = res.data;
            } else if (res.data && Array.isArray(res.data.data)) {
                delegationsData = res.data.data;
            } else if (res.data && typeof res.data === 'object') {
                // Try to find array property
                const arrayKey = Object.keys(res.data).find(key => Array.isArray(res.data[key]));
                if (arrayKey) {
                    delegationsData = res.data[arrayKey];
                } else {
                    console.warn('⚠️ [RoleAssignment] fetchDelegations - Response data is not an array:', res.data);
                    delegationsData = [];
                }
            } else {
                console.warn('⚠️ [RoleAssignment] fetchDelegations - Unexpected data type:', typeof res.data);
                delegationsData = [];
            }

            // Final validation
            if (!Array.isArray(delegationsData)) {
                console.error('❌ [RoleAssignment] fetchDelegations - delegationsData is not an array after processing:', delegationsData);
                delegationsData = [];
            }

            console.log('✅ [RoleAssignment] fetchDelegations - Delegations loaded:', delegationsData.length);
            setDelegations(delegationsData);
            setDelegationsLoading(false);
        } catch (err) {
            console.error('❌ [RoleAssignment] fetchDelegations - Error:', {
                message: err.message,
                name: err.name,
                code: err.code,
                response: err.response?.data,
                status: err.response?.status,
                statusText: err.response?.statusText,
                url: err.config?.url,
                method: err.config?.method,
                stack: err.stack
            });

            setDelegationsLoading(false);
            setDelegations([]);

            // Handle different error types
            let errorMessage = "Unknown error";
            if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
                errorMessage = "Network Error: Cannot connect to server. Please check your internet connection and ensure the backend server is running.";
            } else if (err.response?.status === 403) {
                errorMessage = "Access Forbidden: You don't have permission to access this resource. Please check CORS configuration or authentication.";
            } else if (err.response?.status === 401) {
                errorMessage = "Unauthorized: Please log in again.";
            } else if (err.response?.status === 500) {
                errorMessage = "Server Error: The server encountered an error. Please try again later.";
            } else if (err.response?.data) {
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

            setError(`Error fetching delegations: ${errorMessage}`);
            // Don't show alert for delegations to avoid multiple alerts
            console.warn('⚠️ [RoleAssignment] fetchDelegations - Error (silent):', errorMessage);
        }
    }, []);

    // Fetch data only once when component mounts and user is loaded
    useEffect(() => {
        if (!mounted) return; // Wait for user to be loaded
        
        let isMounted = true;
        
        const fetchData = async () => {
            if (!isMounted) return;
            console.log('🔄 [RoleAssignment] useEffect - Fetching data...');
            await fetchUsers();
            if (isMounted) {
                await fetchDelegations();
            }
        };
        
        fetchData();
        
        return () => {
            isMounted = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mounted]); // Only depend on mounted, not on the callbacks

    const handleChange = (e) => {
        try {
            const { name, value } = e.target;
            console.log('📝 [RoleAssignment] handleChange:', { name, value });
            
            if (name === "delegated_to_user_id") {
                const selectedUser = users.find((u) => {
                    try {
                        return u.user_id === parseInt(value);
                    } catch (err) {
                        console.error('❌ [RoleAssignment] handleChange - Error parsing user_id:', err);
                        return false;
                    }
                });
                setForm({
                    ...form,
                    delegated_to_user_id: value,
                    delegated_to_user_name: selectedUser ? selectedUser.user_name : "",
                });
            } else {
                setForm({ ...form, [name]: value });
            }
            setError(""); // Clear error on input change
        } catch (err) {
            console.error('❌ [RoleAssignment] handleChange - Error:', err);
        }
    };

    const handlePermissionChange = (moduleId) => {
        try {
            const updatedPermissions = form.permissions.includes(moduleId)
                ? form.permissions.filter((p) => p !== moduleId)
                : [...form.permissions, moduleId];
            setForm({ ...form, permissions: updatedPermissions });
        } catch (err) {
            console.error('❌ [RoleAssignment] handlePermissionChange - Error:', err);
        }
    };

    const handleSelectAll = () => {
        try {
            if (form.permissions.length === availableModules.length) {
                setForm({ ...form, permissions: [] });
            } else {
                setForm({ ...form, permissions: availableModules.map((m) => m.id) });
            }
        } catch (err) {
            console.error('❌ [RoleAssignment] handleSelectAll - Error:', err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            console.log('🔄 [RoleAssignment] handleSubmit - Starting form submission...', {
                editingId,
                form: { ...form, permissions: form.permissions.length }
            });

            setLoading(true);
            setError("");

            // Validation
            if (!form.delegated_to_user_id) {
                console.error('❌ [RoleAssignment] handleSubmit - Validation failed: delegated_to_user_id is required');
                setError("Please select a user to delegate to");
                alert("Please select a user to delegate to");
                setLoading(false);
                return;
            }

            if (form.permissions.length === 0) {
                console.error('❌ [RoleAssignment] handleSubmit - Validation failed: permissions are required');
                setError("Please select at least one permission");
                alert("Please select at least one permission");
                setLoading(false);
                return;
            }

            if (!form.start_date || !form.end_date) {
                console.error('❌ [RoleAssignment] handleSubmit - Validation failed: dates are required');
                setError("Please select start and end dates");
                alert("Please select start and end dates");
                setLoading(false);
                return;
            }

            const startDate = new Date(form.start_date);
            const endDate = new Date(form.end_date);
            
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                console.error('❌ [RoleAssignment] handleSubmit - Validation failed: invalid dates');
                setError("Invalid date format");
                alert("Invalid date format");
                setLoading(false);
                return;
            }

            if (startDate >= endDate) {
                console.error('❌ [RoleAssignment] handleSubmit - Validation failed: end date must be after start date');
                setError("End date must be after start date");
                alert("End date must be after start date");
                setLoading(false);
                return;
            }

            if (!user || !user.user_id) {
                console.error('❌ [RoleAssignment] handleSubmit - Validation failed: user not found');
                setError("User information not found. Please log in again.");
                alert("User information not found. Please log in again.");
                setLoading(false);
                return;
            }

            const delegationData = {
                ...form,
                delegated_by_user_id: user.user_id,
                delegated_by_user_name: user.user_name || "Unknown",
            };

            console.log('📡 [RoleAssignment] handleSubmit - Sending delegation data...', {
                ...delegationData,
                permissions: delegationData.permissions.length
            });

            if (editingId) {
                try {
                    console.log('🔄 [RoleAssignment] handleSubmit - Updating delegation...', editingId);
                    const res = await updateRoleDelegation(editingId, delegationData);
                    console.log('📊 [RoleAssignment] handleSubmit - Update response:', res.data);
                    console.log('✅ [RoleAssignment] handleSubmit - Delegation updated successfully');
                    alert("Delegation updated successfully");
                } catch (err) {
                    console.error('❌ [RoleAssignment] handleSubmit - Error updating delegation:', {
                        message: err.message,
                        response: err.response?.data,
                        status: err.response?.status,
                        stack: err.stack
                    });
                    const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message || "Error updating delegation";
                    setError(errorMsg);
                    alert(errorMsg);
                    setLoading(false);
                    return;
                }
            } else {
                try {
                    console.log('🔄 [RoleAssignment] handleSubmit - Creating delegation...');
                    const res = await createRoleDelegation(delegationData);
                    console.log('📊 [RoleAssignment] handleSubmit - Create response:', res.data);
                    console.log('✅ [RoleAssignment] handleSubmit - Role delegation created successfully');
                    alert("Role delegation created successfully");
                } catch (err) {
                    console.error('❌ [RoleAssignment] handleSubmit - Error creating delegation:', {
                        message: err.message,
                        response: err.response?.data,
                        status: err.response?.status,
                        stack: err.stack
                    });
                    const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message || "Error creating delegation";
                    setError(errorMsg);
                    alert(errorMsg);
                    setLoading(false);
                    return;
                }
            }

            clearForm();
            await fetchDelegations();
            setLoading(false);
        } catch (err) {
            console.error('❌ [RoleAssignment] handleSubmit - Unexpected error:', {
                message: err.message,
                stack: err.stack,
                name: err.name
            });
            setLoading(false);
            const errorMsg = err.message || "An unexpected error occurred";
            setError(errorMsg);
            alert("Error: " + errorMsg);
        }
    };

    const handleEdit = (delegation) => {
        try {
            console.log('🔄 [RoleAssignment] handleEdit - Loading delegation for edit:', {
                delegation_id: delegation.delegation_id
            });

            if (!delegation) {
                console.error('❌ [RoleAssignment] handleEdit - No delegation provided');
                alert("Invalid delegation data");
                return;
            }

            // Safely parse dates
            let startDate = "";
            let endDate = "";
            
            try {
                if (delegation.start_date) {
                    const date = new Date(delegation.start_date);
                    if (!isNaN(date.getTime())) {
                        startDate = date.toISOString().split("T")[0];
                    }
                }
            } catch (err) {
                console.error('❌ [RoleAssignment] handleEdit - Error parsing start_date:', err);
            }

            try {
                if (delegation.end_date) {
                    const date = new Date(delegation.end_date);
                    if (!isNaN(date.getTime())) {
                        endDate = date.toISOString().split("T")[0];
                    }
                }
            } catch (err) {
                console.error('❌ [RoleAssignment] handleEdit - Error parsing end_date:', err);
            }

            setForm({
                delegated_to_user_id: String(delegation.delegated_to_user_id || ""),
                delegated_to_user_name: String(delegation.delegated_to_user_name || ""),
                start_date: startDate,
                end_date: endDate,
                permissions: Array.isArray(delegation.permissions) ? delegation.permissions : [],
                reason: String(delegation.reason || ""),
                is_active: delegation.is_active !== false,
            });
            setEditingId(delegation.delegation_id);
            setShowForm(true);
            setError("");
            
            console.log('✅ [RoleAssignment] handleEdit - Form loaded successfully');
        } catch (err) {
            console.error('❌ [RoleAssignment] handleEdit - Error:', {
                message: err.message,
                stack: err.stack,
                delegation
            });
            alert("Error loading delegation for edit: " + err.message);
        }
    };

    const handleRevoke = async (id) => {
        if (!window.confirm("Are you sure you want to revoke this delegation?")) {
            return;
        }

        try {
            console.log('🔄 [RoleAssignment] handleRevoke - Revoking delegation...', {
                delegation_id: id
            });

            if (!id) {
                console.error('❌ [RoleAssignment] handleRevoke - Validation failed: id is required');
                alert("Invalid delegation ID");
                return;
            }

            await revokeRoleDelegation(id);
            console.log('✅ [RoleAssignment] handleRevoke - Delegation revoked successfully');
            alert("Delegation revoked successfully");
            await fetchDelegations();
        } catch (err) {
            console.error('❌ [RoleAssignment] handleRevoke - Error:', {
                message: err.message,
                response: err.response?.data,
                status: err.response?.status,
                stack: err.stack
            });
            const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message || "Error revoking delegation";
            alert(errorMsg);
        }
    };

    const clearForm = () => {
        try {
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
            setError("");
        } catch (err) {
            console.error('❌ [RoleAssignment] clearForm - Error:', err);
        }
    };

    const isDelegationActive = (delegation) => {
        try {
            if (!delegation || !delegation.is_active) return false;
            const now = new Date();
            const startDate = new Date(delegation.start_date);
            const endDate = new Date(delegation.end_date);
            
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                console.warn('⚠️ [RoleAssignment] isDelegationActive - Invalid dates:', delegation);
                return false;
            }
            
            return now >= startDate && now <= endDate;
        } catch (err) {
            console.error('❌ [RoleAssignment] isDelegationActive - Error:', err, delegation);
            return false;
        }
    };

    // Ensure delegations is always an array
    const delegationsArray = Array.isArray(delegations) ? delegations : [];

    const filteredDelegations = delegationsArray.filter((d) => {
        try {
            if (!d) return false;
            const searchLower = search.toLowerCase();
            return (
                String(d.delegated_to_user_name || "").toLowerCase().includes(searchLower) ||
                String(d.delegated_by_user_name || "").toLowerCase().includes(searchLower) ||
                String(d.reason || "").toLowerCase().includes(searchLower)
            );
        } catch (err) {
            console.error('❌ [RoleAssignment] filter - Error filtering delegation:', err, d);
            return false;
        }
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

    // Show loading while user is being loaded
    if (!mounted) {
        return (
            <div className="role-assignment-container">
                <div style={{ textAlign: 'center', padding: '50px' }}>
                    <div>Loading...</div>
                </div>
            </div>
        );
    }

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

            {error && (
                <div style={{ 
                    color: 'red', 
                    marginBottom: '10px', 
                    padding: '10px', 
                    backgroundColor: '#ffe6e6',
                    borderRadius: '4px',
                    fontSize: '14px'
                }}>
                    {error}
                </div>
            )}

            {/* Controls (New Entry + Search) - Only show when form is not visible */}
            {!showForm && (
                <div className="role-assignment-controls">
                    <button className="new-entry-btn" onClick={() => {
                        clearForm();
                        setShowForm(true);
                    }}>
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
                                disabled={loading || usersLoading}
                            >
                                <option value="">
                                    {usersLoading ? "Loading users..." : "Select User"}
                                </option>
                                {usersLoading ? (
                                    <option value="" disabled>Loading...</option>
                                ) : users.length === 0 ? (
                                    <option value="" disabled>No users available</option>
                                ) : (
                                    users.map((u) => {
                                        try {
                                            if (!u || !u.user_id) {
                                                console.warn('⚠️ [RoleAssignment] Invalid user object:', u);
                                                return null;
                                            }
                                            return (
                                                <option key={u.user_id} value={u.user_id}>
                                                    {String(u.user_name || "Unknown")} ({String(u.role_type || "N/A")})
                                                </option>
                                            );
                                        } catch (err) {
                                            console.error('❌ [RoleAssignment] Error rendering user option:', err, u);
                                            return null;
                                        }
                                    })
                                )}
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
                                disabled={loading}
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
                                disabled={loading}
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
                            disabled={loading}
                        />
                    </div>

                    <div className="permissions-section">
                        <div className="permissions-header">
                            <label>Select Permissions (Modules) *</label>
                            <button
                                type="button"
                                className="select-all-btn"
                                onClick={handleSelectAll}
                                disabled={loading}
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
                                            disabled={loading}
                                        />
                                        <span className="permission-label">{module.label}</span>
                                        <span className="permission-desc">{module.description}</span>
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="form-actions">
                        <button type="submit" className="submit-btn" disabled={loading || usersLoading}>
                            {loading ? "Processing..." : (editingId ? "Update Delegation" : "Create Delegation")}
                        </button>
                        <button type="button" className="cancel-btn" onClick={clearForm} disabled={loading}>
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            {/* Delegations List */}
            {!showForm && (
                <div className="delegations-table-container">
                    {delegationsLoading ? (
                        <div style={{ textAlign: 'center', padding: '50px' }}>
                            <div>Loading delegations...</div>
                        </div>
                    ) : (
                        <>
                            <table className="delegations-table">
                                <thead>
                                    <tr>
                                        <th>Sr. No.</th>
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
                                                {delegationsArray.length === 0 
                                                    ? "No delegations found" 
                                                    : "No delegations match your search"}
                                            </td>
                                        </tr>
                                    ) : (
                                        currentDelegations.map((d, index) => {
                                            try {
                                                const isActive = isDelegationActive(d);
                                                return (
                                                    <tr key={d.delegation_id} className={!d.is_active ? "revoked" : ""}>
                                                        <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                                        <td>{String(d.delegated_to_user_name || "-")}</td>
                                                        <td>{String(d.delegated_by_user_name || "-")}</td>
                                                        <td>
                                                            {d.start_date ? (() => {
                                                                try {
                                                                    return new Date(d.start_date).toLocaleDateString();
                                                                } catch {
                                                                    return String(d.start_date);
                                                                }
                                                            })() : "-"}
                                                        </td>
                                                        <td>
                                                            {d.end_date ? (() => {
                                                                try {
                                                                    return new Date(d.end_date).toLocaleDateString();
                                                                } catch {
                                                                    return String(d.end_date);
                                                                }
                                                            })() : "-"}
                                                        </td>
                                                        <td>
                                                            <div className="permissions-list">
                                                                {(Array.isArray(d.permissions) ? d.permissions : []).slice(0, 3).map((p) => {
                                                                    try {
                                                                        const module = availableModules.find((m) => m.id === p);
                                                                        return (
                                                                            <span key={p} className="permission-badge">
                                                                                {module?.label || String(p)}
                                                                            </span>
                                                                        );
                                                                    } catch (err) {
                                                                        console.error('❌ [RoleAssignment] Error rendering permission:', err, p);
                                                                        return null;
                                                                    }
                                                                })}
                                                                {(Array.isArray(d.permissions) ? d.permissions : []).length > 3 && (
                                                                    <span className="permission-badge more">
                                                                        +{(Array.isArray(d.permissions) ? d.permissions : []).length - 3} more
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
                                                        <td className="reason-cell">{String(d.reason || "-")}</td>
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
                                            } catch (err) {
                                                console.error('❌ [RoleAssignment] Error rendering delegation row:', err, d);
                                                return (
                                                    <tr key={d.delegation_id || Math.random()}>
                                                        <td colSpan="9" style={{ color: 'red' }}>
                                                            Error displaying delegation
                                                        </td>
                                                    </tr>
                                                );
                                            }
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
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default RoleAssignment;
