import React, { useEffect, useState } from "react";
import {
    getAllActivityExpenses,
    createActivityExpense,
    updateActivityExpense,
    deleteActivityExpense,
    getActivities,
} from "../services/api";
import { canEdit, canDelete } from "../utils/ownerFilter";
import "../css/ActivityExpense.css";

const ActivityExpense = () => {
    const [expenses, setExpenses] = useState([]);
    const [activities, setActivities] = useState([]);
    const [formData, setFormData] = useState({
        activity_id: "",
        bill_no: "",
        particulars: "",
        amount: "",
        payment_mode: "",
        description: "",
    });
    const [editingId, setEditingId] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [search, setSearch] = useState("");
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [filePreviews, setFilePreviews] = useState([]);
    const [expandedActivities, setExpandedActivities] = useState({}); // Track which activities are expanded

    // ===== Fetch All Expenses =====
    const fetchExpenses = async () => {
        try {
            const { data } = await getAllActivityExpenses();
            setExpenses(data);
        } catch (err) {
            console.error(err);
            alert("Error fetching expenses!");
        }
    };

    // ===== Fetch Activities for Dropdown =====
    const fetchActivities = async () => {
        try {
            const res = await getActivities();
            setActivities(res.data);
        } catch (err) {
            console.error(err);
            alert("Error fetching activities!");
        }
    };

    useEffect(() => {
        fetchExpenses();
        fetchActivities();
    }, []);

    // ===== Handle Input Change =====
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

    // ===== Submit Form =====
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await updateActivityExpense(editingId, formData, selectedFiles.length > 0 ? selectedFiles : null);
                alert("Expense updated successfully!");
            } else {
                await createActivityExpense(formData, selectedFiles.length > 0 ? selectedFiles : null);
                alert("Expense added successfully!");
            }
            setFormData({
                activity_id: "",
                bill_no: "",
                particulars: "",
                amount: "",
                payment_mode: "",
                description: "",
            });
            setEditingId(null);
            setShowForm(false);
            setSelectedFiles([]);
            setFilePreviews([]);
            fetchExpenses();
        } catch (err) {
            console.error("Save error:", err.response?.data || err.message);
            const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || "Unknown error";
            alert("Error saving expense! " + errorMessage);
        }
    };

    // ===== Edit Entry =====
    const handleEdit = (exp) => {
        setFormData({
            activity_id: exp.activity_id,
            bill_no: exp.bill_no,
            particulars: exp.particulars,
            amount: exp.amount,
            payment_mode: exp.payment_mode,
            description: exp.description,
            attachment_url: exp.attachment_url || null,
        });
        setEditingId(exp.activity_exp_id);
        setSelectedFiles([]);
        
        // Handle existing attachments - support both single URL and array of URLs
        let existingUrls = [];
        if (exp.attachment_url) {
            try {
                if (Array.isArray(exp.attachment_url)) {
                    existingUrls = exp.attachment_url.filter(url => url && typeof url === 'string' && url.startsWith('http'));
                } else if (typeof exp.attachment_url === 'string') {
                    try {
                        const parsed = JSON.parse(exp.attachment_url);
                        if (Array.isArray(parsed)) {
                            existingUrls = parsed.filter(url => url && typeof url === 'string' && url.startsWith('http'));
                        } else if (parsed && typeof parsed === 'string' && parsed.startsWith('http')) {
                            existingUrls = [parsed];
                        }
                    } catch {
                        // Not JSON, treat as single URL
                        if (exp.attachment_url.startsWith('http')) {
                            existingUrls = [exp.attachment_url];
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

    // ===== Delete Entry =====
    const handleDelete = async (id) => {
        const reason = prompt("Enter reason for deletion:");
        if (!reason) return;
        try {
            await deleteActivityExpense(id, reason);
            alert("Expense deleted!");
            fetchExpenses();
        } catch (err) {
            console.error(err);
            alert("Error deleting expense!");
        }
    };

    // ===== Handle Cancel =====
    const handleCancel = () => {
        setFormData({
            activity_id: "",
            bill_no: "",
            particulars: "",
            amount: "",
            payment_mode: "",
            description: "",
        });
        setEditingId(null);
        setSelectedFiles([]);
        setFilePreviews([]);
        setShowForm(false);
    };

    // ===== Filter Search =====
    const filtered = expenses.filter((e) =>
        e.particulars?.toLowerCase().includes(search.toLowerCase()) ||
        e.bill_no?.toLowerCase().includes(search.toLowerCase()) ||
        e.description?.toLowerCase().includes(search.toLowerCase())
    );

    // ===== Group Expenses by Activity =====
    const groupExpensesByActivity = () => {
        const grouped = {};

        filtered.forEach(expense => {
            const activityId = expense.activity_id;
            const activity = activities.find(a => a.activity_id === activityId);
            const activityName = activity?.activity_name || `Activity ${activityId}`;

            if (!grouped[activityId]) {
                grouped[activityId] = {
                    activityId: activityId,
                    activityName: activityName,
                    expenses: [],
                    total: 0
                };
            }

            grouped[activityId].expenses.push(expense);
            grouped[activityId].total += Number(expense.amount || 0);
        });

        // Convert to array and sort by activity name
        return Object.values(grouped).sort((a, b) =>
            a.activityName.localeCompare(b.activityName)
        );
    };

    const groupedExpenses = groupExpensesByActivity();

    // ===== Toggle Activity Expansion =====
    const toggleActivity = (activityId) => {
        setExpandedActivities(prev => ({
            ...prev,
            [activityId]: !prev[activityId]
        }));
    };

    // Keep activities collapsed by default - no need to set initial state

    return (
        <div className="expense-container">
            <h2>Activity Expenses</h2>

            {/* Controls (New Entry + Search) - Only show when form is not visible */}
            {!showForm && (
                <div className="expense-controls">
                    {canEdit() && (
                        <button className="new-entry-btn" onClick={() => setShowForm(true)}>
                            New Entry
                        </button>
                    )}
                    <div className="search-bar">
                        <input
                            type="text"
                            placeholder="Search by particulars..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
            )}

            {/* ===== Form Section ===== */}
            {showForm && (
                <form className="expense-form" onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Activity:</label>
                            <select
                                name="activity_id"
                                value={formData.activity_id}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Select Activity</option>
                                {activities.map((a) => (
                                    <option key={a.activity_id} value={a.activity_id}>
                                        {a.activity_name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Bill No:</label>
                            <input
                                type="text"
                                name="bill_no"
                                value={formData.bill_no}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Particulars:</label>
                            <input
                                type="text"
                                name="particulars"
                                value={formData.particulars}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Amount:</label>
                            <input
                                type="number"
                                name="amount"
                                value={formData.amount}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Payment Mode:</label>
                            <select
                                name="payment_mode"
                                value={formData.payment_mode}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Select Payment Mode</option>
                                <option value="Cash">Cash</option>
                                <option value="UPI">UPI</option>
                                <option value="Bank Transfer">Bank Transfer</option>
                                <option value="Online">Online</option>
                                <option value="Cheque">Cheque</option>
                                <option value="Credit Card">Credit Card</option>
                                <option value="Debit Card">Debit Card</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-group full-width">
                        <label>Description:</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="Enter description"
                            required
                        />
                    </div>

                    <div className="form-group full-width">
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
                            {editingId ? "Update Expense" : "Add Expense"}
                        </button>
                        <button type="button" className="cancel-btn" onClick={handleCancel}>
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            {/* ===== Grouped Expenses by Activity ===== */}
            {!showForm && (
                <>
                    {groupedExpenses.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                            {search ? 'No expenses found matching your search.' : 'No expenses found.'}
                        </div>
                    ) : (
                        <div className="activity-expense-groups">
                            {groupedExpenses.map((group) => {
                                const isExpanded = expandedActivities[group.activityId] === true; // Default to false (collapsed)
                                const expenseCount = group.expenses.length;

                                return (
                                    <div key={group.activityId} className="activity-group">
                                        {/* Activity Header - Clickable */}
                                        <div
                                            className="activity-header"
                                            onClick={() => toggleActivity(group.activityId)}
                                            style={{
                                                cursor: 'pointer',
                                                padding: '15px 20px',
                                                backgroundColor: '#f8f9fa',
                                                border: '1px solid #dee2e6',
                                                borderRadius: '8px',
                                                marginBottom: '10px',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                transition: 'background-color 0.2s',
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e9ecef'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#495057' }}>
                                                    {isExpanded ? '▼' : '▶'} {group.activityName}
                                                </span>
                                                <span style={{
                                                    fontSize: '14px',
                                                    color: '#6c757d',
                                                    backgroundColor: '#e9ecef',
                                                    padding: '4px 10px',
                                                    borderRadius: '12px'
                                                }}>
                                                    {expenseCount} expense{expenseCount !== 1 ? 's' : ''}
                                                </span>
                                            </div>
                                            <span style={{
                                                fontSize: '16px',
                                                fontWeight: 'bold',
                                                color: '#dc3545'
                                            }}>
                                                Total: ₹{group.total.toFixed(2)}
                                            </span>
                                        </div>

                                        {/* Expenses Table - Collapsible */}
                                        {isExpanded && (
                                            <div className="activity-expenses-table" style={{ marginBottom: '20px' }}>
                                                <table className="expense-table" style={{ width: '100%' }}>
                                                    <thead>
                                                        <tr>
                                                            <th>Sr. No.</th>
                                                            <th>Bill No</th>
                                                            <th>Particulars</th>
                                                            <th>Amount</th>
                                                            <th>Payment Mode</th>
                                                            <th>Description</th>
                                                            <th>Attachment</th>
                                                            {(canEdit() || canDelete()) && <th>Actions</th>}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {group.expenses.length === 0 ? (
                                                            <tr>
                                                                <td colSpan={(canEdit() || canDelete()) ? "8" : "7"} style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                                                                    No expenses found for this activity.
                                                                </td>
                                                            </tr>
                                                        ) : (
                                                            group.expenses.map((e, idx) => (
                                                                <tr key={e.activity_exp_id}>
                                                                    <td>{idx + 1}</td>
                                                                    <td>{e.bill_no}</td>
                                                                    <td>{e.particulars}</td>
                                                                    <td style={{ color: '#dc3545', fontWeight: 'bold' }}>₹{Number(e.amount || 0).toFixed(2)}</td>
                                                                    <td>{e.payment_mode}</td>
                                                                    <td>{e.description}</td>
                                                                    <td>
                                                                        {(() => {
                                                                            let attachments = [];
                                                                            if (e.attachment_url) {
                                                                                try {
                                                                                    if (Array.isArray(e.attachment_url)) {
                                                                                        attachments = e.attachment_url;
                                                                                    } else if (typeof e.attachment_url === 'string') {
                                                                                        try {
                                                                                            const parsed = JSON.parse(e.attachment_url);
                                                                                            attachments = Array.isArray(parsed) ? parsed : [parsed];
                                                                                        } catch {
                                                                                            attachments = [e.attachment_url];
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
                                                                        <td className="action-btns">
                                                                            {canEdit() && (
                                                                                <button onClick={() => handleEdit(e)}>Edit</button>
                                                                            )}
                                                                            {canDelete() && (
                                                                                <button onClick={() => handleDelete(e.activity_exp_id)}>Delete</button>
                                                                            )}
                                                                        </td>
                                                                    )}
                                                                </tr>
                                                            ))
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Grand Total Summary */}
                            <div className="grand-total-summary" style={{
                                marginTop: '30px',
                                padding: '20px',
                                backgroundColor: '#f8f9fa',
                                border: '2px solid #dc3545',
                                borderRadius: '8px',
                                textAlign: 'center'
                            }}>
                                <h3 style={{ margin: '0 0 10px 0', color: '#495057' }}>Grand Total Expense</h3>
                                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc3545' }}>
                                    ₹{filtered.reduce((sum, e) => sum + Number(e.amount || 0), 0).toFixed(2)}
                                </div>
                                <div style={{ fontSize: '14px', color: '#6c757d', marginTop: '5px' }}>
                                    Across {groupedExpenses.length} activit{groupedExpenses.length !== 1 ? 'ies' : 'y'}
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

        </div>
    );
};

export default ActivityExpense;
