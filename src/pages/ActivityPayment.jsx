import React, { useEffect, useState } from "react";
import {
    getAllPayments,
    createPayment,
    updatePayment,
    deletePayment,
    getActivities,
    getFlats,
    getOwners,
    getWings,
    getFlatTypes,
    sendInvitationByEmail,
    sendInvitationByWhatsApp,
} from "../services/api";
import { getCurrentUserWingId, filterByWing } from "../utils/wingFilter";
import {
    isOwnerRole,
    filterActivityPaymentsByCurrentOwner,
    canEdit,
    canDelete,
} from "../utils/ownerFilter";
import "../css/ActivityPayment.css";

const ActivityPayment = () => {
    const [payments, setPayments] = useState([]);
    const [flats, setFlats] = useState([]);
    const [owners, setOwners] = useState([]);
    const [wings, setWings] = useState([]);
    const [flatTypes, setFlatTypes] = useState([]);
    const [activities, setActivities] = useState([]);
    const [formData, setFormData] = useState({
        activity_id: "",
        flat_id: "",
        payment_date: "",
        amount: "",
        payment_status: "",
        payment_mode: "",
        description: "",
    });
    const [editingId, setEditingId] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [search, setSearch] = useState("");
    const [expandedActivities, setExpandedActivities] = useState({}); // Track which activities are expanded

    // Get current user's wing_id
    const currentUserWingId = getCurrentUserWingId();

    // ====== Fetch All Payments ======
    const fetchPayments = async () => {
        try {
            const { data } = await getAllPayments();
            let rawPayments = data || [];

            // Filter payments by flat's wing_id
            if (currentUserWingId !== null && flats.length > 0) {
                // Use already fetched flats to filter payments
                const wingFlatIds = new Set(flats.map(f => f.flat_id));

                // Filter payments to only include those with flats in user's wing
                rawPayments = rawPayments.filter(payment => {
                    if (!payment.flat_id) return false;
                    return wingFlatIds.has(payment.flat_id);
                });
            }

            // Filter by owner_id if user is owner role
            if (isOwnerRole()) {
                // Need to get owners to map flat_id to owner_id
                const ownersRes = await getOwners();
                const allOwners = ownersRes.data || [];
                
                rawPayments = filterActivityPaymentsByCurrentOwner(rawPayments, allOwners);
            }

            setPayments(rawPayments);
        } catch (err) {
            console.error(err);
            alert("Error fetching payments!");
        }
    };

    // ====== Fetch Activities for Dropdown ======
    const fetchDropdowns = async () => {
        try {
            const [actRes, flatRes, ownersRes, wingsRes, flatTypesRes] = await Promise.all([
                getActivities(), 
                getFlats(), 
                getOwners(),
                getWings(),
                getFlatTypes()
            ]);
            setActivities(actRes.data);
            setOwners(ownersRes.data || []);
            setWings(wingsRes.data || []);
            setFlatTypes(flatTypesRes.data || []);

            // Filter flats by current user's wing
            const allFlats = flatRes.data || [];
            let filteredFlats = [];
            
            if (currentUserWingId !== null) {
                filteredFlats = filterByWing(allFlats, currentUserWingId, 'wing_id');
            } else {
                filteredFlats = allFlats;
            }
            
            // Deduplicate flats by flat_id to prevent duplicate entries in dropdown
            const uniqueFlatsMap = new Map();
            filteredFlats.forEach(f => {
                if (f.flat_id && !uniqueFlatsMap.has(f.flat_id)) {
                    uniqueFlatsMap.set(f.flat_id, f);
                }
            });
            const uniqueFlats = Array.from(uniqueFlatsMap.values());
            
            setFlats(uniqueFlats);
        } catch (err) {
            console.error(err);
            alert("Error fetching dropdown data!");
        }
    };

    useEffect(() => {
        fetchDropdowns();
    }, []);

    // Fetch payments after flats are loaded
    useEffect(() => {
        if (flats.length > 0 || currentUserWingId === null) {
            fetchPayments();
        }
    }, [flats]);

    // ====== Handle Input Changes ======
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // ====== Handle Form Submit ======
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await updatePayment(editingId, formData);
                alert("Payment updated successfully!");
            } else {
                await createPayment(formData);
                alert("Payment added successfully!");
            }
            setFormData({
                activity_id: "",
                flat_id: "",
                payment_date: "",
                amount: "",
                payment_status: "",
                payment_mode: "",
                description: "",
            });
            setEditingId(null);
            setShowForm(false);
            fetchPayments();
        } catch (err) {
            console.error("Save error:", err.response?.data || err.message);
            alert("Error saving payment! " + (err.response?.data?.error || err.message));
        }
    };


    // ====== Handle Edit ======
    const handleEdit = (payment) => {
        setFormData({
            activity_id: payment.activity_id,
            flat_id: payment.flat_id,
            payment_date: payment.payment_date?.split("T")[0] || "",
            amount: payment.amount,
            payment_status: payment.payment_status,
            payment_mode: payment.payment_mode,
            description: payment.description,
        });
        setEditingId(payment.activity_pay_id);
        setShowForm(true);
    };

    // ====== Handle Delete ======
    const handleDelete = async (id) => {
        const reason = prompt("Enter reason for deletion:");
        if (!reason) return;
        try {
            await deletePayment(id, reason);
            alert("Payment deleted!");
            fetchPayments();
        } catch (err) {
            console.error(err);
            alert("Error deleting payment!");
        }
    };

    // ====== Handle Cancel ======
    const handleCancel = () => {
        setFormData({
            activity_id: "",
            flat_id: "",
            payment_date: "",
            amount: "",
            payment_status: "",
            payment_mode: "",
            description: "",
        });
        setEditingId(null);
        setShowForm(false);
    };

    // ====== Handle Send Invitation by Email ======
    const handleSendInvitationEmail = async (id) => {
        if (!window.confirm("Send invitation via email?")) return;
        try {
            const { data } = await sendInvitationByEmail(id);
            alert(`Invitation sent successfully via email to ${data.payerName || 'payer'}!`);
        } catch (err) {
            console.error(err);
            const errorMsg = err.response?.data?.error || err.response?.data?.details || err.message;
            alert(`Error sending invitation: ${errorMsg}`);
        }
    };

    // ====== Handle Send Invitation by WhatsApp ======
    const handleSendInvitationWhatsApp = async (id) => {
        if (!window.confirm("Send invitation via WhatsApp?")) return;
        try {
            const { data } = await sendInvitationByWhatsApp(id);
            if (data.whatsappLink) {
                // Open WhatsApp link in new tab
                window.open(data.whatsappLink, '_blank');
                alert("WhatsApp invitation opened! Click 'Send' to deliver the invitation.");
            } else {
                alert("Invitation sent successfully via WhatsApp!");
            }
        } catch (err) {
            console.error(err);
            const errorMsg = err.response?.data?.error || err.response?.data?.details || err.message;
            alert(`Error sending invitation: ${errorMsg}`);
        }
    };

    // ====== Search Filter ======
    const filtered = payments.filter((p) =>
        p.description?.toLowerCase().includes(search.toLowerCase()) ||
        p.flat_no?.toLowerCase().includes(search.toLowerCase()) ||
        p.owner_name?.toLowerCase().includes(search.toLowerCase())
    );

    // ===== Group Payments by Activity =====
    const groupPaymentsByActivity = () => {
        const grouped = {};

        filtered.forEach(payment => {
            const activityId = payment.activity_id;
            const activity = activities.find(a => a.activity_id === activityId);
            const activityName = activity?.activity_name || `Activity ${activityId}`;

            if (!grouped[activityId]) {
                grouped[activityId] = {
                    activityId: activityId,
                    activityName: activityName,
                    payments: [],
                    total: 0
                };
            }

            grouped[activityId].payments.push(payment);
            grouped[activityId].total += Number(payment.amount || 0);
        });

        // Convert to array and sort by activity name
        return Object.values(grouped).sort((a, b) =>
            a.activityName.localeCompare(b.activityName)
        );
    };

    const groupedPayments = groupPaymentsByActivity();

    // ===== Toggle Activity Expansion =====
    const toggleActivity = (activityId) => {
        setExpandedActivities(prev => ({
            ...prev,
            [activityId]: !prev[activityId]
        }));
    };

    return (
        <div className="payment-container">
            <h2>Activity Payments</h2>

            {/* Controls (New Entry + Search) - Only show when form is not visible */}
            {!showForm && (
                <div className="payment-controls">
                    {canEdit() && (
                        <button className="new-entry-btn" onClick={() => setShowForm(true)}>
                            New Entry
                        </button>
                    )}
                    <div className="search-bar">
                        <input
                            type="text"
                            placeholder="Search by description..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
            )}

            {/* ====== Form Section ====== */}
            {showForm && (
                <form className="payment-form" onSubmit={handleSubmit}>
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
                            <label>Flat No:</label>
                            <select
                                name="flat_id"
                                value={formData.flat_id}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Select Flat</option>
                                {(() => {
                                    // Additional deduplication by display text to prevent visual duplicates
                                    const seenDisplayTexts = new Set();
                                    const seenFlatIds = new Set();
                                    const options = [];
                                    
                                    flats.forEach(f => {
                                        // Skip if flat_id is missing or already seen
                                        if (!f.flat_id || seenFlatIds.has(f.flat_id)) {
                                            return;
                                        }
                                        
                                        // Find owner for this flat (get first owner if multiple exist)
                                        const owner = owners.find(o => o.flat_id === f.flat_id);
                                        
                                        // Get wing name and flat type name
                                        const wing = wings.find(w => w.wing_id === f.wing_id);
                                        const flatType = flatTypes.find(ft => ft.flat_type_id === f.flat_type_id);
                                        
                                        const wingName = owner?.wing_name || wing?.wing_name || 'N/A';
                                        const flatTypeName = owner?.flat_type_name || flatType?.flat_type_name || 'N/A';
                                        
                                        // Format: "Owner Name - Flat No (Wing Name - Flat Type Name)"
                                        const displayText = owner 
                                            ? `${owner.owner_name} - ${f.flat_no || 'N/A'} (Wing ${wingName} - ${flatTypeName})`
                                            : `${f.flat_no || 'N/A'} (Wing ${wingName} - ${flatTypeName})`;
                                        
                                        // Skip if display text already seen (additional safety check)
                                        if (seenDisplayTexts.has(displayText)) {
                                            return;
                                        }
                                        
                                        seenFlatIds.add(f.flat_id);
                                        seenDisplayTexts.add(displayText);
                                        
                                        options.push(
                                            <option key={f.flat_id} value={f.flat_id}>
                                                {displayText}
                                            </option>
                                        );
                                    });
                                    
                                    return options;
                                })()}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Payment Date:</label>
                            <input
                                type="date"
                                name="payment_date"
                                value={formData.payment_date}
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
                            <label>Payment Status:</label>
                            <select
                                name="payment_status"
                                value={formData.payment_status}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Select</option>
                                <option value="Pending">Pending</option>
                                <option value="Paid">Paid</option>
                            </select>
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

                    <div className="button-group">
                        <button type="submit" className="submit-btn">
                            {editingId ? "Update Payment" : "Add Payment"}
                        </button>
                        <button type="button" className="cancel-btn" onClick={handleCancel}>
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            {/* ====== Grouped Payments by Activity ====== */}
            {!showForm && (
                <>
                    {groupedPayments.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                            {search ? 'No payments found matching your search.' : 'No payments found.'}
                        </div>
                    ) : (
                        <div className="activity-payment-groups">
                            {groupedPayments.map((group) => {
                                const isExpanded = expandedActivities[group.activityId] === true; // Default to false (collapsed)
                                const paymentCount = group.payments.length;

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
                                                    {paymentCount} payment{paymentCount !== 1 ? 's' : ''}
                                                </span>
                                            </div>
                                            <span style={{
                                                fontSize: '16px',
                                                fontWeight: 'bold',
                                                color: '#28a745'
                                            }}>
                                                Total: ₹{group.total.toFixed(2)}
                                            </span>
                                        </div>

                                        {/* Payments Table - Collapsible */}
                                        {isExpanded && (
                                            <div className="activity-payments-table" style={{ marginBottom: '20px' }}>
                                                <table className="payment-table" style={{ width: '100%' }}>
                                                    <thead>
                                                        <tr>
                                                            <th>Sr. No.</th>
                                                            <th>Flat No</th>
                                                            <th>Owner Name</th>
                                                            <th>Date</th>
                                                            <th>Amount</th>
                                                            <th>Status</th>
                                                            <th>Mode</th>
                                                            <th>Description</th>
                                                            <th>Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {group.payments.length === 0 ? (
                                                            <tr>
                                                                <td colSpan="9" style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                                                                    No payments found for this activity.
                                                                </td>
                                                            </tr>
                                                        ) : (
                                                            group.payments.map((p, idx) => (
                                                                <tr key={p.activity_pay_id}>
                                                                    <td>{idx + 1}</td>
                                                                    <td>{p.flat_no || '-'}</td>
                                                                    <td>{p.owner_name || '-'}</td>
                                                                    <td>{p.payment_date?.split("T")[0]}</td>
                                                                    <td style={{ color: '#28a745', fontWeight: 'bold' }}>₹{Number(p.amount || 0).toFixed(2)}</td>
                                                                    <td>{p.payment_status}</td>
                                                                    <td>{p.payment_mode}</td>
                                                                    <td>{p.description}</td>
                                                                    <td className="action-btns">
                                                                        {canEdit() && (
                                                                            <button onClick={() => handleEdit(p)}>Edit</button>
                                                                        )}
                                                                        {canDelete() && (
                                                                            <button onClick={() => handleDelete(p.activity_pay_id)}>Delete</button>
                                                                        )}
                                                                        {isOwnerRole() && (
                                                                            <span style={{ color: '#999', fontSize: '12px' }}>View Only</span>
                                                                        )}
                                                                        {p.payment_status === 'Paid' && (
                                                                            <>
                                                                                <button
                                                                                    onClick={() => handleSendInvitationEmail(p.activity_pay_id)}
                                                                                    style={{ backgroundColor: '#4CAF50', color: 'white' }}
                                                                                    title="Send invitation via email"
                                                                                >
                                                                                    📧 Invite
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleSendInvitationWhatsApp(p.activity_pay_id)}
                                                                                    style={{ backgroundColor: '#25D366', color: 'white' }}
                                                                                    title="Send invitation via WhatsApp"
                                                                                >
                                                                                    💬 WhatsApp
                                                                                </button>
                                                                            </>
                                                                        )}
                                                                    </td>
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
                                border: '2px solid #28a745',
                                borderRadius: '8px',
                                textAlign: 'center'
                            }}>
                                <h3 style={{ margin: '0 0 10px 0', color: '#495057' }}>Grand Total Payment</h3>
                                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
                                    ₹{filtered.reduce((sum, p) => sum + Number(p.amount || 0), 0).toFixed(2)}
                                </div>
                                <div style={{ fontSize: '14px', color: '#6c757d', marginTop: '5px' }}>
                                    Across {groupedPayments.length} activit{groupedPayments.length !== 1 ? 'ies' : 'y'}
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>

    );
};

export default ActivityPayment;