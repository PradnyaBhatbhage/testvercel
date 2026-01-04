import React, { useState, useEffect, useCallback } from "react";
import { getUsers, getOwners, registerUser, deleteUser, updateUser } from "../services/api";
import { getCurrentUserWingId } from "../utils/wingFilter";
import "../css/CommitteeMembers.css";

const CommitteeMembers = () => {
    const [committeeMembers, setCommitteeMembers] = useState([]);
    const [owners, setOwners] = useState([]);
    const [filteredCommitteeMembers, setFilteredCommitteeMembers] = useState([]);
    const [filteredOwners, setFilteredOwners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [activeTab, setActiveTab] = useState("committee"); // "committee" or "owners"
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingMember, setEditingMember] = useState(null);
    const [selectedOwners, setSelectedOwners] = useState([]);
    const [designation, setDesignation] = useState("");
    const [editDesignation, setEditDesignation] = useState("");
    const [editPassword, setEditPassword] = useState("");

    // Get current user's wing_id for filtering
    const currentUserWingId = getCurrentUserWingId();

    // Fetch committee members (users with role_type = "user")
    const fetchCommitteeMembers = useCallback(async () => {
        try {
            console.log('🔄 [CommitteeMembers] fetchCommitteeMembers - Starting to fetch users...');
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
            console.log('📊 [CommitteeMembers] Sample user data:', usersData.slice(0, 3).map(u => ({
                user_id: u.user_id,
                user_name: u.user_name,
                role_type: u.role_type,
                owner_id: u.owner_id,
                designation: u.designation
            })));

            // Filter users with role_type = "user" (committee members) AND owner_id (linked to owners)
            // Also filter by wing if current user has wing restriction
            const committeeMembers = usersData.filter((u) => {
                try {
                    if (!u || !u.user_id) {
                        return false;
                    }

                    // Check if role is "user" (committee member)
                    const roleType = String(u.role_type || "").toLowerCase();
                    if (roleType !== "user") {
                        return false;
                    }

                    // Only show committee members who are linked to owners (have owner_id)
                    // Check for null, undefined, 0, or empty string
                    if (!u.owner_id || u.owner_id === 0 || u.owner_id === null || u.owner_id === undefined || u.owner_id === '') {
                        console.log('⚠️ [CommitteeMembers] User filtered out (no owner_id):', {
                            user_id: u.user_id,
                            user_name: u.user_name,
                            owner_id: u.owner_id,
                            owner_id_type: typeof u.owner_id
                        });
                        return false;
                    }

                    // If current user has wing restriction, filter by wing
                    if (currentUserWingId) {
                        if (u.wing_id !== currentUserWingId) {
                            return false;
                        }
                    }

                    return true;
                } catch (err) {
                    console.error('❌ [CommitteeMembers] fetchCommitteeMembers - Error filtering user:', err, u);
                    return false;
                }
            });

            console.log('✅ [CommitteeMembers] fetchCommitteeMembers - Committee members filtered:', committeeMembers.length);
            console.log('📊 [CommitteeMembers] Filtered members:', committeeMembers.map(m => ({
                user_id: m.user_id,
                user_name: m.user_name,
                owner_id: m.owner_id,
                designation: m.designation
            })));
            setCommitteeMembers(committeeMembers);
            setFilteredCommitteeMembers(committeeMembers);
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

            setCommitteeMembers([]);
            setFilteredCommitteeMembers([]);

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

    // Fetch owners
    const fetchOwners = useCallback(async () => {
        try {
            console.log('🔄 [CommitteeMembers] fetchOwners - Starting to fetch owners...');
            setError("");

            const res = await getOwners();
            const ownersData = Array.isArray(res) ? res : (res.data || []);

            // Filter by wing if current user has wing restriction
            let filteredOwnersData = ownersData;
            if (currentUserWingId !== null) {
                filteredOwnersData = ownersData.filter(o => o.wing_id === currentUserWingId);
            }

            // Group owners by floor only
            const groupedOwners = {};
            filteredOwnersData.forEach(owner => {
                // Use floor_name from backend, fallback to floor_no if available
                const floor = owner.floor_name || owner.floor_no || 'N/A';

                if (!groupedOwners[floor]) {
                    groupedOwners[floor] = {
                        floor: floor,
                        owners: []
                    };
                }

                groupedOwners[floor].owners.push(owner);
            });

            // Function to convert floor name to number for sorting
            const getFloorNumber = (floorName) => {
                if (!floorName || floorName === 'N/A') return 999;

                const floorLower = floorName.toLowerCase().trim();

                // Handle named floors
                if (floorLower.includes('ground')) return 0;
                if (floorLower.includes('first') || floorLower === '1' || floorLower === '1st') return 1;
                if (floorLower.includes('second') || floorLower === '2' || floorLower === '2nd') return 2;
                if (floorLower.includes('third') || floorLower === '3' || floorLower === '3rd') return 3;
                if (floorLower.includes('fourth') || floorLower === '4' || floorLower === '4th') return 4;
                if (floorLower.includes('fifth') || floorLower === '5' || floorLower === '5th') return 5;
                if (floorLower.includes('sixth') || floorLower === '6' || floorLower === '6th') return 6;
                if (floorLower.includes('seventh') || floorLower === '7' || floorLower === '7th') return 7;
                if (floorLower.includes('eighth') || floorLower === '8' || floorLower === '8th') return 8;
                if (floorLower.includes('ninth') || floorLower === '9' || floorLower === '9th') return 9;
                if (floorLower.includes('tenth') || floorLower === '10' || floorLower === '10th') return 10;

                // Try to extract numeric value
                const numericMatch = floorName.match(/\d+/);
                if (numericMatch) {
                    return parseInt(numericMatch[0]);
                }

                // Default for unknown floors
                return 999;
            };

            // Convert to array and sort by floor
            const ownersList = Object.values(groupedOwners).sort((a, b) => {
                const floorA = getFloorNumber(a.floor);
                const floorB = getFloorNumber(b.floor);
                return floorA - floorB;
            });

            // Sort owners within each floor group by flat number
            ownersList.forEach(group => {
                group.owners.sort((a, b) => {
                    const flatA = a.flat_no || 'N/A';
                    const flatB = b.flat_no || 'N/A';
                    return (flatA === 'N/A' ? 'zzz' : flatA).localeCompare(flatB === 'N/A' ? 'zzz' : flatB);
                });
            });

            setOwners(ownersList);
            setFilteredOwners(ownersList);
        } catch (err) {
            console.error('❌ [CommitteeMembers] fetchOwners - Error:', err);
            setError(`Error fetching owners: ${err.message}`);
            setOwners([]);
            setFilteredOwners([]);
        }
    }, [currentUserWingId]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            await Promise.all([fetchCommitteeMembers(), fetchOwners()]);
            setLoading(false);
        };
        fetchData();
    }, [fetchCommitteeMembers, fetchOwners]);

    // Filter based on search input
    const handleSearch = (e) => {
        const value = e.target.value.toLowerCase();
        setSearchTerm(value);

        if (activeTab === "committee") {
            const filtered = committeeMembers.filter(
                (member) =>
                    (member.user_name && member.user_name.toLowerCase().includes(value)) ||
                    (member.designation && member.designation.toLowerCase().includes(value)) ||
                    (member.user_email && member.user_email.toLowerCase().includes(value)) ||
                    (member.user_contactno && member.user_contactno.toLowerCase().includes(value))
            );
            setFilteredCommitteeMembers(filtered);
        } else {
            const filtered = owners.map(group => ({
                ...group,
                owners: group.owners.filter(owner =>
                    (owner.owner_name && owner.owner_name.toLowerCase().includes(value)) ||
                    (owner.owner_email && owner.owner_email.toLowerCase().includes(value)) ||
                    (owner.owner_contactno && owner.owner_contactno.toLowerCase().includes(value)) ||
                    (owner.flat_no && owner.flat_no.toLowerCase().includes(value)) ||
                    (owner.floor_name && owner.floor_name.toLowerCase().includes(value))
                )
            })).filter(group => group.owners.length > 0);
            setFilteredOwners(filtered);
        }
    };

    // Toggle owner selection for adding committee member
    const toggleOwnerSelection = (ownerId) => {
        setSelectedOwners(prev =>
            prev.includes(ownerId)
                ? prev.filter(id => id !== ownerId)
                : [...prev, ownerId]
        );
    };

    // Handle edit committee member designation
    const handleEditDesignation = (member) => {
        setEditingMember(member);
        setEditDesignation(member.designation || "");
        setShowEditModal(true);
    };

    // Handle update designation
    const handleUpdateDesignation = async () => {
        if (!editDesignation.trim()) {
            alert("Please enter a designation");
            return;
        }

        if (!editingMember) return;

        try {
            // Get current user data to preserve other fields
            const user = JSON.parse(localStorage.getItem("user") || "{}");
            const currentUserWingId = user.wing_id || null;

            // Update designation without changing password
            await updateUser(editingMember.user_id, {
                user_name: editingMember.user_name,
                wing_id: editingMember.wing_id || currentUserWingId || 1,
                role_type: editingMember.role_type,
                owner_id: editingMember.owner_id,
                designation: editDesignation.trim()
            });

            alert("Designation updated successfully!");
            setShowEditModal(false);
            setEditingMember(null);
            setEditDesignation("");
            // Refresh the committee members list
            await fetchCommitteeMembers();
        } catch (error) {
            console.error("Error updating designation:", error);
            const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || "Failed to update designation";
            alert(`Error: ${errorMessage}`);
        }
    };

    // Handle delete committee member
    const handleDeleteCommitteeMember = async (userId, userName) => {
        if (!window.confirm(`Are you sure you want to delete committee member "${userName}"?`)) {
            return;
        }

        const reason = prompt("Please enter reason for deletion:");
        if (!reason || !reason.trim()) {
            alert("Delete reason is required");
            return;
        }

        try {
            await deleteUser(userId, reason.trim());
            alert("Committee member deleted successfully");
            // Refresh the committee members list
            fetchCommitteeMembers();
        } catch (error) {
            console.error("Error deleting committee member:", error);
            const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || "Failed to delete committee member";
            alert(`Error: ${errorMessage}`);
        }
    };

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
                <h2>Members</h2>
                <button
                    className="add-committee-member-btn"
                    onClick={() => setShowAddModal(true)}
                >
                    + Add Committee Member
                </button>
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

            {/* Tabs */}
            <div className="members-tabs">
                <button
                    className={`tab-btn ${activeTab === "committee" ? "active" : ""}`}
                    onClick={() => setActiveTab("committee")}
                >
                    Committee Members ({filteredCommitteeMembers.length})
                </button>
                <button
                    className={`tab-btn ${activeTab === "owners" ? "active" : ""}`}
                    onClick={() => setActiveTab("owners")}
                >
                    Owners ({filteredOwners.reduce((sum, group) => sum + group.owners.length, 0)})
                </button>
            </div>

            <div className="committee-members-controls">
                <div className="search-bar">
                    <input
                        type="text"
                        placeholder={activeTab === "committee" ? "Search by name, designation, email, or contact..." : "Search by name, email, contact, or flat no..."}
                        value={searchTerm}
                        onChange={handleSearch}
                    />
                </div>
            </div>

            <div className="committee-members-table-container">
                {activeTab === "committee" ? (
                    filteredCommitteeMembers.length === 0 ? (
                        <div className="no-data-message">
                            {searchTerm ? "No committee members found matching your search." : "No committee members found."}
                        </div>
                    ) : (
                        <table className="committee-members-table">
                            <thead>
                                <tr>
                                    <th>Sr. No.</th>
                                    <th>Name</th>
                                    <th>Designation</th>
                                    <th>Contact No.</th>
                                    <th>Email ID</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCommitteeMembers.map((member, index) => (
                                    <tr key={member.user_id}>
                                        <td>{index + 1}</td>
                                        <td>{member.owner_name || member.user_name || "-"}</td>
                                        <td>{member.designation || "-"}</td>
                                        <td>{member.owner_contactno || "-"}</td>
                                        <td>{member.owner_email || "-"}</td>
                                        <td>
                                            <button
                                                className="edit-btn"
                                                onClick={() => handleEditDesignation(member)}
                                                title="Edit Designation"
                                                style={{ marginRight: '5px' }}
                                            >
                                                ✏️ Edit
                                            </button>
                                            <button
                                                className="delete-btn"
                                                onClick={() => handleDeleteCommitteeMember(member.user_id, member.owner_name || member.user_name)}
                                                title="Delete Committee Member"
                                            >
                                                🗑️ Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )
                ) : (
                    filteredOwners.length === 0 ? (
                        <div className="no-data-message">
                            {searchTerm ? "No owners found matching your search." : "No owners found."}
                        </div>
                    ) : (
                        <div className="owners-list">
                            {filteredOwners.map((group, groupIndex) => (
                                <div key={group.floor} className="owner-group">
                                    <div className="owner-group-header">
                                        <strong>Floor: {group.floor}</strong>
                                    </div>
                                    <table className="owners-table">
                                        <thead>
                                            <tr>
                                                <th>Sr. No.</th>
                                                <th>Flat No.</th>
                                                <th>Name</th>
                                                <th>Contact No.</th>
                                                <th>Email ID</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {group.owners.map((owner, index) => (
                                                <tr key={owner.owner_id}>
                                                    <td>{index + 1}</td>
                                                    <td>{owner.flat_no || "-"}</td>
                                                    <td>{owner.owner_name || "-"}</td>
                                                    <td>{owner.owner_contactno || "-"}</td>
                                                    <td>{owner.owner_email || "-"}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ))}
                        </div>
                    )
                )}
            </div>

            {/* Add Committee Member Modal */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Add Committee Member</h3>
                            <button className="modal-close" onClick={() => setShowAddModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Designation:</label>
                                <input
                                    type="text"
                                    placeholder="e.g., President, Secretary, Treasurer"
                                    value={designation}
                                    onChange={(e) => setDesignation(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label>Select Owners (Multiple Selection):</label>
                                <div className="owners-selection-list">
                                    {owners.flatMap(group => group.owners).map(owner => (
                                        <label key={owner.owner_id} className="owner-checkbox">
                                            <input
                                                type="checkbox"
                                                checked={selectedOwners.includes(owner.owner_id)}
                                                onChange={() => toggleOwnerSelection(owner.owner_id)}
                                            />
                                            <span>
                                                {owner.owner_name} - Flat {owner.flat_no} (Floor {owner.floor_name || owner.floor_no || 'N/A'})
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn-cancel"
                                onClick={() => {
                                    setShowAddModal(false);
                                    setSelectedOwners([]);
                                    setDesignation("");
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn-submit"
                                onClick={async () => {
                                    if (!designation.trim()) {
                                        alert("Please enter a designation");
                                        return;
                                    }
                                    if (selectedOwners.length === 0) {
                                        alert("Please select at least one owner");
                                        return;
                                    }

                                    try {
                                        // Get all owners data
                                        const allOwners = owners.flatMap(group => group.owners);
                                        const selectedOwnersData = allOwners.filter(o => selectedOwners.includes(o.owner_id));

                                        // Create users for each selected owner
                                        const user = JSON.parse(localStorage.getItem("user") || "{}");
                                        const currentUserWingId = user.wing_id || null;

                                        let successCount = 0;
                                        let errorCount = 0;

                                        for (const owner of selectedOwnersData) {
                                            try {
                                                // Generate username from owner name
                                                const username = owner.owner_name.toLowerCase().replace(/\s+/g, '_') + '_' + owner.owner_id;
                                                // Generate default password (can be changed later)
                                                const defaultPassword = 'Committee@123';

                                                await registerUser({
                                                    user_name: username,
                                                    password: defaultPassword,
                                                    wing_id: owner.wing_id || currentUserWingId || 1,
                                                    role_type: 'user',
                                                    owner_id: owner.owner_id,
                                                    designation: designation.trim()
                                                });
                                                successCount++;
                                            } catch (err) {
                                                console.error(`Error creating user for owner ${owner.owner_id}:`, err);
                                                errorCount++;
                                            }
                                        }

                                        if (successCount > 0) {
                                            alert(`Successfully added ${successCount} committee member(s)!\n${errorCount > 0 ? `Failed to add ${errorCount} member(s).` : ''}`);
                                            // Refresh the committee members list
                                            await fetchCommitteeMembers();
                                        } else {
                                            alert(`Failed to add committee members. Please try again.`);
                                        }

                                        setShowAddModal(false);
                                        setSelectedOwners([]);
                                        setDesignation("");
                                    } catch (error) {
                                        console.error("Error adding committee members:", error);
                                        alert(`Error: ${error.response?.data?.error || error.message || "Failed to add committee members"}`);
                                    }
                                }}
                            >
                                Add Committee Member(s)
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Designation Modal */}
            {showEditModal && editingMember && (
                <div className="modal-overlay" onClick={() => {
                    setShowEditModal(false);
                    setEditingMember(null);
                    setEditDesignation("");
                }}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Edit Designation</h3>
                            <button className="modal-close" onClick={() => {
                                setShowEditModal(false);
                                setEditingMember(null);
                                setEditDesignation("");
                            }}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Member Name:</label>
                                <input
                                    type="text"
                                    value={editingMember.owner_name || editingMember.user_name || ""}
                                    disabled
                                    style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                                />
                            </div>
                            <div className="form-group">
                                <label>Designation:</label>
                                <input
                                    type="text"
                                    placeholder="e.g., President, Secretary, Treasurer"
                                    value={editDesignation}
                                    onChange={(e) => setEditDesignation(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn-cancel"
                                onClick={() => {
                                    setShowEditModal(false);
                                    setEditingMember(null);
                                    setEditDesignation("");
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn-submit"
                                onClick={handleUpdateDesignation}
                            >
                                Update
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CommitteeMembers;

