import React, { useEffect, useState } from "react";
import {
    getAllActivityExpenses,
    createActivityExpense,
    updateActivityExpense,
    deleteActivityExpense,
    restoreActivityExpense,
    getActivities,
} from "../services/api";
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

    // ===== Submit Form =====
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await updateActivityExpense(editingId, formData);
                alert("Expense updated successfully!");
            } else {
                await createActivityExpense(formData);
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
        });
        setEditingId(exp.activity_exp_id);
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

    // ===== Restore Entry =====
    const handleRestore = async (id) => {
        try {
            await restoreActivityExpense(id);
            alert("Expense restored!");
            fetchExpenses();
        } catch (err) {
            console.error(err);
            alert("Error restoring expense!");
        }
    };

    // ===== Filter Search =====
    const filtered = expenses.filter((e) =>
        e.particulars?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="expense-container">
            <div className="expense-header">
                <h2>Activity Expenses</h2>
                <button className="new-entry-btn" onClick={() => setShowForm(!showForm)}>
                    {showForm ? "Cancel" : "New Entry"}
                </button>
            </div>

            {!showForm && (
                <div className="search-bar">
                    <input
                        type="text"
                        placeholder="Search by particulars..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
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

                    <button type="submit" className="submit-btn">
                        {editingId ? "Update Expense" : "Add Expense"}
                    </button>
                </form>
            )}

            {/* ===== Table Section ===== */}
            {!showForm && (
                <>
                    <table className="expense-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Activity</th>
                                <th>Bill No</th>
                                <th>Particulars</th>
                                <th>Amount</th>
                                <th>Mode</th>
                                <th>Description</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((e) => (
                                <tr key={e.activity_exp_id}>
                                    <td>{e.activity_exp_id}</td>
                                    <td>
                                        {activities.find((a) => a.activity_id === e.activity_id)
                                            ?.activity_name || e.activity_id}
                                    </td>
                                    <td>{e.bill_no}</td>
                                    <td>{e.particulars}</td>
                                    <td>{e.amount}</td>
                                    <td>{e.payment_mode}</td>
                                    <td>{e.description}</td>
                                    <td className="action-btns">
                                        <button onClick={() => handleEdit(e)}>Edit ✏️</button>
                                        <button onClick={() => handleDelete(e.activity_exp_id)}>Delete 🗑️</button>
                                        <button onClick={() => handleRestore(e.activity_exp_id)}>Restore ♻️</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* ===== Total Expense per Activity ===== */}
                    <div className="activity-totals">
                        <h3>Expense Totals by Activity</h3>
                        {activities.map((a) => {
                            const total = expenses
                                .filter((e) => e.activity_id === a.activity_id)
                                .reduce((sum, e) => sum + Number(e.amount || 0), 0);
                            return (
                                <div key={a.activity_id} className="total-row">
                                    <span>{a.activity_name}</span>
                                    <span className="total-amount">₹ {total.toFixed(2)}</span>
                                </div>
                            );
                        })}
                        {/* ===== Grand Total ===== */}
                        <div className="grand-total">
                            <strong>Total Expense: </strong>
                            <span>
                                ₹{" "}
                                {expenses
                                    .reduce((sum, e) => sum + Number(e.amount || 0), 0)
                                    .toFixed(2)}
                            </span>
                        </div>
                    </div>

                </>
            )}

        </div>
    );
};

export default ActivityExpense;
