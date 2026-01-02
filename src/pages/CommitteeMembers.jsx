import React, { useState, useEffect, useCallback } from "react";
import { getUsers } from "../services/api";
import { getCurrentUserWingId } from "../utils/wingFilter";
import "../css/CommitteeMembers.css";

const CommitteeMembers = () => {
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Get current user's wing_id for filtering
    const currentUserWingId = getCurrentUserWingId();

    // Fetch committee members (users with role_type = "user")
    const fetchCommitteeMembers = useCallback(async () => {
        try {
            console.log('🔄 [CommitteeMembers] fetchCommitteeMembers - Starting to fetch users...');
            setLoading(true);
            setError("");

            const res = await getUsers();

            console.log('📊 [CommitteeMembers] fetchCommitteeMembers - API Response:', {
                status: res.status,
                data: res.data,
                dataType: typeof res.data,
                isArray: Array.isArray(res.data)
            });

            // Ensure we have valid data
            if (!res || !res.data) {
                console.error('❌ [CommitteeMembers] fetchCommitteeMembers - Invalid response structure:', res);
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
                    console.warn('⚠️ [CommitteeMembers] fetchCommitteeMembers - Response data is not an array:', res.data);
                    usersData = [];
                }
            } else {
                console.warn('⚠️ [CommitteeMembers] fetchCommitteeMembers - Unexpected data type:', typeof res.data);
                usersData = [];
            }

            // Final validation
            if (!Array.isArray(usersData)) {
                console.error('❌ [CommitteeMembers] fetchCommitteeMembers - usersData is not an array after processing:', usersData);
                usersData = [];
            }

            console.log('✅ [CommitteeMembers] fetchCommitteeMembers - Raw users loaded:', usersData.length);

            // Filter users with role_type = "user" (committee members)
            // Also filter by wing if current user has wing restriction
            const committeeMembers = usersData.filter((u) => {
                try {
                    if (!u || !u.user_id) return false;
                    
                    // Check if role is "user" (committee member)
                    const roleType = String(u.role_type || "").toLowerCase();
                    if (roleType !== "user") return false;

                    // If current user has wing restriction, filter by wing
                    if (currentUserWingId) {
                        return u.wing_id === currentUserWingId;
                    }

                    return true;
                } catch (err) {
                    console.error('❌ [CommitteeMembers] fetchCommitteeMembers - Error filtering user:', err, u);
                    return false;
                }
            });

            console.log('✅ [CommitteeMembers] fetchCommitteeMembers - Committee members filtered:', committeeMembers.length);
            setUsers(committeeMembers);
            setFilteredUsers(committeeMembers);
            setLoading(false);
        } catch (err) {
            console.error('❌ [CommitteeMembers] fetchCommitteeMembers - Error:', {
                message: err.message,
                response: err.response?.data,
                status: err.response?.status,
                statusText: err.response?.statusText,
                url: err.config?.url,
                method: err.config?.method,
                stack: err.stack
            });

            setLoading(false);
            setUsers([]);
            setFilteredUsers([]);

            // Handle different error types
            let errorMessage = "Unknown error";
            if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
                errorMessage = "Network Error: Cannot connect to server. Please check your internet connection.";
            } else if (err.response?.status === 403) {
                errorMessage = "Access Forbidden: You don't have permission to access this resource.";
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

            setError(`Error fetching committee members: ${errorMessage}`);
        }
    }, [currentUserWingId]);

    useEffect(() => {
        fetchCommitteeMembers();
    }, [fetchCommitteeMembers]);

    // Filter users based on search input
    const handleSearch = (e) => {
        const value = e.target.value.toLowerCase();
        setSearchTerm(value);

        const filtered = users.filter(
            (user) =>
                (user.user_name && user.user_name.toLowerCase().includes(value)) ||
                (user.role_type && user.role_type.toLowerCase().includes(value))
        );

        setFilteredUsers(filtered);
        setCurrentPage(1); // Reset to page 1 when search changes
    };

    // Pagination logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentUsers = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

    if (loading) {
        return (
            <div className="committee-members-container">
                <div className="loading-message">Loading committee members...</div>
            </div>
        );
    }

    return (
        <div className="committee-members-container">
            <div className="committee-members-header">
                <h2>Committee Members</h2>
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

            <div className="committee-members-controls">
                <div className="search-bar">
                    <input
                        type="text"
                        placeholder="Search by name or role..."
                        value={searchTerm}
                        onChange={handleSearch}
                    />
                </div>
            </div>

            <div className="committee-members-table-container">
                {filteredUsers.length === 0 ? (
                    <div className="no-data-message">
                        {searchTerm ? "No committee members found matching your search." : "No committee members found."}
                    </div>
                ) : (
                    <>
                        <table className="committee-members-table">
                            <thead>
                                <tr>
                                    <th>Sr. No.</th>
                                    <th>Username</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentUsers.map((user, index) => (
                                    <tr key={user.user_id}>
                                        <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                        <td>{user.user_name || "-"}</td>
                                        <td>{user.role_type === "user" ? "Committee Members" : (user.role_type || "-")}</td>
                                        <td>
                                            <span className={`status-badge ${user.status === "Active" ? "active" : "inactive"}`}>
                                                {user.status || "Active"}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="pagination">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="pagination-btn"
                                >
                                    Previous
                                </button>
                                <span className="pagination-info">
                                    Page {currentPage} of {totalPages} (Total: {filteredUsers.length} members)
                                </span>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="pagination-btn"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default CommitteeMembers;

