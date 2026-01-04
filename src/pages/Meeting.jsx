import React, { useEffect, useState } from "react";
import {
    getMeetings,
    createMeeting,
    updateMeeting,
    deleteMeeting,
    getWings,
    getOwners,
    getRentals,
    getMeetingAttendance,
    updateMeetingAttendance,
    getAbsenteeWarnings,
    sendAbsenteeWarningByEmail,
    sendAbsenteeWarningByWhatsApp,
    sendAbsenteeWarningBySMS,
} from "../services/api";
import { getCurrentUserWingId, filterByWing, filterOwnersByWing } from "../utils/wingFilter";
import { canEdit, canDelete } from "../utils/ownerFilter";
import "../css/Meeting.css";

const Meeting = () => {
    const [meetings, setMeetings] = useState([]);
    const [wings, setWings] = useState([]);
    const [owners, setOwners] = useState([]);
    const [rentals, setRentals] = useState([]);
    const [absenteeWarnings, setAbsenteeWarnings] = useState([]);
    const [formData, setFormData] = useState({
        wing_id: "",
        meeting_name: "",
        purpose: "",
        meeting_date: "",
        description: "",
    });
    const [editingId, setEditingId] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [filePreviews, setFilePreviews] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [attendanceModal, setAttendanceModal] = useState({
        show: false,
        meetingId: null,
        meetingName: "",
        wingId: null,
    });
    const [attendance, setAttendance] = useState({}); // { flat_id: is_present }

    // Get current user's wing_id
    const currentUserWingId = getCurrentUserWingId();

    // Fetch meetings
    const fetchMeetings = async () => {
        try {
            const { data } = await getMeetings();
            const rawMeetings = data || [];

            // Filter meetings by current user's wing
            if (currentUserWingId !== null) {
                const filteredMeetings = filterByWing(rawMeetings, currentUserWingId, 'wing_id');
                setMeetings(filteredMeetings);
            } else {
                setMeetings(rawMeetings);
            }
        } catch (error) {
            console.error("Error fetching meetings:", error);
        }
    };

    // ✅ Fetch wings for dropdown
    const fetchWings = async () => {
        try {
            const { data } = await getWings();
            // Filter wings by current user's wing_id
            const allWings = data || [];
            if (currentUserWingId !== null) {
                const filteredWings = allWings.filter(wing => Number(wing.wing_id) === Number(currentUserWingId));
                setWings(filteredWings);
            } else {
                setWings(allWings);
            }
        } catch (error) {
            console.error("Error fetching wings:", error);
        }
    };

    useEffect(() => {
        fetchMeetings();
        fetchWings();
        fetchOwners();
        fetchRentals();
        fetchAbsenteeWarnings();
    }, []);

    const fetchOwners = async () => {
        try {
            const res = await getOwners();
            const rawOwners = res.data || [];
            if (currentUserWingId !== null) {
                const filteredOwners = filterOwnersByWing(rawOwners, currentUserWingId);
                setOwners(filteredOwners);
            } else {
                setOwners(rawOwners);
            }
        } catch (error) {
            console.error("Error fetching owners:", error);
        }
    };

    const fetchRentals = async () => {
        try {
            const res = await getRentals();
            setRentals(res.data || []);
        } catch (error) {
            console.error("Error fetching rentals:", error);
        }
    };

    const fetchAbsenteeWarnings = async () => {
        try {
            const res = await getAbsenteeWarnings();
            setAbsenteeWarnings(res.data || []);
        } catch (error) {
            console.error("Error fetching absentee warnings:", error);
        }
    };

    // Handle input change
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
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

    // Submit form (create or update)
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await updateMeeting(editingId, formData, selectedFiles.length > 0 ? selectedFiles : null);
                alert("Meeting updated successfully!");
            } else {
                await createMeeting(formData, selectedFiles.length > 0 ? selectedFiles : null);
                alert("Meeting added successfully!");
            }
            setFormData({
                wing_id: "",
                meeting_name: "",
                purpose: "",
                meeting_date: "",
                description: "",
            });
            setEditingId(null);
            setShowForm(false);
            setSelectedFiles([]);
            setFilePreviews([]);
            fetchMeetings();
        } catch (error) {
            console.error("Error saving meeting:", error);
            const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || "Unknown error";
            alert("Error saving meeting: " + errorMessage);
        }
    };

    // Edit meeting
    const handleEdit = (meeting) => {
        setFormData({
            wing_id: meeting.wing_id,
            meeting_name: meeting.meeting_name,
            purpose: meeting.purpose,
            meeting_date: meeting.meeting_date?.split("T")[0],
            description: meeting.description,
            attachment_url: meeting.attachment_url || null,
        });
        setEditingId(meeting.meeting_id);
        setSelectedFiles([]);
        
        // Handle existing attachments - support both single URL and array of URLs
        let existingUrls = [];
        if (meeting.attachment_url) {
            try {
                if (Array.isArray(meeting.attachment_url)) {
                    existingUrls = meeting.attachment_url.filter(url => url && typeof url === 'string' && url.startsWith('http'));
                } else if (typeof meeting.attachment_url === 'string') {
                    try {
                        const parsed = JSON.parse(meeting.attachment_url);
                        if (Array.isArray(parsed)) {
                            existingUrls = parsed.filter(url => url && typeof url === 'string' && url.startsWith('http'));
                        } else if (parsed && typeof parsed === 'string' && parsed.startsWith('http')) {
                            existingUrls = [parsed];
                        }
                    } catch {
                        // Not JSON, treat as single URL
                        if (meeting.attachment_url.startsWith('http')) {
                            existingUrls = [meeting.attachment_url];
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

    // Delete meeting
    const handleDelete = async (id) => {
        const reason = prompt("Enter reason for deletion:");
        if (!reason) return;
        try {
            await deleteMeeting(id, reason);
            alert("Meeting deleted successfully!");
            fetchMeetings();
        } catch (error) {
            alert("Error deleting meeting!");
            console.error(error);
        }
    };

    // Cancel form
    const handleCancel = () => {
        // Auto-set wing_id to current user's wing when resetting for new entry
        let defaultWingId = "";
        if (wings.length > 0) {
            defaultWingId = wings[0].wing_id;
        } else if (currentUserWingId !== null) {
            defaultWingId = currentUserWingId;
        }
        
        setFormData({
            wing_id: defaultWingId,
            meeting_name: "",
            purpose: "",
            meeting_date: "",
            description: "",
        });
        setEditingId(null);
        setSelectedFiles([]);
        setFilePreviews([]);
        setShowForm(false);
    };

    // Open attendance modal
    const handleOpenAttendance = async (meeting) => {
        try {
            // Fetch existing attendance
            const res = await getMeetingAttendance(meeting.meeting_id);
            const existingAttendance = {};

            // Handle different response formats
            const attendanceData = Array.isArray(res.data) ? res.data : (res.data?.data || []);
            attendanceData.forEach(item => {
                if (item.flat_id) {
                    existingAttendance[item.flat_id] = item.is_present === 1;
                }
            });

            // Get all flats for this meeting's wing
            const meetingWingId = meeting.wing_id;
            const wingOwners = currentUserWingId !== null
                ? owners.filter(o => Number(o.wing_id) === Number(meetingWingId))
                : owners.filter(o => Number(o.wing_id) === Number(meetingWingId));

            // Initialize attendance for all flats in the wing
            const initialAttendance = {};
            wingOwners.forEach(owner => {
                if (owner.flat_id) {
                    initialAttendance[owner.flat_id] = existingAttendance[owner.flat_id] || false;
                }
            });

            setAttendance(initialAttendance);
            setAttendanceModal({
                show: true,
                meetingId: meeting.meeting_id,
                meetingName: meeting.meeting_name,
                wingId: meeting.wing_id,
            });
        } catch (error) {
            console.error("Error fetching attendance:", error);
            const errorMessage = error.response?.data?.error || error.message || "Unknown error";
            console.error("Full error details:", {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });
            alert(`Error loading attendance data!\n\n${errorMessage}\n\nPlease check the browser console for more details.`);
        }
    };

    // Toggle attendance for a flat
    const handleToggleAttendance = (flatId) => {
        setAttendance(prev => ({
            ...prev,
            [flatId]: !prev[flatId]
        }));
    };

    // Save attendance
    const handleSaveAttendance = async () => {
        try {
            const attendanceArray = Object.entries(attendance).map(([flat_id, is_present]) => ({
                flat_id: parseInt(flat_id),
                is_present: is_present
            }));

            await updateMeetingAttendance(attendanceModal.meetingId, attendanceArray);
            alert("Attendance saved successfully!");
            setAttendanceModal({ show: false, meetingId: null, meetingName: "", wingId: null });
            setAttendance({});
            fetchAbsenteeWarnings(); // Refresh warnings
        } catch (error) {
            console.error("Error saving attendance:", error);
            alert("Error saving attendance!");
        }
    };

    // Filter meetings
    const filteredMeetings = meetings.filter(
        (m) =>
            m.meeting_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.purpose?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Pagination logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentMeetings = filteredMeetings.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredMeetings.length / itemsPerPage);

    // Reset to page 1 when search changes
    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    return (
        <div className="meeting-container">
            <h2>Meeting Management</h2>

            {/* Controls (New Entry + Search) - Only show when form is not visible */}
            {!showForm && (
                <div className="meeting-controls">
                    {canEdit() && (
                        <button className="new-entry-btn" onClick={() => {
                            // Auto-set wing_id to current user's wing when creating new entry
                            if (wings.length > 0) {
                                setFormData(prev => ({ ...prev, wing_id: wings[0].wing_id }));
                            } else if (currentUserWingId !== null) {
                                setFormData(prev => ({ ...prev, wing_id: currentUserWingId }));
                            }
                            setShowForm(true);
                        }}>
                            New Entry
                        </button>
                    )}
                    <div className="search-bar">
                        <input
                            type="text"
                            placeholder="Search by Meeting Name or Purpose..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            )}

            {/* Form */}
            {showForm && (
                <form className="meeting-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Wing:</label>
                        <select
                            name="wing_id"
                            value={formData.wing_id}
                            onChange={handleChange}
                            required
                            disabled={currentUserWingId !== null && wings.length === 1}
                        >
                            <option value="">Select Wing</option>
                            {wings.map((wing) => (
                                <option key={wing.wing_id} value={wing.wing_id}>
                                    {wing.wing_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Meeting Name:</label>
                        <input
                            type="text"
                            name="meeting_name"
                            value={formData.meeting_name}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Purpose:</label>
                        <input
                            type="text"
                            name="purpose"
                            value={formData.purpose}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="form-group">
                        <label>Meeting Date:</label>
                        <input
                            type="date"
                            name="meeting_date"
                            value={formData.meeting_date}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Description:</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="form-group">
                        <label>Attachments (PDF/JPEG) - Multiple files allowed:</label>
                        <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={handleFileChange}
                            multiple
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
                        <button type="submit" className="submit-btn">
                            {editingId ? "Update Meeting" : "Add Meeting"}
                        </button>
                        <button type="button" className="cancel-btn" onClick={handleCancel}>
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            {/* Table - Only show when form is not visible */}
            {!showForm && (
                <>
                    <table className="meeting-table">
                    <thead>
                        <tr>
                            <th>Sr. No.</th>
                            <th>Wing</th>
                            <th>Meeting Name</th>
                            <th>Purpose</th>
                            <th>Date</th>
                            <th>Description</th>
                            <th>Attachment</th>
                            {(canEdit() || canDelete()) && <th>Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredMeetings.length > 0 ? (
                            currentMeetings.map((m, index) => (
                                <tr key={m.meeting_id}>
                                    <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                    <td>
                                        {wings.find((w) => w.wing_id === m.wing_id)?.wing_name || m.wing_id}
                                    </td>
                                    <td>{m.meeting_name}</td>
                                    <td>{m.purpose}</td>
                                    <td>{m.meeting_date ? m.meeting_date.split("T")[0] : ""}</td>
                                    <td>{m.description}</td>
                                    <td>
                                        {(() => {
                                            let attachments = [];
                                            if (m.attachment_url) {
                                                try {
                                                    if (Array.isArray(m.attachment_url)) {
                                                        attachments = m.attachment_url;
                                                    } else if (typeof m.attachment_url === 'string') {
                                                        try {
                                                            const parsed = JSON.parse(m.attachment_url);
                                                            attachments = Array.isArray(parsed) ? parsed : [parsed];
                                                        } catch {
                                                            attachments = [m.attachment_url];
                                                        }
                                                    }
                                                } catch {
                                                    attachments = [];
                                                }
                                            }
                                            
                                            if (attachments.length === 0) {
                                                return <span style={{ color: '#999' }}>No attachment</span>;
                                            }
                                            
                                            return (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                                    {attachments.map((url, idx) => (
                                                        <a
                                                            key={idx}
                                                            href={url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            style={{ color: '#007bff', textDecoration: 'none', fontSize: '12px' }}
                                                        >
                                                            {url.includes('pdf') || url.endsWith('.pdf') ? `📄 PDF ${idx + 1}` : `🖼️ Image ${idx + 1}`}
                                                        </a>
                                                    ))}
                                                </div>
                                            );
                                        })()}
                                    </td>
                                    {(canEdit() || canDelete()) && (
                                        <td>
                                            {canEdit() && (
                                                <button onClick={() => handleEdit(m)}>Edit</button>
                                            )}
                                            {canDelete() && (
                                                <button onClick={() => handleDelete(m.meeting_id)}>Delete</button>
                                            )}
                                            {canEdit() && (
                                                <button
                                                    onClick={() => handleOpenAttendance(m)}
                                                    style={{ backgroundColor: '#4CAF50', color: 'white', marginLeft: '5px' }}
                                                >
                                                    📋 Attendance
                                                </button>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={(canEdit() || canDelete()) ? "8" : "7"} style={{ textAlign: "center" }}>
                                    No meetings found.
                                </td>
                            </tr>
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

            {/* Absentee Warnings Section - Only show when form is not visible */}
            {!showForm && absenteeWarnings.length > 0 && (
                <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#fff3cd', borderRadius: '8px', border: '2px solid #ffc107' }}>
                    <h3 style={{ color: '#856404', marginBottom: '15px' }}>⚠️ Absentee Warnings</h3>
                    <p style={{ color: '#856404', marginBottom: '15px' }}>
                        The following owners/rentals have missed 3 or more consecutive meetings:
                    </p>
                    <table className="meeting-table" style={{ backgroundColor: 'white' }}>
                        <thead>
                            <tr>
                                <th>Flat No</th>
                                <th>Owner/Tenant Name</th>
                                <th>Contact</th>
                                <th>Consecutive Absences</th>
                                <th>Send Warning</th>
                            </tr>
                        </thead>
                        <tbody>
                            {absenteeWarnings.map((warning, index) => (
                                <tr key={index} style={{ backgroundColor: '#fff3cd' }}>
                                    <td>{warning.flat_no}</td>
                                    <td>{warning.owner_name || warning.tenant_name || 'N/A'}</td>
                                    <td>{warning.owner_contactno || 'N/A'}</td>
                                    <td style={{ fontWeight: 'bold', color: '#dc3545' }}>
                                        {warning.consecutive_absences} meetings
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        const res = await sendAbsenteeWarningByEmail(warning.owner_id);
                                                        alert(`Warning email sent successfully to ${warning.owner_email || 'owner'}!`);
                                                    } catch (error) {
                                                        console.error("Error sending email:", error);
                                                        const errorMessage = error.response?.data?.error || error.message || "Failed to send email";
                                                        alert(`Failed to send email warning.\n\n${errorMessage}`);
                                                    }
                                                }}
                                                style={{
                                                    padding: '5px 10px',
                                                    backgroundColor: '#007bff',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                    fontSize: '12px'
                                                }}
                                                title="Send warning via Email"
                                            >
                                                📧 Email
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        const res = await sendAbsenteeWarningByWhatsApp(warning.owner_id);
                                                        const data = res.data || res;

                                                        if (data.whatsappLink) {
                                                            window.open(data.whatsappLink, '_blank');
                                                            alert(`WhatsApp opened! The warning message is ready to send to ${data.phoneNumber}.\n\nJust click send in WhatsApp.`);
                                                        } else {
                                                            alert("WhatsApp link generated successfully!");
                                                        }
                                                    } catch (error) {
                                                        console.error("Error sending WhatsApp:", error);
                                                        const errorMessage = error.response?.data?.error || error.message || "Failed to generate WhatsApp link";
                                                        alert(`Failed to generate WhatsApp link.\n\n${errorMessage}`);
                                                    }
                                                }}
                                                style={{
                                                    padding: '5px 10px',
                                                    backgroundColor: '#25D366',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                    fontSize: '12px'
                                                }}
                                                title="Send warning via WhatsApp"
                                            >
                                                💬 WhatsApp
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        const res = await sendAbsenteeWarningBySMS(warning.owner_id);
                                                        const data = res.data || res;

                                                        if (data.smsLink) {
                                                            window.open(data.smsLink, '_blank');
                                                            alert(`SMS app opened! The warning message is ready to send to ${data.phoneNumber}.\n\nJust click send in your SMS app.`);
                                                        } else if (data.messageId) {
                                                            alert(`SMS sent successfully! Message ID: ${data.messageId}`);
                                                        } else {
                                                            alert("SMS sent successfully!");
                                                        }
                                                    } catch (error) {
                                                        console.error("Error sending SMS:", error);
                                                        const errorMessage = error.response?.data?.error || error.message || "Failed to send SMS";
                                                        alert(`Failed to send SMS warning.\n\n${errorMessage}`);
                                                    }
                                                }}
                                                style={{
                                                    padding: '5px 10px',
                                                    backgroundColor: '#28a745',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                    fontSize: '12px'
                                                }}
                                                title="Send warning via SMS"
                                            >
                                                📱 SMS
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Attendance Modal */}
            {attendanceModal.show && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000
                    }}
                    onClick={() => setAttendanceModal({ show: false, meetingId: null, meetingName: "", wingId: null })}
                >
                    <div
                        style={{
                            backgroundColor: 'white',
                            padding: '30px',
                            borderRadius: '10px',
                            maxWidth: '800px',
                            width: '90%',
                            maxHeight: '80vh',
                            overflow: 'auto',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0 }}>📋 Attendance - {attendanceModal.meetingName}</h3>
                            <button
                                onClick={() => setAttendanceModal({ show: false, meetingId: null, meetingName: "", wingId: null })}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '24px',
                                    cursor: 'pointer',
                                    color: '#666'
                                }}
                            >
                                ×
                            </button>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <p><strong>Instructions:</strong> Check the box if the owner/tenant attended the meeting. Uncheck if absent.</p>
                        </div>

                        <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '20px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f5f5f5' }}>
                                        <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Flat No</th>
                                        <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Owner Name</th>
                                        <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Tenant Name</th>
                                        <th style={{ padding: '10px', textAlign: 'center', border: '1px solid #ddd' }}>Present</th>
                                        <th style={{ padding: '10px', textAlign: 'center', border: '1px solid #ddd' }}>Absent</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(() => {
                                        const meetingWingId = attendanceModal.wingId;
                                        const wingOwners = owners.filter(o => Number(o.wing_id) === Number(meetingWingId));

                                        // Get flat numbers from owners
                                        const flatMap = {};
                                        wingOwners.forEach(owner => {
                                            if (owner.flat_id && !owner.is_deleted) {
                                                // Match rental by owner_id (rental_detail doesn't have flat_id, it uses owner_id)
                                                // Also check if rental is currently active (within date range)
                                                const today = new Date();
                                                today.setHours(0, 0, 0, 0);
                                                const rental = rentals.find(r => {
                                                    if (r.owner_id !== owner.owner_id || r.is_deleted) return false;
                                                    // Check if rental is active (current date is between start_date and end_date)
                                                    if (r.start_date && r.end_date) {
                                                        const startDate = new Date(r.start_date);
                                                        const endDate = new Date(r.end_date);
                                                        startDate.setHours(0, 0, 0, 0);
                                                        endDate.setHours(23, 59, 59, 999);
                                                        return today >= startDate && today <= endDate;
                                                    }
                                                    // If no dates, consider it active
                                                    return true;
                                                });
                                                flatMap[owner.flat_id] = {
                                                    flat_no: owner.flat_no || 'N/A',
                                                    owner_name: owner.owner_name,
                                                    tenant_name: rental?.tenant_name || null,
                                                    is_rental: !!rental
                                                };
                                            }
                                        });

                                        const sortedFlats = Object.entries(flatMap).sort((a, b) => {
                                            const flatNoA = a[1].flat_no || '';
                                            const flatNoB = b[1].flat_no || '';
                                            return flatNoA.localeCompare(flatNoB, undefined, { numeric: true, sensitivity: 'base' });
                                        });

                                        return sortedFlats.map(([flatId, info]) => (
                                            <tr key={flatId}>
                                                <td style={{ padding: '10px', border: '1px solid #ddd' }}>{info.flat_no}</td>
                                                <td style={{ padding: '10px', border: '1px solid #ddd' }}>{info.owner_name || '-'}</td>
                                                <td style={{ padding: '10px', border: '1px solid #ddd' }}>{info.tenant_name || '-'}</td>
                                                <td style={{ padding: '10px', textAlign: 'center', border: '1px solid #ddd' }}>
                                                    <input
                                                        type="radio"
                                                        name={`attendance_${flatId}`}
                                                        checked={attendance[flatId] === true}
                                                        onChange={() => setAttendance(prev => ({ ...prev, [flatId]: true }))}
                                                        style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                                                    />
                                                </td>
                                                <td style={{ padding: '10px', textAlign: 'center', border: '1px solid #ddd' }}>
                                                    <input
                                                        type="radio"
                                                        name={`attendance_${flatId}`}
                                                        checked={attendance[flatId] === false}
                                                        onChange={() => setAttendance(prev => ({ ...prev, [flatId]: false }))}
                                                        style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                                                    />
                                                </td>
                                            </tr>
                                        ));
                                    })()}
                                </tbody>
                            </table>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setAttendanceModal({ show: false, meetingId: null, meetingName: "", wingId: null })}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: '#6c757d',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '5px',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveAttendance}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: '#28a745',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '5px',
                                    cursor: 'pointer'
                                }}
                            >
                                Save Attendance
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Meeting;