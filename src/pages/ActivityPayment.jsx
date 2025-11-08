import React, { useEffect, useState } from "react";
import {
    getAllPayments,
    createPayment,
    updatePayment,
    deletePayment,
    restorePayment,
    getActivities,
    getFlats,
} from "../services/api";
import "../css/ActivityPayment.css";

const ActivityPayment = () => {
    const [payments, setPayments] = useState([]);
    const [flats, setFlats] = useState([]);
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

    // ====== Fetch All Payments ======
    const fetchPayments = async () => {
        try {
            const { data } = await getAllPayments();
            setPayments(data);
        } catch (err) {
            console.error(err);
            alert("Error fetching payments!");
        }
    };

    // ====== Fetch Activities for Dropdown ======
    const fetchDropdowns = async () => {
        try {
            const [actRes, flatRes] = await Promise.all([getActivities(), getFlats()]);
            setActivities(actRes.data);
            setFlats(flatRes.data);
        } catch (err) {
            console.error(err);
            alert("Error fetching dropdown data!");
        }
    };

    useEffect(() => {
        fetchPayments();
        fetchDropdowns();
    }, []);

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

    // ====== Handle Restore ======
    const handleRestore = async (id) => {
        try {
            await restorePayment(id);
            alert("Payment restored!");
            fetchPayments();
        } catch (err) {
            console.error(err);
            alert("Error restoring payment!");
        }
    };

    // ====== Search Filter ======
    const filtered = payments.filter((p) =>
        p.description?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="payment-container">
            <div className="payment-header">
                <h2>Activity Payments</h2>
                <button className="new-entry-btn" onClick={() => setShowForm(!showForm)}>
                    {showForm ? "Cancel" : "New Entry"}
                </button>
            </div>

            {/* ====== Search Bar ====== */}
            {!showForm && (
                <div className="search-bar">
                    <input
                        type="text"
                        placeholder="Search by description..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
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
                                {flats.map((f) => (
                                    <option key={f.flat_id} value={f.flat_id}>
                                        {f.flat_no}
                                    </option>
                                ))}
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

                    <button type="submit" className="submit-btn">
                        {editingId ? "Update Payment" : "Add Payment"}
                    </button>
                </form>
            )}

            {/* ====== Table Section ====== */}
            {!showForm && (
                <>
                    <table className="payment-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Activity</th>
                                <th>Flat ID</th>
                                <th>Date</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Mode</th>
                                <th>Description</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((p) => (
                                <tr key={p.activity_pay_id}>
                                    <td>{p.activity_pay_id}</td>
                                    <td>
                                        {activities.find((a) => a.activity_id === p.activity_id)
                                            ?.activity_name || p.activity_id}
                                    </td>
                                    <td>{p.flat_id}</td>
                                    <td>{p.payment_date?.split("T")[0]}</td>
                                    <td>{p.amount}</td>
                                    <td>{p.payment_status}</td>
                                    <td>{p.payment_mode}</td>
                                    <td>{p.description}</td>
                                    <td className="action-btns">
                                        <button onClick={() => handleEdit(p)}>Edit✏️</button>
                                        <button onClick={() => handleDelete(p.activity_pay_id)}>Delete🗑️</button>
                                        <button onClick={() => handleRestore(p.activity_pay_id)}>Restore♻️</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* ====== Total Amount by Activity ====== */}
                    <div className="activity-totals">
                        <h3>Activity Totals</h3>
                        <table className="total-table">
                            <thead>
                                <tr>
                                    <th>Activity Name</th>
                                    <th>Total Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activities.map((a) => {
                                    const total = payments
                                        .filter((p) => p.activity_id === a.activity_id)
                                        .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
                                    if (total === 0) return null;
                                    return (
                                        <tr key={a.activity_id}>
                                            <td>{a.activity_name}</td>
                                            <td>₹ {total.toFixed(2)}</td>
                                        </tr>
                                    );
                                })}

                                {/* ====== Grand Total Row ====== */}
                                <tr className="grand-total-row">
                                    <td><strong>Grand Total</strong></td>
                                    <td>
                                        <strong>
                                            ₹{" "}
                                            {payments
                                                .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
                                                .toFixed(2)}
                                        </strong>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>

    );
};

export default ActivityPayment;