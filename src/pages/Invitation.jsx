import React, { useState, useEffect } from "react";
import {
    getInvitations,
    addInvitation,
    updateInvitation,
    deleteInvitation,
    sendInvitationEmail,
    sendInvitationWhatsApp,
    sendInvitationNotification,
    getOwners,
    getWings,
} from "../services/api";
import { canEdit, canDelete } from "../utils/ownerFilter";
import { getCurrentUserWingId, filterOwnersByWing } from "../utils/wingFilter";
import "../css/Invitation.css";

const Invitation = () => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const [invitations, setInvitations] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [searchText, setSearchText] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const [formData, setFormData] = useState({
        title: "",
        description: "",
    });

    const [selectedFiles, setSelectedFiles] = useState([]);
    const [filePreviews, setFilePreviews] = useState([]);
    const [owners, setOwners] = useState([]);
    const [wings, setWings] = useState([]);
    const [selectedRecipients, setSelectedRecipients] = useState([]);
    const [showSendModal, setShowSendModal] = useState(false);
    const [sendingInvitationId, setSendingInvitationId] = useState(null);
    const [sendTargetAudience, setSendTargetAudience] = useState('all');
    const [sendWingId, setSendWingId] = useState('');
    const [whatsappModal, setWhatsappModal] = useState({ show: false, links: [] });

    const currentUserWingId = getCurrentUserWingId();

    useEffect(() => {
        fetchInvitations();
        fetchOwners();
        fetchWings();
    }, []);

    const fetchInvitations = async () => {
        try {
            const res = await getInvitations();
            const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
            setInvitations(data);
        } catch (err) {
            console.error("Error fetching invitations:", err);
            alert("Error fetching invitations!");
        }
    };

    const fetchOwners = async () => {
        try {
            const res = await getOwners();
            let rawOwners = Array.isArray(res.data) ? res.data : res.data?.data || [];
            if (currentUserWingId !== null) {
                rawOwners = filterOwnersByWing(rawOwners, currentUserWingId);
            }
            setOwners(rawOwners);
        } catch (err) {
            console.error("Error fetching owners:", err);
        }
    };

    const fetchWings = async () => {
        try {
            const res = await getWings();
            const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
            setWings(data);
        } catch (err) {
            console.error("Error fetching wings:", err);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const validFiles = [];
        const validPreviews = [];

        files.forEach((file) => {
            // Validate file type
            const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
            if (!validTypes.includes(file.type)) {
                alert(`File "${file.name}" is not a valid PDF or JPEG/PNG image file.`);
                return;
            }

            // Validate file size (10MB)
            if (file.size > 10 * 1024 * 1024) {
                alert(`File "${file.name}" size should be less than 10MB.`);
                return;
            }

            validFiles.push(file);
            
            // Create preview for images
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    validPreviews.push(e.target.result);
                    setFilePreviews([...filePreviews, ...validPreviews]);
                };
                reader.readAsDataURL(file);
            } else {
                validPreviews.push(null);
            }
        });

        // Append new files to existing ones
        setSelectedFiles([...selectedFiles, ...validFiles]);
    };

    const removeFile = (index) => {
        const updatedFiles = selectedFiles.filter((_, i) => i !== index);
        const updatedPreviews = filePreviews.filter((_, i) => i !== index);
        setSelectedFiles(updatedFiles);
        setFilePreviews(updatedPreviews);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.title.trim()) {
            alert("Please enter a title");
            return;
        }

        try {
            const dataToSend = {
                ...formData,
                created_by: user.user_id,
            };

            if (isEditing) {
                await updateInvitation(editingId, dataToSend, selectedFiles);
                alert("Invitation updated successfully!");
            } else {
                await addInvitation(dataToSend, selectedFiles);
                alert("Invitation added successfully!");
            }

            resetForm();
            fetchInvitations();
        } catch (err) {
            console.error(err);
            alert("Error saving invitation!");
        }
    };

    const handleEdit = (invitation) => {
        setFormData({
            title: invitation.title || "",
            description: invitation.description || "",
        });
        setEditingId(invitation.invitation_id);
        setIsEditing(true);
        setShowForm(true);
        
        // Load existing files - filter out invalid URLs
        if (invitation.attachment_url) {
            let urls = [];
            if (Array.isArray(invitation.attachment_url)) {
                urls = invitation.attachment_url;
            } else if (typeof invitation.attachment_url === 'string') {
                try {
                    const parsed = JSON.parse(invitation.attachment_url);
                    urls = Array.isArray(parsed) ? parsed : [parsed];
                } catch (e) {
                    urls = [invitation.attachment_url];
                }
            }
            
            // Filter out invalid URLs
            const validUrls = urls.filter(url => isValidUrl(url));
            setFilePreviews(validUrls);
            setSelectedFiles([]); // Clear new files, existing ones are in previews
        } else {
            setFilePreviews([]);
            setSelectedFiles([]);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this invitation?")) {
            return;
        }
        const reason = prompt("Enter delete reason:");
        if (!reason || !reason.trim()) {
            alert("Delete reason is required");
            return;
        }

        try {
            await deleteInvitation(id, reason);
            alert("Invitation deleted successfully!");
            fetchInvitations();
        } catch (err) {
            console.error(err);
            alert("Error deleting invitation!");
        }
    };

    const resetForm = () => {
        setFormData({
            title: "",
            description: "",
        });
        setSelectedFiles([]);
        setFilePreviews([]);
        setIsEditing(false);
        setEditingId(null);
        setShowForm(false);
    };

    // Filter invitations based on search
    const filteredInvitations = invitations.filter((inv) => {
        if (!searchText) return true;
        const searchLower = searchText.toLowerCase();
        return (
            (inv.title?.toLowerCase().includes(searchLower)) ||
            (inv.description?.toLowerCase().includes(searchLower))
        );
    });

    // Pagination
    const totalPages = Math.ceil(filteredInvitations.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentInvitations = filteredInvitations.slice(startIndex, startIndex + itemsPerPage);

    // Helper function to get file name from URL
    const getFileName = (url) => {
        if (!url || typeof url !== 'string') return 'Unknown file';
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            const fileName = pathname.split('/').pop();
            return fileName || 'Unknown file';
        } catch (e) {
            // If URL parsing fails, try to extract from string
            const parts = url.split('/');
            return parts[parts.length - 1] || 'Unknown file';
        }
    };

    // Helper function to check if URL is valid
    const isValidUrl = (url) => {
        if (!url || typeof url !== 'string') return false;
        
        // Filter out invalid URLs like base64 strings or very short strings
        if (url.length < 10) return false;
        
        // Filter out common invalid patterns
        if (url === '2Q==' || url.trim() === '2Q==') return false;
        if (url.length < 20 && url.includes('==')) return false;
        if (/^[A-Za-z0-9+/=]+$/.test(url) && url.length < 50) {
            // Looks like base64, probably invalid
            return false;
        }
        
        // Check if it starts with http or https
        if (!url.startsWith('http://') && !url.startsWith('https://')) return false;
        
        // Check if it contains a valid domain pattern
        if (!url.includes('.') || url.split('.').length < 2) return false;
        
        try {
            const urlObj = new URL(url);
            // Additional validation: must have a valid hostname
            if (!urlObj.hostname || urlObj.hostname.length < 3) return false;
            return true;
        } catch {
            return false;
        }
    };

    return (
        <div className="invitation-container">
            <div className="invitation-header">
                <h2>🎉 Invitations</h2>
                {canEdit() && (
                    <button className="new-invitation-btn" onClick={() => {
                        resetForm();
                        setShowForm(true);
                    }}>
                        + New Invitation
                    </button>
                )}
            </div>

            {/* Search Bar */}
            <div className="invitation-search-bar">
                <input
                    type="text"
                    placeholder="Search by title or description..."
                    value={searchText}
                    onChange={(e) => {
                        setSearchText(e.target.value);
                        setCurrentPage(1);
                    }}
                    className="search-input"
                />
            </div>

            {/* Form */}
            {showForm && canEdit() && (
                <div className="invitation-form-container">
                    <div className="invitation-form">
                        <h3>{isEditing ? "Edit Invitation" : "Add New Invitation"}</h3>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Title *</label>
                                <input
                                    type="text"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    placeholder="Enter invitation title"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Description</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    rows="4"
                                    placeholder="Enter invitation description..."
                                />
                            </div>

                            <div className="form-group">
                                <label>Attachments (Images/PDF)</label>
                                <input
                                    type="file"
                                    multiple
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={handleFileChange}
                                />
                                <small>You can select multiple files (PDF, JPEG, PNG). Max 10MB per file.</small>
                            </div>

                            {/* Display selected files */}
                            {selectedFiles.length > 0 && (
                                <div className="selected-files">
                                    <h4>New Files to Upload:</h4>
                                    <ul>
                                        {selectedFiles.map((file, index) => (
                                            <li key={index}>
                                                {file.name}
                                                <button type="button" onClick={() => removeFile(index)}>Remove</button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Display existing files */}
                            {filePreviews.length > 0 && (
                                <div className="existing-files">
                                    <h4>Existing Attachments:</h4>
                                    <div className="files-list">
                                        {filePreviews
                                            .filter(url => isValidUrl(url))
                                            .map((url, index) => (
                                                <div key={index} className="file-item">
                                                    <a
                                                        href={url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="file-link"
                                                    >
                                                        {url.includes('pdf') || url.includes('.pdf')
                                                            ? '📄 ' + getFileName(url)
                                                            : '🖼️ ' + getFileName(url)}
                                                    </a>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            )}

                            <div className="form-actions">
                                <button type="submit" className="submit-btn">
                                    {isEditing ? "Update Invitation" : "Add Invitation"}
                                </button>
                                <button type="button" className="cancel-btn" onClick={resetForm}>
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Invitations List */}
            {!showForm && (
                <div className="invitations-list">
                    {currentInvitations.length === 0 ? (
                        <div className="no-data">
                            {searchText ? "No invitations found matching your search." : "No invitations found."}
                        </div>
                    ) : (
                        <>
                            <table className="invitations-table">
                                <thead>
                                    <tr>
                                        <th>Sr. No.</th>
                                        <th>Title</th>
                                        <th>Description</th>
                                        <th>Attachments</th>
                                        <th>Created At</th>
                                        {canEdit() && <th>Actions</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentInvitations.map((inv, index) => (
                                        <tr key={inv.invitation_id}>
                                            <td>{startIndex + index + 1}</td>
                                            <td>{inv.title}</td>
                                            <td>{inv.description || "-"}</td>
                                            <td>
                                                {inv.attachment_url && Array.isArray(inv.attachment_url) && inv.attachment_url.length > 0 ? (
                                                    <div className="attachments-list">
                                                        {inv.attachment_url
                                                            .filter(url => isValidUrl(url))
                                                            .map((url, idx) => (
                                                                <a
                                                                    key={idx}
                                                                    href={url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="attachment-link"
                                                                >
                                                                    {url.includes('pdf') || url.includes('.pdf')
                                                                        ? '📄 View PDF'
                                                                        : '🖼️ View Image'}
                                                                </a>
                                                            ))}
                                                    </div>
                                                ) : (
                                                    "-"
                                                )}
                                            </td>
                                            <td>
                                                {inv.created_at
                                                    ? new Date(inv.created_at).toLocaleDateString('en-IN', {
                                                          year: 'numeric',
                                                          month: 'short',
                                                          day: 'numeric'
                                                      })
                                                    : "-"}
                                            </td>
                                            {canEdit() && (
                                                <td>
                                                    <div className="action-buttons">
                                                        <button
                                                            className="edit-btn"
                                                            onClick={() => handleEdit(inv)}
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            className="send-btn"
                                                            onClick={() => {
                                                                setSendingInvitationId(inv.invitation_id);
                                                                setShowSendModal(true);
                                                                setSelectedRecipients([]);
                                                            }}
                                                            title="Send Invitation"
                                                        >
                                                            📤 Send
                                                        </button>
                                                        {canDelete() && (
                                                            <button
                                                                className="delete-btn"
                                                                onClick={() => handleDelete(inv.invitation_id)}
                                                            >
                                                                Delete
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
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
                                        Page {currentPage} of {totalPages} ({filteredInvitations.length} total)
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
                </div>
            )}

            {/* Send Invitation Modal */}
            {showSendModal && sendingInvitationId && (
                <div className="modal-overlay" onClick={() => setShowSendModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>📤 Send Invitation</h3>
                            <button className="close-btn" onClick={() => setShowSendModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Send To:</label>
                                <select
                                    value={sendTargetAudience}
                                    onChange={(e) => {
                                        setSendTargetAudience(e.target.value);
                                        if (e.target.value !== 'specific_wing') {
                                            setSendWingId('');
                                        }
                                    }}
                                >
                                    <option value="all">All Owners</option>
                                    <option value="owners">All Owners (Exclude Tenants)</option>
                                    <option value="specific_wing">Specific Wing</option>
                                    <option value="selected">Selected Owners/Flats</option>
                                </select>
                            </div>

                            {sendTargetAudience === 'specific_wing' && (
                                <div className="form-group">
                                    <label>Select Wing:</label>
                                    <select
                                        value={sendWingId}
                                        onChange={(e) => setSendWingId(e.target.value)}
                                    >
                                        <option value="">Select Wing</option>
                                        {wings.map(wing => (
                                            <option key={wing.wing_id} value={wing.wing_id}>
                                                {wing.wing_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {sendTargetAudience === 'selected' && (
                                <div className="form-group">
                                    <label>Select Owners/Flats:</label>
                                    <div className="recipients-selector">
                                        {owners
                                            .filter(o => !o.is_deleted)
                                            .map(owner => (
                                                <label key={owner.owner_id} className="checkbox-label">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedRecipients.includes(owner.owner_id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedRecipients([...selectedRecipients, owner.owner_id]);
                                                            } else {
                                                                setSelectedRecipients(selectedRecipients.filter(id => id !== owner.owner_id));
                                                            }
                                                        }}
                                                    />
                                                    {owner.owner_name} ({owner.flat_no || 'N/A'})
                                                </label>
                                            ))}
                                    </div>
                                </div>
                            )}

                            <div className="send-buttons">
                                <button
                                    className="email-btn"
                                    onClick={async () => {
                                        try {
                                            let selectedOwnerIds = null;
                                            if (sendTargetAudience === 'selected') {
                                                if (selectedRecipients.length === 0) {
                                                    alert("Please select at least one recipient");
                                                    return;
                                                }
                                                selectedOwnerIds = selectedRecipients;
                                            } else if (sendTargetAudience === 'specific_wing') {
                                                if (!sendWingId) {
                                                    alert("Please select a wing");
                                                    return;
                                                }
                                            }
                                            
                                            const res = await sendInvitationEmail(
                                                sendingInvitationId, 
                                                sendTargetAudience, 
                                                sendWingId || null, 
                                                selectedOwnerIds
                                            );
                                            alert(`Invitation sent via email! ${res.data?.successCount || 0} successful, ${res.data?.failCount || 0} failed`);
                                            setShowSendModal(false);
                                        } catch (err) {
                                            console.error(err);
                                            alert("Error sending invitation email!");
                                        }
                                    }}
                                >
                                    📧 Send via Email
                                </button>
                                <button
                                    className="whatsapp-btn"
                                    onClick={async () => {
                                        try {
                                            let selectedOwnerIds = null;
                                            if (sendTargetAudience === 'selected') {
                                                if (selectedRecipients.length === 0) {
                                                    alert("Please select at least one recipient");
                                                    return;
                                                }
                                                selectedOwnerIds = selectedRecipients;
                                            } else if (sendTargetAudience === 'specific_wing') {
                                                if (!sendWingId) {
                                                    alert("Please select a wing");
                                                    return;
                                                }
                                            }
                                            
                                            const res = await sendInvitationWhatsApp(
                                                sendingInvitationId, 
                                                sendTargetAudience, 
                                                sendWingId || null, 
                                                selectedOwnerIds
                                            );
                                            if (res.data?.whatsappLinks && res.data.whatsappLinks.length > 0) {
                                                setWhatsappModal({ show: true, links: res.data.whatsappLinks });
                                            } else {
                                                alert("No WhatsApp links generated. Please check contact numbers.");
                                            }
                                        } catch (err) {
                                            console.error(err);
                                            alert("Error generating WhatsApp links!");
                                        }
                                    }}
                                >
                                    💬 Send via WhatsApp
                                </button>
                                <button
                                    className="notification-btn"
                                    onClick={async () => {
                                        try {
                                            let selectedOwnerIds = null;
                                            if (sendTargetAudience === 'selected') {
                                                if (selectedRecipients.length === 0) {
                                                    alert("Please select at least one recipient");
                                                    return;
                                                }
                                                selectedOwnerIds = selectedRecipients;
                                            } else if (sendTargetAudience === 'specific_wing') {
                                                if (!sendWingId) {
                                                    alert("Please select a wing");
                                                    return;
                                                }
                                            }
                                            await sendInvitationNotification(
                                                sendingInvitationId, 
                                                sendTargetAudience, 
                                                sendWingId || null, 
                                                selectedOwnerIds
                                            );
                                            alert("Invitation sent as notification!");
                                            setShowSendModal(false);
                                        } catch (err) {
                                            console.error(err);
                                            alert("Error sending notification!");
                                        }
                                    }}
                                >
                                    🔔 Send as Notification
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* WhatsApp Links Modal */}
            {whatsappModal.show && (
                <div className="modal-overlay" onClick={() => setWhatsappModal({ show: false, links: [] })}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>💬 WhatsApp Invitation Links</h3>
                            <button className="close-btn" onClick={() => setWhatsappModal({ show: false, links: [] })}>×</button>
                        </div>
                        <div className="modal-body">
                            <p>Click on the links below to open WhatsApp and send the invitation:</p>
                            <div className="whatsapp-links-list">
                                {whatsappModal.links.map((link, index) => (
                                    <div key={index} className="whatsapp-link-item">
                                        <strong>{link.name}</strong> ({link.flat_no || 'N/A'})
                                        <a
                                            href={link.whatsappLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="whatsapp-link-btn"
                                        >
                                            Open WhatsApp
                                        </a>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Invitation;

