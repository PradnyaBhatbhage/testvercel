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
    const [selectedFile, setSelectedFile] = useState(null);
    const [filePreview, setFilePreview] = useState(null);
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

    // ===== Submit Form =====
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await updateActivityExpense(editingId, formData, selectedFile);
                alert("Expense updated successfully!");
            } else {
                await createActivityExpense(formData, selectedFile);
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
            setSelectedFile(null);
            setFilePreview(null);
            fetchExpenses();
        } catch (err) {
            console.error("Save error:", err.response?.data || err.message);
            alert("Error saving expense! " + (err.response?.data?.error || err.message));
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
        setSelectedFile(null);
        setFilePreview(exp.attachment_url && exp.attachment_url.startsWith('http') ? exp.attachment_url : null);
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
        setSelectedFile(null);
        setFilePreview(null);
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
                            <input
                                type="text"
                                name="payment_mode"
                                value={formData.payment_mode}
                                onChange={handleChange}
                                placeholder="Cash / UPI / Bank Transfer"
                                required
                            />
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
                        <label>Attachment (PDF/JPEG):</label>
                        <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={handleFileChange}
                        />
                        {selectedFile && (
                            <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                                Selected: {selectedFile.name}
                            </p>
                        )}
                        {filePreview && !selectedFile && formData.attachment_url && (
                            <div style={{ marginTop: '10px' }}>
                                <p style={{ fontSize: '12px', color: '#666' }}>Current document:</p>
                                {formData.attachment_url.endsWith('.pdf') || formData.attachment_url.includes('pdf') ? (
                                    <a href={formData.attachment_url} target="_blank" rel="noopener noreferrer" style={{ color: '#007bff' }}>
                                        View PDF
                                    </a>
                                ) : (
                                    <img src={formData.attachment_url} alt="Attachment" style={{ maxWidth: '200px', maxHeight: '200px', marginTop: '5px' }} />
                                )}
                            </div>
                        )}
                        {filePreview && selectedFile && (
                            <div style={{ marginTop: '10px' }}>
                                <p style={{ fontSize: '12px', color: '#666' }}>Preview:</p>
                                {selectedFile.type === 'application/pdf' ? (
                                    <p style={{ color: '#007bff' }}>PDF file selected</p>
                                ) : (
                                    <img src={filePreview} alt="Preview" style={{ maxWidth: '200px', maxHeight: '200px', marginTop: '5px' }} />
                                )}
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
                                                                        {e.attachment_url ? (
                                                                            <a
                                                                                href={e.attachment_url}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                style={{ color: '#007bff', textDecoration: 'none' }}
                                                                            >
                                                                                {e.attachment_url.endsWith('.pdf') || e.attachment_url.includes('pdf') ? '📄 View PDF' : '🖼️ View Image'}
                                                                            </a>
                                                                        ) : (
                                                                            <span style={{ color: '#999' }}>No attachment</span>
                                                                        )}
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
