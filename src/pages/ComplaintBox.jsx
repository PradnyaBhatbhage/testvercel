import React, { useEffect, useState } from "react";
import {
    getComplaints,
    addComplaint,
    updateComplaint,
    deleteComplaint,
    getWings,
    getOwners,
} from "../services/api";
import { getCurrentUserWingId, filterOwnersByWing } from "../utils/wingFilter";
import { canEdit, canDelete, isOwnerRole, getCurrentOwnerId, filterOwnersByCurrentOwner } from "../utils/ownerFilter";
import "../css/ComplaintBox.css";

const ComplaintBox = () => {
    const [complaints, setComplaints] = useState([]);
    const [wings, setWings] = useState([]);
    const [owners, setOwners] = useState([]);
    const [formData, setFormData] = useState({
        complaint_id: null,
        owner_id: "",
        wing_id: "",
        complaint_title: "",
        complaint_description: "",
        complaint_type: "",
        status: "pending",
        priority: "medium",
        assigned_to: "",
        resolution_notes: "",
    });
    const [editingId, setEditingId] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [search, setSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState("");
    const itemsPerPage = 10;
    const [selectedFile, setSelectedFile] = useState(null);
    const [filePreview, setFilePreview] = useState(null);
    const [deleteModal, setDeleteModal] = useState({
        show: false,
        id: null,
        title: "",
    });
    const [viewModal, setViewModal] = useState({
        show: false,
        complaint: null,
    });

    // Get current user's wing_id
    const currentUserWingId = getCurrentUserWingId();

    // Status options
    const statusOptions = [
        { value: "pending", label: "Pending", color: "#FFA500" },
        { value: "assigned", label: "Assigned", color: "#007bff" },
        { value: "checked", label: "Checked", color: "#17a2b8" },
        { value: "in_process", label: "In Process", color: "#6f42c1" },
        { value: "completed", label: "Completed", color: "#28a745" },
        { value: "closed", label: "Closed", color: "#6c757d" },
    ];

    const priorityOptions = [
        { value: "low", label: "Low", color: "#28a745" },
        { value: "medium", label: "Medium", color: "#ffc107" },
        { value: "high", label: "High", color: "#dc3545" },
    ];

    useEffect(() => {
        fetchWings();
        fetchOwners();
        fetchComplaints();
    }, []);

    // Auto-populate owner_id and wing_id when owner is logged in
    useEffect(() => {
        if (isOwnerRole() && !editingId && owners.length > 0) {
            const ownerId = getCurrentOwnerId();
            if (ownerId) {
                const currentOwner = owners.find(o => parseInt(o.owner_id) === parseInt(ownerId));
                if (currentOwner && !formData.owner_id) {
                    setFormData(prev => ({
                        ...prev,
                        owner_id: ownerId.toString(),
                        wing_id: currentOwner.wing_id ? currentOwner.wing_id.toString() : prev.wing_id
                    }));
                }
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [owners, editingId]);

    const fetchComplaints = async () => {
        try {
            const res = await getComplaints();
            const rawComplaints = Array.isArray(res.data) ? res.data : res.data?.data || [];

            // Filter complaints by current user's wing
            let filteredComplaints = rawComplaints;
            if (currentUserWingId !== null) {
                // Get owner IDs for the wing
                const allOwnersRes = await getOwners();
                const allOwners = Array.isArray(allOwnersRes.data) ? allOwnersRes.data : allOwnersRes.data?.data || [];
                const wingOwnerIds = new Set(
                    allOwners
                        .filter(o => o.wing_id && parseInt(o.wing_id) === parseInt(currentUserWingId))
                        .map(o => parseInt(o.owner_id))
                );
                filteredComplaints = rawComplaints.filter(c => {
                    const ownerId = c.owner_id ? parseInt(c.owner_id) : null;
                    return ownerId && wingOwnerIds.has(ownerId);
                });
            }

            // Filter by owner if user is owner role
            if (isOwnerRole()) {
                const ownerId = getCurrentOwnerId();
                if (ownerId) {
                    filteredComplaints = filteredComplaints.filter(c =>
                        c.owner_id && parseInt(c.owner_id) === parseInt(ownerId)
                    );
                }
            }

            setComplaints(filteredComplaints.filter(c => !c.is_deleted));
        } catch (err) {
            console.error("Error fetching complaints:", err);
        }
    };

    const fetchWings = async () => {
        try {
            const res = await getWings();
            const allWings = res.data || [];
            if (currentUserWingId !== null) {
                const filteredWings = allWings.filter(wing => Number(wing.wing_id) === Number(currentUserWingId));
                setWings(filteredWings);
            } else {
                setWings(allWings);
            }
        } catch (err) {
            console.error("Error fetching wings:", err);
        }
    };

    const fetchOwners = async () => {
        try {
            const res = await getOwners();
            let rawOwners = Array.isArray(res.data) ? res.data : res.data?.data || [];

            if (currentUserWingId !== null) {
                rawOwners = filterOwnersByWing(rawOwners, currentUserWingId);
            }

            if (isOwnerRole()) {
                rawOwners = filterOwnersByCurrentOwner(rawOwners);
            }

            setOwners(rawOwners);
        } catch (err) {
            console.error("Error fetching owners:", err);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });

        // If wing is changed, filter owners by wing
        if (name === "wing_id") {
            const filteredOwners = owners.filter(o =>
                !value || (o.wing_id && parseInt(o.wing_id) === parseInt(value))
            );
            setOwners(filteredOwners);
            if (formData.owner_id) {
                const ownerExists = filteredOwners.find(o => parseInt(o.owner_id) === parseInt(formData.owner_id));
                if (!ownerExists) {
                    setFormData(prev => ({ ...prev, owner_id: "" }));
                }
            }
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
            if (!validTypes.includes(file.type)) {
                alert('Please select a PDF or JPEG/PNG image file.');
                e.target.value = '';
                return;
            }
            if (file.size > 10 * 1024 * 1024) {
                alert('File size should be less than 10MB.');
                e.target.value = '';
                return;
            }
            setSelectedFile(file);
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setFilePreview(reader.result);
                };
                reader.readAsDataURL(file);
            } else {
                setFilePreview(null);
            }
        }
    };

    const resetForm = () => {
        const baseFormData = {
            complaint_id: null,
            owner_id: "",
            wing_id: "",
            complaint_title: "",
            complaint_description: "",
            complaint_type: "",
            status: "pending",
            priority: "medium",
            assigned_to: "",
            resolution_notes: "",
        };

        // Auto-populate owner_id for owner role
        if (isOwnerRole()) {
            const ownerId = getCurrentOwnerId();
            if (ownerId) {
                const currentOwner = owners.find(o => parseInt(o.owner_id) === parseInt(ownerId));
                if (currentOwner) {
                    baseFormData.owner_id = ownerId.toString();
                    baseFormData.wing_id = currentOwner.wing_id ? currentOwner.wing_id.toString() : "";
                }
            }
        }

        setFormData(baseFormData);
        setEditingId(null);
        setSelectedFile(null);
        setFilePreview(null);
        setShowForm(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Prepare form data - exclude complaint_id for new entries, convert empty strings to null
            const submitData = { ...formData };

            // Remove complaint_id for new entries
            if (!editingId) {
                delete submitData.complaint_id;
            }

            // Auto-populate owner_id for owner role users
            if (isOwnerRole() && !submitData.owner_id) {
                const ownerId = getCurrentOwnerId();
                if (ownerId) {
                    submitData.owner_id = ownerId;
                    // Also get wing_id from owner
                    const currentOwner = owners.find(o => parseInt(o.owner_id) === parseInt(ownerId));
                    if (currentOwner && currentOwner.wing_id) {
                        submitData.wing_id = currentOwner.wing_id;
                    }
                }
            }

            // Convert empty strings to null for optional fields
            Object.keys(submitData).forEach(key => {
                if (submitData[key] === "" && (key === "assigned_to" || key === "resolution_notes")) {
                    submitData[key] = null;
                }
            });

            console.log("Submitting complaint data:", submitData);

            if (editingId) {
                await updateComplaint(editingId, submitData, selectedFile);
                alert("Complaint updated successfully!");
            } else {
                await addComplaint(submitData, selectedFile);
                alert("Complaint submitted successfully!");
            }
            resetForm();
            fetchComplaints();
        } catch (err) {
            console.error("Error submitting complaint:", err);
            console.error("Error response:", err.response?.data);
            console.error("Error status:", err.response?.status);
            console.error("Error message:", err.message);

            let errorMessage = "Unknown error";

            if (err.message && err.message.includes("HTML response")) {
                errorMessage = "Backend endpoint not found. Please ensure the complaints API is set up on the backend server.";
            } else if (err.response?.status === 404) {
                errorMessage = "Complaints API endpoint not found. Please check backend configuration.";
            } else if (err.response?.data?.error) {
                errorMessage = err.response.data.error;
            } else if (err.response?.data?.message) {
                errorMessage = err.response.data.message;
            } else if (err.message) {
                errorMessage = err.message;
            }

            alert(`Error submitting complaint: ${errorMessage}`);
        }
    };

    const handleEdit = (complaint) => {
        // Prevent editing closed complaints
        if (complaint.status === "closed") {
            alert("Cannot edit closed complaints. Please use the View option to see details.");
            return;
        }

        setFormData({
            complaint_id: complaint.complaint_id,
            owner_id: complaint.owner_id || "",
            wing_id: complaint.wing_id || owners.find(o => o.owner_id === complaint.owner_id)?.wing_id || "",
            complaint_title: complaint.complaint_title || "",
            complaint_description: complaint.complaint_description || "",
            complaint_type: complaint.complaint_type || "",
            status: complaint.status || "pending",
            priority: complaint.priority || "medium",
            assigned_to: complaint.assigned_to || "",
            resolution_notes: complaint.resolution_notes || "",
        });
        setEditingId(complaint.complaint_id);
        setSelectedFile(null);
        setFilePreview(complaint.attachment_url && complaint.attachment_url.startsWith('http') ? complaint.attachment_url : null);
        setShowForm(true);
    };

    const handleView = (complaint) => {
        setViewModal({
            show: true,
            complaint: complaint,
        });
    };

    const handleDeleteClick = (complaint) => {
        // Prevent deleting closed complaints
        if (complaint.status === "closed") {
            alert("Cannot delete closed complaints.");
            return;
        }

        setDeleteModal({
            show: true,
            id: complaint.complaint_id,
            title: complaint.complaint_title || "this complaint",
        });
    };

    const handleDeleteConfirm = async () => {
        try {
            await deleteComplaint(deleteModal.id, "Deleted by user");
            setDeleteModal({ show: false, id: null, title: "" });
            fetchComplaints();
            alert("Complaint deleted successfully!");
        } catch (err) {
            console.error("Error deleting complaint:", err);
            alert("Error deleting complaint. Please try again.");
        }
    };

    const handleStatusChange = async (complaintId, newStatus) => {
        try {
            const complaint = complaints.find(c => c.complaint_id === complaintId);
            if (!complaint) return;

            // Prevent changing status of closed complaints
            if (complaint.status === "closed") {
                alert("Cannot change status of closed complaints.");
                return;
            }

            await updateComplaint(complaintId, {
                ...complaint,
                status: newStatus,
            });
            fetchComplaints();
        } catch (err) {
            console.error("Error updating status:", err);
            alert("Error updating status. Please try again.");
        }
    };

    // Filter complaints
    const filteredComplaints = complaints.filter((c) => {
        const matchesSearch =
            (c.complaint_title?.toLowerCase().includes(search.toLowerCase())) ||
            (c.complaint_description?.toLowerCase().includes(search.toLowerCase())) ||
            (c.complaint_type?.toLowerCase().includes(search.toLowerCase())) ||
            (owners.find(o => o.owner_id === c.owner_id)?.owner_name?.toLowerCase().includes(search.toLowerCase()));

        const matchesStatus = !statusFilter || c.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    // Pagination
    const totalPages = Math.ceil(filteredComplaints.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentComplaints = filteredComplaints.slice(startIndex, startIndex + itemsPerPage);

    const getStatusBadge = (status) => {
        const statusOption = statusOptions.find(s => s.value === status) || statusOptions[0];
        return (
            <span
                className="status-badge"
                style={{
                    backgroundColor: statusOption.color + "20",
                    color: statusOption.color,
                    padding: "4px 12px",
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: "600"
                }}
            >
                {statusOption.label}
            </span>
        );
    };

    const getPriorityBadge = (priority) => {
        const priorityOption = priorityOptions.find(p => p.value === priority) || priorityOptions[1];
        return (
            <span
                className="priority-badge"
                style={{
                    backgroundColor: priorityOption.color + "20",
                    color: priorityOption.color,
                    padding: "4px 12px",
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: "600"
                }}
            >
                {priorityOption.label}
            </span>
        );
    };

    return (
        <div className="complaint-container">
            <h2>📋 Complaint Box</h2>

            {/* Controls */}
            <div className="complaint-controls">
                <button className="new-entry-btn" onClick={() => { resetForm(); setShowForm(true); }}>
                    ➕ New Complaint
                </button>
                <div className="search-bar">
                    <input
                        type="text"
                        placeholder="Search complaints..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => {
                        setStatusFilter(e.target.value);
                        setCurrentPage(1);
                    }}
                    style={{
                        padding: "8px 12px",
                        borderRadius: "6px",
                        border: "1px solid #ddd",
                        outline: "none"
                    }}
                >
                    <option value="">All Status</option>
                    {statusOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            </div>

            {/* Form */}
            {showForm && (
                <form className="complaint-form" onSubmit={handleSubmit}>
                    <h3>
                        {editingId
                            ? (formData.status === "closed" ? "View Complaint (Closed - Read Only)" : "Edit Complaint")
                            : "Submit New Complaint"
                        }
                    </h3>

                    <div className="form-grid">
                        <div className="form-field">
                            <label>Wing *</label>
                            <select
                                name="wing_id"
                                value={formData.wing_id}
                                onChange={handleChange}
                                required
                                disabled={formData.status === "closed" || (currentUserWingId !== null && wings.length === 1)}
                            >
                                <option value="">Select Wing</option>
                                {wings.map((w) => (
                                    <option key={w.wing_id} value={w.wing_id}>
                                        {w.wing_name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-field">
                            <label>Owner *</label>
                            <select
                                name="owner_id"
                                value={formData.owner_id}
                                onChange={handleChange}
                                required
                                disabled={formData.status === "closed" || isOwnerRole()}
                            >
                                <option value="">Select Owner</option>
                                {owners
                                    .filter(o => !formData.wing_id || (o.wing_id && parseInt(o.wing_id) === parseInt(formData.wing_id)))
                                    .map((o) => (
                                        <option key={o.owner_id} value={o.owner_id}>
                                            {o.owner_name} - {o.flat_no}
                                        </option>
                                    ))}
                            </select>
                        </div>

                        <div className="form-field">
                            <label>Complaint Title *</label>
                            <input
                                type="text"
                                name="complaint_title"
                                value={formData.complaint_title}
                                onChange={handleChange}
                                placeholder="Enter complaint title"
                                required
                                disabled={formData.status === "closed"}
                            />
                        </div>

                        <div className="form-field">
                            <label>Complaint Type *</label>
                            <select
                                name="complaint_type"
                                value={formData.complaint_type}
                                onChange={handleChange}
                                required
                                disabled={formData.status === "closed"}
                            >
                                <option value="">Select Type</option>
                                <option value="Maintenance">Maintenance</option>
                                <option value="Security">Security</option>
                                <option value="Cleaning">Cleaning</option>
                                <option value="Parking">Parking</option>
                                <option value="Water">Water</option>
                                <option value="Electricity">Electricity</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <div className="form-field">
                            <label>Priority *</label>
                            <select
                                name="priority"
                                value={formData.priority}
                                onChange={handleChange}
                                required
                                disabled={formData.status === "closed"}
                            >
                                {priorityOptions.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        {(canEdit() || !isOwnerRole()) && (
                            <div className="form-field">
                                <label>Status</label>
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    disabled={formData.status === "closed"}
                                >
                                    {statusOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {(canEdit() || !isOwnerRole()) && (
                            <div className="form-field">
                                <label>Assigned To</label>
                                <input
                                    type="text"
                                    name="assigned_to"
                                    value={formData.assigned_to}
                                    onChange={handleChange}
                                    placeholder="Enter assigned person name"
                                    disabled={formData.status === "closed"}
                                />
                            </div>
                        )}
                    </div>

                    <div className="form-field full-width">
                        <label>Description *</label>
                        <textarea
                            name="complaint_description"
                            value={formData.complaint_description}
                            onChange={handleChange}
                            placeholder="Enter detailed description of the complaint"
                            rows="4"
                            required
                            disabled={formData.status === "closed"}
                        />
                    </div>

                    {(canEdit() || !isOwnerRole()) && (
                        <div className="form-field full-width">
                            <label>Resolution Notes</label>
                            <textarea
                                name="resolution_notes"
                                value={formData.resolution_notes}
                                onChange={handleChange}
                                placeholder="Enter resolution notes or comments"
                                rows="3"
                                disabled={formData.status === "closed"}
                            />
                        </div>
                    )}

                    <div className="form-field">
                        <label>Attachment</label>
                        <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={handleFileChange}
                            disabled={formData.status === "closed"}
                        />
                        {filePreview && (
                            <div style={{ marginTop: '10px' }}>
                                {filePreview.startsWith('data:') ? (
                                    <img src={filePreview} alt="Preview" style={{ maxWidth: '200px', maxHeight: '200px', marginTop: '5px' }} />
                                ) : (
                                    <a href={filePreview} target="_blank" rel="noopener noreferrer" style={{ color: '#007bff' }}>
                                        {filePreview.includes('pdf') ? 'View PDF' : 'View Image'}
                                    </a>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="button-group">
                        {formData.status === "closed" ? (
                            <button type="button" className="btn-cancel" onClick={resetForm} style={{ width: '100%' }}>
                                Close
                            </button>
                        ) : (
                            <>
                                <button type="submit" className="btn-save">
                                    {editingId ? "Update Complaint" : "Submit Complaint"}
                                </button>
                                <button type="button" className="btn-cancel" onClick={resetForm}>
                                    Cancel
                                </button>
                            </>
                        )}
                    </div>
                </form>
            )}

            {/* Table */}
            {!showForm && (
                <>
                    <table className="complaint-table">
                        <thead>
                            <tr>
                                <th>Sr. No.</th>
                                <th>Owner</th>
                                <th>Title</th>
                                <th>Type</th>
                                <th>Priority</th>
                                <th>Status</th>
                                {(canEdit() || !isOwnerRole()) && <th>Assigned To</th>}
                                <th>Date</th>
                                <th>Attachment</th>
                                {(canEdit() || canDelete()) && <th>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {currentComplaints.length === 0 ? (
                                <tr>
                                    <td colSpan={(canEdit() || !isOwnerRole()) ? 11 : 10} className="no-data">
                                        No complaints found
                                    </td>
                                </tr>
                            ) : (
                                currentComplaints.map((complaint, index) => {
                                    const owner = owners.find(o => o.owner_id === complaint.owner_id);
                                    const isClosed = complaint.status === "closed";
                                    return (
                                        <tr
                                            key={complaint.complaint_id}
                                            className={isClosed ? "closed-row" : ""}
                                            style={isClosed ? {
                                                backgroundColor: '#f5f5f5',
                                                opacity: 0.8
                                            } : {}}
                                        >
                                            <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                            <td>{owner?.owner_name || "-"}</td>
                                            <td>
                                                <div style={{ fontWeight: '600' }}>{complaint.complaint_title || "-"}</div>
                                                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                                                    {complaint.complaint_description?.substring(0, 50)}
                                                    {complaint.complaint_description?.length > 50 ? '...' : ''}
                                                </div>
                                            </td>
                                            <td>{complaint.complaint_type || "-"}</td>
                                            <td>{getPriorityBadge(complaint.priority || "medium")}</td>
                                            <td>
                                                {(canEdit() || !isOwnerRole()) && !isClosed ? (
                                                    <select
                                                        value={complaint.status || "pending"}
                                                        onChange={(e) => handleStatusChange(complaint.complaint_id, e.target.value)}
                                                        style={{
                                                            padding: "4px 8px",
                                                            borderRadius: "6px",
                                                            border: "1px solid #ddd",
                                                            fontSize: "12px",
                                                            fontWeight: "600",
                                                            backgroundColor: statusOptions.find(s => s.value === (complaint.status || "pending"))?.color + "20",
                                                            color: statusOptions.find(s => s.value === (complaint.status || "pending"))?.color
                                                        }}
                                                    >
                                                        {statusOptions.map(opt => (
                                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    getStatusBadge(complaint.status || "pending")
                                                )}
                                            </td>
                                            {(canEdit() || !isOwnerRole()) && (
                                                <td>{complaint.assigned_to || "-"}</td>
                                            )}
                                            <td>{complaint.created_at ? new Date(complaint.created_at).toLocaleDateString('en-IN') : "-"}</td>
                                            <td>
                                                {complaint.attachment_url ? (
                                                    <a
                                                        href={complaint.attachment_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{ color: '#007bff', textDecoration: 'none' }}
                                                    >
                                                        {complaint.attachment_url.endsWith('.pdf') || complaint.attachment_url.includes('pdf')
                                                            ? '📄 View PDF'
                                                            : '🖼️ View Image'}
                                                    </a>
                                                ) : (
                                                    "-"
                                                )}
                                            </td>
                                            {(canEdit() || canDelete()) && (
                                                <td>
                                                    <div className="action-buttons">
                                                        {isClosed ? (
                                                            <button
                                                                className="btn-view"
                                                                onClick={() => handleView(complaint)}
                                                            >
                                                                👁️ View
                                                            </button>
                                                        ) : (
                                                            <>
                                                                {canEdit() && (
                                                                    <button
                                                                        className="btn-edit"
                                                                        onClick={() => handleEdit(complaint)}
                                                                    >
                                                                        ✏️ Edit
                                                                    </button>
                                                                )}
                                                                {canDelete() && (
                                                                    <button
                                                                        className="btn-delete"
                                                                        onClick={() => handleDeleteClick(complaint)}
                                                                    >
                                                                        🗑️ Delete
                                                                    </button>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="pagination">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                            >
                                Previous
                            </button>
                            <span>
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                            >
                                Next
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Delete Modal */}
            {deleteModal.show && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Delete Complaint</h3>
                        <p>Are you sure you want to delete "{deleteModal.title}"?</p>
                        <div className="modal-actions">
                            <button className="btn-delete" onClick={handleDeleteConfirm}>
                                Delete
                            </button>
                            <button className="btn-cancel" onClick={() => setDeleteModal({ show: false, id: null, title: "" })}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Modal for Closed Complaints */}
            {viewModal.show && viewModal.complaint && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h3>View Complaint Details</h3>
                        <div style={{ marginTop: '20px' }}>
                            <div style={{ marginBottom: '15px' }}>
                                <strong>Complaint ID:</strong> {viewModal.complaint.complaint_id}
                            </div>
                            <div style={{ marginBottom: '15px' }}>
                                <strong>Owner:</strong> {owners.find(o => o.owner_id === viewModal.complaint.owner_id)?.owner_name || "-"}
                            </div>
                            <div style={{ marginBottom: '15px' }}>
                                <strong>Title:</strong> {viewModal.complaint.complaint_title || "-"}
                            </div>
                            <div style={{ marginBottom: '15px' }}>
                                <strong>Type:</strong> {viewModal.complaint.complaint_type || "-"}
                            </div>
                            <div style={{ marginBottom: '15px' }}>
                                <strong>Priority:</strong> {getPriorityBadge(viewModal.complaint.priority || "medium")}
                            </div>
                            <div style={{ marginBottom: '15px' }}>
                                <strong>Status:</strong> {getStatusBadge(viewModal.complaint.status || "pending")}
                            </div>
                            {(canEdit() || !isOwnerRole()) && viewModal.complaint.assigned_to && (
                                <div style={{ marginBottom: '15px' }}>
                                    <strong>Assigned To:</strong> {viewModal.complaint.assigned_to}
                                </div>
                            )}
                            <div style={{ marginBottom: '15px' }}>
                                <strong>Description:</strong>
                                <div style={{ marginTop: '5px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                                    {viewModal.complaint.complaint_description || "-"}
                                </div>
                            </div>
                            {(canEdit() || !isOwnerRole()) && viewModal.complaint.resolution_notes && (
                                <div style={{ marginBottom: '15px' }}>
                                    <strong>Resolution Notes:</strong>
                                    <div style={{ marginTop: '5px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                                        {viewModal.complaint.resolution_notes}
                                    </div>
                                </div>
                            )}
                            {viewModal.complaint.attachment_url && (
                                <div style={{ marginBottom: '15px' }}>
                                    <strong>Attachment:</strong>
                                    <div style={{ marginTop: '5px' }}>
                                        <a
                                            href={viewModal.complaint.attachment_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ color: '#007bff', textDecoration: 'none' }}
                                        >
                                            {viewModal.complaint.attachment_url.endsWith('.pdf') || viewModal.complaint.attachment_url.includes('pdf')
                                                ? '📄 View PDF'
                                                : '🖼️ View Image'}
                                        </a>
                                    </div>
                                </div>
                            )}
                            <div style={{ marginBottom: '15px' }}>
                                <strong>Created Date:</strong> {viewModal.complaint.created_at ? new Date(viewModal.complaint.created_at).toLocaleString('en-IN') : "-"}
                            </div>
                            {viewModal.complaint.updated_at && (
                                <div style={{ marginBottom: '15px' }}>
                                    <strong>Last Updated:</strong> {new Date(viewModal.complaint.updated_at).toLocaleString('en-IN')}
                                </div>
                            )}
                        </div>
                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={() => setViewModal({ show: false, complaint: null })}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ComplaintBox;

