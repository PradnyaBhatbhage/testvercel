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
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [filePreviews, setFilePreviews] = useState([]);
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
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
        const validFiles = [];
        const validPreviews = [];

        files.forEach((file) => {
            // Validate file type
            if (!validTypes.includes(file.type)) {
                alert(`File "${file.name}" is not a valid type. Please select PDF or JPEG/PNG image files only.`);
                return;
            }

            // Validate file size (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
                alert(`File "${file.name}" is too large. Maximum size is 10MB.`);
                return;
            }

            validFiles.push(file);

            // Create preview for images
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    validPreviews.push(reader.result);
                    if (validPreviews.length === validFiles.length) {
                        setFilePreviews(prev => [...prev, ...validPreviews]);
                    }
                };
                reader.readAsDataURL(file);
            } else {
                validPreviews.push(null);
            }
        });

        // Append new files to existing selected files
        setSelectedFiles(prev => [...prev, ...validFiles]);

        // Set previews immediately for non-image files
        if (validPreviews.length === validFiles.length && validPreviews.every(p => p === null || p)) {
            setFilePreviews(prev => [...prev, ...validPreviews]);
        }

        // Reset file input to allow selecting same files again
        e.target.value = '';
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
        setSelectedFiles([]);
        setFilePreviews([]);
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
                await updateComplaint(editingId, submitData, selectedFiles.length > 0 ? selectedFiles : null);
                alert("Complaint updated successfully!");
            } else {
                await addComplaint(submitData, selectedFiles.length > 0 ? selectedFiles : null);
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
        setSelectedFiles([]);
        
        // Handle existing attachments - support both single URL and array of URLs
        let existingUrls = [];
        if (complaint.attachment_url) {
            try {
                if (Array.isArray(complaint.attachment_url)) {
                    existingUrls = complaint.attachment_url.filter(url => url && typeof url === 'string' && url.startsWith('http'));
                } else if (typeof complaint.attachment_url === 'string') {
                    try {
                        const parsed = JSON.parse(complaint.attachment_url);
                        if (Array.isArray(parsed)) {
                            existingUrls = parsed.filter(url => url && typeof url === 'string' && url.startsWith('http'));
                        } else if (parsed && typeof parsed === 'string' && parsed.startsWith('http')) {
                            existingUrls = [parsed];
                        }
                    } catch {
                        // Not JSON, treat as single URL
                        if (complaint.attachment_url.startsWith('http')) {
                            existingUrls = [complaint.attachment_url];
                        }
                    }
                }
            } catch (err) {
                console.error('Error parsing attachment_url:', err);
            }
        }
        setFilePreviews(existingUrls);
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
                        <label>Attachments (PDF/JPEG) - Multiple files allowed:</label>
                        <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={handleFileChange}
                            multiple
                            disabled={formData.status === "closed"}
                        />
                        
                        {/* Display existing attachments (when editing) */}
                        {filePreviews.length > 0 && selectedFiles.length === 0 && editingId && (
                            <div style={{ marginTop: '10px' }}>
                                <p style={{ fontSize: '12px', color: '#666', fontWeight: '600', marginBottom: '8px' }}>
                                    Existing attachments ({filePreviews.length}):
                                </p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                    {filePreviews.map((preview, idx) => (
                                        <div key={`existing-${idx}`} style={{ position: 'relative', border: '1px solid #ddd', padding: '5px', borderRadius: '4px' }}>
                                            {preview && preview.startsWith('http') ? (
                                                preview.includes('pdf') || preview.endsWith('.pdf') ? (
                                                    <a href={preview} target="_blank" rel="noopener noreferrer" style={{ color: '#007bff', fontSize: '12px' }}>
                                                        📄 PDF {idx + 1}
                                                    </a>
                                                ) : (
                                                    <img src={preview} alt={`Attachment ${idx + 1}`} style={{ maxWidth: '100px', maxHeight: '100px', display: 'block' }} />
                                                )
                                            ) : null}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Display all files (existing + new) */}
                        {(filePreviews.length > 0 || selectedFiles.length > 0) && (
                            <div style={{ marginTop: '10px' }}>
                                <p style={{ fontSize: '12px', color: '#666', fontWeight: '600', marginBottom: '8px' }}>
                                    All attachments ({filePreviews.length + selectedFiles.length}):
                                </p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                    {/* Existing attachments (URLs) */}
                                    {filePreviews.map((preview, idx) => {
                                        if (!preview || !preview.startsWith('http')) return null;
                                        return (
                                            <div key={`existing-${idx}`} style={{ position: 'relative', border: '1px solid #ddd', padding: '5px', borderRadius: '4px' }}>
                                                {preview.includes('pdf') || preview.endsWith('.pdf') ? (
                                                    <a href={preview} target="_blank" rel="noopener noreferrer" style={{ color: '#007bff', fontSize: '12px' }}>
                                                        📄 PDF {idx + 1}
                                                    </a>
                                                ) : (
                                                    <img src={preview} alt={`Attachment ${idx + 1}`} style={{ maxWidth: '100px', maxHeight: '100px', display: 'block' }} />
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (!window.confirm('Are you sure you want to delete this attachment?')) {
                                                            return;
                                                        }
                                                        // Remove from filePreviews
                                                        const updatedPreviews = filePreviews.filter((_, i) => i !== idx);
                                                        setFilePreviews(updatedPreviews);
                                                        
                                                        // Update formData.attachment_url to reflect the change
                                                        const updatedUrlsJson = updatedPreviews.length > 0 ? JSON.stringify(updatedPreviews) : null;
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            attachment_url: updatedUrlsJson
                                                        }));
                                                    }}
                                                    style={{
                                                        position: 'absolute',
                                                        top: '-5px',
                                                        right: '-5px',
                                                        background: '#dc3545',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '50%',
                                                        width: '20px',
                                                        height: '20px',
                                                        cursor: 'pointer',
                                                        fontSize: '12px',
                                                        lineHeight: '1'
                                                    }}
                                                    title="Delete attachment"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        );
                                    })}
                                    
                                    {/* New selected files */}
                                    {selectedFiles.map((file, idx) => {
                                        // Find preview for this file (should be at index: filePreviews.length + idx)
                                        const previewIndex = filePreviews.length + idx;
                                        const preview = previewIndex < filePreviews.length ? filePreviews[previewIndex] : null;
                                        
                                        return (
                                            <div key={`new-${idx}`} style={{ position: 'relative', border: '1px solid #ddd', padding: '5px', borderRadius: '4px' }}>
                                                {file.type === 'application/pdf' ? (
                                                    <span style={{ fontSize: '12px', color: '#007bff' }}>📄 {file.name}</span>
                                                ) : preview ? (
                                                    <img src={preview} alt={file.name} style={{ maxWidth: '100px', maxHeight: '100px', display: 'block' }} />
                                                ) : (
                                                    <span style={{ fontSize: '12px' }}>🖼️ {file.name}</span>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const updated = selectedFiles.filter((_, i) => i !== idx);
                                                        setSelectedFiles(updated);
                                                        // Remove corresponding preview if it exists
                                                        if (previewIndex < filePreviews.length) {
                                                            const updatedPreviews = filePreviews.filter((_, i) => i !== previewIndex);
                                                            setFilePreviews(updatedPreviews);
                                                        }
                                                    }}
                                                    style={{
                                                        position: 'absolute',
                                                        top: '-5px',
                                                        right: '-5px',
                                                        background: '#dc3545',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '50%',
                                                        width: '20px',
                                                        height: '20px',
                                                        cursor: 'pointer',
                                                        fontSize: '12px',
                                                        lineHeight: '1'
                                                    }}
                                                    title="Remove file"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
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
                                                {(() => {
                                                    let attachments = [];
                                                    if (complaint.attachment_url) {
                                                        try {
                                                            if (Array.isArray(complaint.attachment_url)) {
                                                                // Already an array from backend
                                                                attachments = complaint.attachment_url.filter(url => url && typeof url === 'string' && url.trim().length > 0);
                                                            } else if (typeof complaint.attachment_url === 'string') {
                                                                // Try to parse as JSON
                                                                try {
                                                                    const parsed = JSON.parse(complaint.attachment_url);
                                                                    if (Array.isArray(parsed)) {
                                                                        attachments = parsed.filter(url => url && typeof url === 'string' && url.trim().length > 0);
                                                                    } else if (parsed && typeof parsed === 'string' && parsed.trim().length > 0) {
                                                                        attachments = [parsed];
                                                                    }
                                                                } catch {
                                                                    // Not JSON, treat as single URL string
                                                                    if (complaint.attachment_url.trim().length > 0) {
                                                                        attachments = [complaint.attachment_url];
                                                                    }
                                                                }
                                                            }
                                                        } catch (err) {
                                                            console.error('Error parsing attachment_url:', err, complaint.attachment_url);
                                                            attachments = [];
                                                        }
                                                    }
                                                    
                                                    if (attachments.length === 0) {
                                                        return <span style={{ color: '#999' }}>-</span>;
                                                    }
                                                    
                                                    return (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                                            {attachments.map((url, idx) => {
                                                                if (!url || typeof url !== 'string' || url.trim().length === 0) return null;
                                                                const isPdf = url.includes('pdf') || url.endsWith('.pdf') || url.toLowerCase().includes('application/pdf');
                                                                return (
                                                                    <a
                                                                        key={idx}
                                                                        href={url}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        style={{ color: '#007bff', textDecoration: 'none', fontSize: '12px' }}
                                                                    >
                                                                        {isPdf ? `📄 PDF ${idx + 1}` : `🖼️ Image ${idx + 1}`}
                                                                    </a>
                                                                );
                                                            })}
                                                        </div>
                                                    );
                                                })()}
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
                <div className="modal-overlay" onClick={() => setViewModal({ show: false, complaint: null })}>
                    <div 
                        className="modal-content" 
                        style={{ 
                            maxWidth: '700px', 
                            width: '90%',
                            maxHeight: '90vh', 
                            overflowY: 'auto',
                            margin: 'auto',
                            position: 'relative',
                            padding: '30px'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #e9ecef', paddingBottom: '15px' }}>
                            <h3 style={{ margin: 0, color: 'var(--primary)', fontSize: '24px', fontWeight: '700' }}>View Complaint Details</h3>
                            <button
                                onClick={() => setViewModal({ show: false, complaint: null })}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '28px',
                                    cursor: 'pointer',
                                    color: '#666',
                                    padding: '0',
                                    width: '30px',
                                    height: '30px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '50%',
                                    transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f0f0'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                title="Close"
                            >
                                ×
                            </button>
                        </div>
                        <div style={{ marginTop: '20px', paddingLeft: '0', paddingRight: '0' }}>
                            <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'flex-start' }}>
                                <strong style={{ minWidth: '140px', color: '#495057' }}>Complaint ID:</strong>
                                <span style={{ color: '#212529' }}>{viewModal.complaint.complaint_id}</span>
                            </div>
                            <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'flex-start' }}>
                                <strong style={{ minWidth: '140px', color: '#495057' }}>Owner:</strong>
                                <span style={{ color: '#212529' }}>{owners.find(o => o.owner_id === viewModal.complaint.owner_id)?.owner_name || "-"}</span>
                            </div>
                            <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'flex-start' }}>
                                <strong style={{ minWidth: '140px', color: '#495057' }}>Title:</strong>
                                <span style={{ color: '#212529' }}>{viewModal.complaint.complaint_title || "-"}</span>
                            </div>
                            <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'flex-start' }}>
                                <strong style={{ minWidth: '140px', color: '#495057' }}>Type:</strong>
                                <span style={{ color: '#212529' }}>{viewModal.complaint.complaint_type || "-"}</span>
                            </div>
                            <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'flex-start' }}>
                                <strong style={{ minWidth: '140px', color: '#495057' }}>Priority:</strong>
                                <span>{getPriorityBadge(viewModal.complaint.priority || "medium")}</span>
                            </div>
                            <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'flex-start' }}>
                                <strong style={{ minWidth: '140px', color: '#495057' }}>Status:</strong>
                                <span>{getStatusBadge(viewModal.complaint.status || "pending")}</span>
                            </div>
                            {(canEdit() || !isOwnerRole()) && viewModal.complaint.assigned_to && (
                                <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'flex-start' }}>
                                    <strong style={{ minWidth: '140px', color: '#495057' }}>Assigned To:</strong>
                                    <span style={{ color: '#212529' }}>{viewModal.complaint.assigned_to}</span>
                                </div>
                            )}
                            <div style={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                                <strong style={{ marginBottom: '8px', color: '#495057' }}>Description:</strong>
                                <div style={{ padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '6px', color: '#212529', lineHeight: '1.6' }}>
                                    {viewModal.complaint.complaint_description || "-"}
                                </div>
                            </div>
                            {(canEdit() || !isOwnerRole()) && viewModal.complaint.resolution_notes && (
                                <div style={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                                    <strong style={{ marginBottom: '8px', color: '#495057' }}>Resolution Notes:</strong>
                                    <div style={{ padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '6px', color: '#212529', lineHeight: '1.6' }}>
                                        {viewModal.complaint.resolution_notes}
                                    </div>
                                </div>
                            )}
                            {(() => {
                                let attachments = [];
                                if (viewModal.complaint && viewModal.complaint.attachment_url) {
                                    try {
                                        if (Array.isArray(viewModal.complaint.attachment_url)) {
                                            // Already an array from backend
                                            attachments = viewModal.complaint.attachment_url.filter(url => url && typeof url === 'string' && url.trim().length > 0);
                                        } else if (typeof viewModal.complaint.attachment_url === 'string') {
                                            // Try to parse as JSON
                                            try {
                                                const parsed = JSON.parse(viewModal.complaint.attachment_url);
                                                if (Array.isArray(parsed)) {
                                                    attachments = parsed.filter(url => url && typeof url === 'string' && url.trim().length > 0);
                                                } else if (parsed && typeof parsed === 'string' && parsed.trim().length > 0) {
                                                    attachments = [parsed];
                                                }
                                            } catch {
                                                // Not JSON, treat as single URL string
                                                if (viewModal.complaint.attachment_url.trim().length > 0) {
                                                    attachments = [viewModal.complaint.attachment_url];
                                                }
                                            }
                                        }
                                    } catch (err) {
                                        console.error('Error parsing attachment_url in view modal:', err, viewModal.complaint.attachment_url);
                                        attachments = [];
                                    }
                                }
                                
                                if (attachments.length === 0) return null;
                                
                                return (
                                    <div style={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                                        <strong style={{ marginBottom: '8px', color: '#495057' }}>Attachments:</strong>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {attachments.map((url, idx) => {
                                                if (!url || typeof url !== 'string' || url.trim().length === 0) return null;
                                                const isPdf = url.includes('pdf') || url.endsWith('.pdf') || url.toLowerCase().includes('application/pdf');
                                                return (
                                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <a
                                                            href={url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            style={{ 
                                                                color: '#007bff', 
                                                                textDecoration: 'none',
                                                                padding: '8px 12px',
                                                                backgroundColor: '#f8f9fa',
                                                                borderRadius: '4px',
                                                                display: 'inline-block',
                                                                width: 'fit-content',
                                                                transition: 'background-color 0.2s',
                                                                flex: 1
                                                            }}
                                                            onMouseEnter={(e) => e.target.style.backgroundColor = '#e9ecef'}
                                                            onMouseLeave={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                                                        >
                                                            {isPdf ? `📄 PDF ${idx + 1}` : `🖼️ Image ${idx + 1}`}
                                                        </a>
                                                        {canEdit() && viewModal.complaint && (
                                                            <button
                                                                onClick={async () => {
                                                                    if (!window.confirm('Are you sure you want to delete this attachment?')) {
                                                                        return;
                                                                    }
                                                                    try {
                                                                        // Remove from attachments array
                                                                        const updatedAttachments = attachments.filter((_, i) => i !== idx);
                                                                        const updatedUrlsJson = updatedAttachments.length > 0 ? JSON.stringify(updatedAttachments) : null;
                                                                        
                                                                        // Update the complaint record
                                                                        await updateComplaint(viewModal.complaint.complaint_id, { attachment_url: updatedUrlsJson }, null);
                                                                        
                                                                        // Refresh complaints list
                                                                        await fetchComplaints();
                                                                        
                                                                        // Update view modal
                                                                        setViewModal(prev => ({
                                                                            ...prev,
                                                                            complaint: {
                                                                                ...prev.complaint,
                                                                                attachment_url: updatedUrlsJson
                                                                            }
                                                                        }));
                                                                        
                                                                        alert('Attachment deleted successfully!');
                                                                    } catch (error) {
                                                                        console.error('Error deleting attachment:', error);
                                                                        alert('Error deleting attachment. Please try again.');
                                                                    }
                                                                }}
                                                                style={{
                                                                    background: '#dc3545',
                                                                    color: 'white',
                                                                    border: 'none',
                                                                    padding: '8px 12px',
                                                                    borderRadius: '4px',
                                                                    cursor: 'pointer',
                                                                    fontWeight: '500',
                                                                    fontSize: '12px'
                                                                }}
                                                            >
                                                                Delete
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })()}
                            <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'flex-start' }}>
                                <strong style={{ minWidth: '140px', color: '#495057' }}>Created Date:</strong>
                                <span style={{ color: '#212529' }}>{viewModal.complaint.created_at ? new Date(viewModal.complaint.created_at).toLocaleString('en-IN') : "-"}</span>
                            </div>
                            {viewModal.complaint.updated_at && (
                                <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'flex-start' }}>
                                    <strong style={{ minWidth: '140px', color: '#495057' }}>Last Updated:</strong>
                                    <span style={{ color: '#212529' }}>{new Date(viewModal.complaint.updated_at).toLocaleString('en-IN')}</span>
                                </div>
                            )}
                        </div>
                        <div className="modal-actions" style={{ marginTop: '25px', paddingTop: '20px', borderTop: '1px solid #e9ecef' }}>
                            <button 
                                className="btn-cancel" 
                                onClick={() => setViewModal({ show: false, complaint: null })}
                                style={{ width: '100%', padding: '12px', fontSize: '16px' }}
                            >
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

