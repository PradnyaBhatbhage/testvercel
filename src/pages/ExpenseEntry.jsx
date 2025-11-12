import React, { useEffect, useState } from "react";
import {
    getExpenses,
    createExpense,
    updateExpense,
    deleteExpense,
    restoreExpense,
    getWings,
    getCategories,
} from "../services/api";
import "../css/ExpenseEntry.css";

const ExpenseEntry = () => {
    const [expenses, setExpenses] = useState([]);
    const [wings, setWings] = useState([]);
    const [categories, setCategories] = useState([]);
    const [filteredSubcategories, setFilteredSubcategories] = useState([]);

    const [form, setForm] = useState({
        wing_id: "",
        catg_id: "",
        subcatg_name: "",
        date: "",
        amount: "",
        description: "",
        frequency: "",
        paid_to: "",
        payment_mode: "",
        payment_status: "",
    });

    const [editingId, setEditingId] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [search, setSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    // ===== Fetch Data =====
    useEffect(() => {
        fetchExpenses();
        fetchWings();
        fetchCategories();
    }, []);

    const fetchExpenses = async () => {
        try {
            const res = await getExpenses();
            setExpenses(res.data);
        } catch (err) {
            console.error("Error fetching expenses:", err);
        }
    };

    const fetchWings = async () => {
        try {
            const res = await getWings();
            setWings(res.data);
        } catch (err) {
            console.error("Error fetching wings:", err);
        }
    };

    const fetchCategories = async () => {
        try {
            const res = await getCategories();
            setCategories(res.data);
        } catch (err) {
            console.error("Error fetching categories:", err);
        }
    };

    // ===== Filter Subcategories based on Category ID =====
    // const handleCategoryChange = (e) => {
    //     const selectedCatgId = e.target.value;
    //     setForm({ ...form, catg_id: selectedCatgId, subcatg_name: "" });

    //     // Filter subcategories that belong to this category id
    //     const subs = categories.filter(
    //         (c) => c.catg_id === parseInt(selectedCatgId)
    //     );
    //     setFilteredSubcategories(subs);
    // };

    /* const handleCategoryChange = (e) => {
        const selectedCatgId = e.target.value;
        setForm({ ...form, catg_id: selectedCatgId, subcatg_name: "" });

        const subs = categories.filter(
            (c) => c.catg_id === parseInt(selectedCatgId) && c.subcatg_name
        );
        setFilteredSubcategories(subs);
    }; */
    const handleCategoryChange = (e) => {
        const selectedCatgId = parseInt(e.target.value);
        setForm({ ...form, catg_id: selectedCatgId, subcatg_name: "" });

        // Show only subcategories for that catg_id
        const subs = categories.filter(
            (c) => c.catg_id === selectedCatgId && c.subcatg_name
        );
        setFilteredSubcategories(subs);
    };

    // ===== Handle Input =====
    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    // ===== Submit Form =====
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await updateExpense(editingId, form);
                alert("Expense updated successfully");
            } else {
                await createExpense(form);
                alert("Expense added successfully");
            }
            clearForm();
            setShowForm(false);
            fetchExpenses();
        } catch (err) {
            console.error(err);
            alert("Error saving expense");
        }
    };

    // ===== Edit =====
    /*  const handleEdit = (exp) => {
         setForm({
             wing_id: exp.wing_id,
             catg_id: exp.catg_id,
             subcatg_name: exp.subcatg_name,
             date: exp.date.split("T")[0],
             amount: exp.amount,
             description: exp.description,
             frequency: exp.frequency,
             paid_to: exp.paid_to,
             payment_mode: exp.payment_mode,
             payment_status: exp.payment_status,
         });
         setEditingId(exp.exp_id);
         setShowForm(true);
 
         const subs = categories.filter(
             (c) => c.catg_id === parseInt(exp.catg_id)
         );
         setFilteredSubcategories(subs);
     }; */
    const handleEdit = (exp) => {
        setForm({
            wing_id: exp.wing_id,
            catg_id: exp.catg_id,
            subcatg_name: exp.subcatg_name,
            date: exp.date ? exp.date.split("T")[0] : "",
            amount: exp.amount,
            description: exp.description,
            frequency: exp.frequency,
            paid_to: exp.paid_to,
            payment_mode: exp.payment_mode,
            payment_status: exp.payment_status,
        });
        setEditingId(exp.exp_id);
        setShowForm(true);

        // Filter subcategories for this category
        const subs = categories.filter(
            (c) => c.catg_id === exp.catg_id && c.subcatg_name
        );
        setFilteredSubcategories(subs);
    };

    // ===== Delete =====
    const handleDelete = async (id) => {
        const reason = prompt("Enter reason for deletion:");
        if (!reason) return;
        try {
            await deleteExpense(id, reason);
            alert("Expense deleted");
            fetchExpenses();
        } catch (err) {
            console.error("Error deleting:", err);
        }
    };

    // ===== Restore =====
    const handleRestore = async (id) => {
        try {
            await restoreExpense(id);
            alert("Expense restored");
            fetchExpenses();
        } catch (err) {
            console.error("Error restoring:", err);
        }
    };

    // ===== Clear Form =====
    const clearForm = () => {
        setForm({
            wing_id: "",
            catg_id: "",
            subcatg_name: "",
            date: "",
            amount: "",
            description: "",
            frequency: "",
            paid_to: "",
            payment_mode: "",
            payment_status: "",
        });
        setEditingId(null);
        setFilteredSubcategories([]);
    };

    // ===== Filter + Pagination =====
    const filtered = expenses.filter((e) =>
        e.description?.toLowerCase().includes(search.toLowerCase())
    );

    const indexOfLast = currentPage * itemsPerPage;
    const indexOfFirst = indexOfLast - itemsPerPage;
    const currentItems = filtered.slice(indexOfFirst, indexOfLast);
    const totalPages = Math.ceil(filtered.length / itemsPerPage);

    // ===== Total Expense =====
    const totalExpense = filtered.reduce(
        (sum, e) => sum + parseFloat(e.amount || 0),
        0
    );

    return (
        <div className="expense-container">
            <div className="expense-header">
                <h2>Expense Entry</h2>
                <button className="new-entry-btn" onClick={() => setShowForm(!showForm)}>
                    {showForm ? "Cancel" : "Add Entry"}
                </button>
            </div>

            {/* ===== Search Bar ===== */}
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

            {/* ===== Form ===== */}
            {showForm && (
                <form className="expense-form" onSubmit={handleSubmit}>
                    <div className="form-grid">
                        <select name="wing_id" value={form.wing_id} onChange={handleChange} required>
                            <option value="">Select Wing</option>
                            {wings.map((w) => (
                                <option key={w.wing_id} value={w.wing_id}>
                                    {w.wing_name}
                                </option>
                            ))}
                        </select>

                        <select name="catg_id" value={form.catg_id} onChange={handleCategoryChange} required>
                            <option value="">Select Category</option>
                            {categories.map((c) => (
                                <option key={c.catg_id} value={c.catg_id}>
                                    {c.catg_name}
                                </option>
                            ))}
                        </select>

                        <select name="subcatg_name" value={form.subcatg_name} onChange={handleChange}>
                            <option value="">Select Subcategory</option>
                            {filteredSubcategories.map((s) => (
                                <option key={s.subcatg_id} value={s.subcatg_name}>
                                    {s.subcatg_name}
                                </option>
                            ))}
                        </select>


                        <input type="date" name="date" value={form.date} onChange={handleChange} required />
                        <input type="number" name="amount" placeholder="Amount" value={form.amount} onChange={handleChange} required />
                        <input type="text" name="description" placeholder="Description" value={form.description} onChange={handleChange} />
                        <input type="text" name="frequency" placeholder="Frequency" value={form.frequency} onChange={handleChange} />
                        <input type="text" name="paid_to" placeholder="Paid To" value={form.paid_to} onChange={handleChange} />
                        <input type="text" name="payment_mode" placeholder="Payment Mode" value={form.payment_mode} onChange={handleChange} />
                        <select name="payment_status" value={form.payment_status} onChange={handleChange}>
                            <option value="">Select Status</option>
                            <option value="Paid">Paid</option>
                            <option value="Pending">Pending</option>
                        </select>
                    </div>

                    <button type="submit">{editingId ? "Update Expense" : "Add Expense"}</button>
                </form>
            )}

            {/* ===== Table ===== */}
            {!showForm && (
                <>
                    <table className="expense-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Wing</th>
                                <th>Category</th>
                                <th>Subcategory</th>
                                <th>Date</th>
                                <th>Amount</th>
                                <th>Description</th>
                                <th>Paid To</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentItems.map((e) => (
                                <tr key={e.exp_id} className={e.is_deleted ? "deleted-row" : ""}>
                                    <td>{e.exp_id}</td>
                                    <td>{wings.find((w) => w.wing_id === e.wing_id)?.wing_name || "-"}</td>
                                    {/* <td>{categories.find((c) => c.catg_id === e.catg_id)?.catg_name || "-"}</td>
                                    <td>{e.subcatg_name || "-"}</td> */}

                                    <td>{categories.find(c => c.catg_id === e.catg_id)?.catg_name || "-"}</td>
                                    <td>{e.subcatg_name || "-"}</td>
                                    {/* <td>
                                        {
                                            categories.find(
                                                (c) => c.catg_id === e.catg_id && !c.subcatg_name
                                            )?.catg_name || "-"
                                        }
                                    </td>
                                    <td>
                                        {
                                            categories.find(
                                                (c) =>
                                                    c.catg_id === e.catg_id &&
                                                    c.subcatg_name === e.subcatg_name
                                            )?.subcatg_name || "-"
                                        }
                                    </td> */}

                                    <td>{new Date(e.date).toLocaleDateString()}</td>
                                    <td>₹ {e.amount}</td>
                                    <td>{e.description}</td>
                                    <td>{e.paid_to}</td>
                                    <td>{e.payment_status}</td>
                                    <td>
                                        {!e.is_deleted ? (
                                            <>
                                                <button onClick={() => handleEdit(e)}>✏️</button>
                                                <button onClick={() => handleDelete(e.exp_id)}>🗑️</button>
                                            </>
                                        ) : (
                                            <button onClick={() => handleRestore(e.exp_id)}>♻️</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* ===== Pagination ===== */}
                    <div className="pagination">
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)}>⟸ Prev</button>
                        <span>Page {currentPage} of {totalPages}</span>
                        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(currentPage + 1)}>Next ⟹</button>
                    </div>

                    {/* ===== Total Expense ===== */}
                    <div className="total-expense">
                        <h3>Total Expenses: ₹ {totalExpense.toFixed(2)}</h3>
                    </div>
                </>
            )}
        </div>
    );
};

export default ExpenseEntry;
