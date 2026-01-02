import React, { useEffect, useState } from "react";
import {
    getExpenses,
    createExpense,
    updateExpense,
    deleteExpense,
    getWings,
    getCategories,
} from "../services/api";
import { getCurrentUserWingId, filterByWing } from "../utils/wingFilter";
import { canEdit, canDelete } from "../utils/ownerFilter";
import "../css/ExpenseEntry.css";

const ExpenseEntry = () => {
    const [expenses, setExpenses] = useState([]);
    const [wings, setWings] = useState([]);
    const [categories, setCategories] = useState([]);
    const [filteredSubcategories, setFilteredSubcategories] = useState([]);
    const [uniqueCategories, setUniqueCategories] = useState([]); // Categories grouped by name

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
    const itemsPerPage = 10;
    const [selectedFile, setSelectedFile] = useState(null);
    const [filePreview, setFilePreview] = useState(null);

    // Get current user's wing_id
    const currentUserWingId = getCurrentUserWingId();

    // ===== Fetch Data =====
    useEffect(() => {
        fetchExpenses();
        fetchWings();
        fetchCategories();
    }, []);

    const fetchExpenses = async () => {
        try {
            const res = await getExpenses();
            const rawExpenses = res.data || [];

            // Filter expenses by current user's wing
            if (currentUserWingId !== null) {
                const filteredExpenses = filterByWing(rawExpenses, currentUserWingId, 'wing_id');
                setExpenses(filteredExpenses);
            } else {
                setExpenses(rawExpenses);
            }
        } catch (err) {
            console.error("Error fetching expenses:", err);
        }
    };

    const fetchWings = async () => {
        try {
            const res = await getWings();
            // Filter wings by current user's wing_id
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

    const fetchCategories = async () => {
        try {
            const res = await getCategories();
            const allCategories = res.data || [];
            setCategories(allCategories);

            // Group categories by catg_name to get unique category names
            const categoryMap = new Map();
            allCategories.forEach(cat => {
                if (cat.catg_name) {
                    if (!categoryMap.has(cat.catg_name)) {
                        categoryMap.set(cat.catg_name, {
                            catg_name: cat.catg_name,
                            catg_ids: [],
                            subcategories: []
                        });
                    }
                    const categoryGroup = categoryMap.get(cat.catg_name);
                    if (!categoryGroup.catg_ids.includes(cat.catg_id)) {
                        categoryGroup.catg_ids.push(cat.catg_id);
                    }
                    if (cat.subcatg_name && !categoryGroup.subcategories.some(s => s.subcatg_name === cat.subcatg_name && s.catg_id === cat.catg_id)) {
                        categoryGroup.subcategories.push({
                            subcatg_name: cat.subcatg_name,
                            catg_id: cat.catg_id,
                            subcatg_id: cat.subcatg_id
                        });
                    }
                }
            });

            // Convert map to array
            const uniqueCats = Array.from(categoryMap.values());
            setUniqueCategories(uniqueCats);
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
        const selectedCatgName = e.target.value;
        setForm({ ...form, catg_id: "", subcatg_name: "" });

        // Find the category group by name
        const categoryGroup = uniqueCategories.find(c => c.catg_name === selectedCatgName);

        if (categoryGroup) {
            // Show all subcategories from all categories with this name
            setFilteredSubcategories(categoryGroup.subcategories);
        } else {
            setFilteredSubcategories([]);
        }
    };

    // Handle subcategory change - set the catg_id based on selected subcategory
    const handleSubcategoryChange = (e) => {
        const selectedSubcatgName = e.target.value;
        const selectedSubcategory = filteredSubcategories.find(
            s => s.subcatg_name === selectedSubcatgName
        );

        if (selectedSubcategory) {
            setForm({
                ...form,
                subcatg_name: selectedSubcatgName,
                catg_id: selectedSubcategory.catg_id
            });
        } else {
            setForm({ ...form, subcatg_name: selectedSubcatgName });
        }
    };

    // ===== Handle Input =====
    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
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
                await updateExpense(editingId, form, selectedFile);
                alert("Expense updated successfully");
            } else {
                await createExpense(form, selectedFile);
                alert("Expense added successfully");
            }
            clearForm();
            setShowForm(false);
            setSelectedFile(null);
            setFilePreview(null);
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
            attachment_url: exp.attachment_url || null,
        });
        setEditingId(exp.exp_id);
        setSelectedFile(null);
        setFilePreview(exp.attachment_url && exp.attachment_url.startsWith('http') ? exp.attachment_url : null);
        setShowForm(true);

        // Find the category name for this catg_id
        const category = categories.find(c => c.catg_id === exp.catg_id);
        if (category && category.catg_name) {
            // Find all subcategories for categories with the same name
            const categoryGroup = uniqueCategories.find(c => c.catg_name === category.catg_name);
            if (categoryGroup) {
                setFilteredSubcategories(categoryGroup.subcategories);
            } else {
                // Fallback: show subcategories for this catg_id only
                const subs = categories.filter(
                    (c) => c.catg_id === exp.catg_id && c.subcatg_name
                );
                setFilteredSubcategories(subs);
            }
        }
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

    // ===== Handle Cancel =====
    const handleCancel = () => {
        clearForm();
        setShowForm(false);
    };

    // ===== Clear Form =====
    const clearForm = () => {
        // Auto-set wing_id to current user's wing when resetting for new entry
        let defaultWingId = "";
        if (wings.length > 0) {
            defaultWingId = wings[0].wing_id;
        } else if (currentUserWingId !== null) {
            defaultWingId = currentUserWingId;
        }
        
        setForm({
            wing_id: defaultWingId,
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
        setSelectedFile(null);
        setFilePreview(null);
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
            <h2>Expense Entry</h2>

            {/* Controls (New Entry + Search) - Only show when form is not visible */}
            {!showForm && (
                <div className="expense-controls">
                    {canEdit() && (
                        <button className="new-entry-btn" onClick={() => {
                            // Auto-set wing_id to current user's wing when creating new entry
                            if (wings.length > 0) {
                                setForm(prev => ({ ...prev, wing_id: wings[0].wing_id }));
                            } else if (currentUserWingId !== null) {
                                setForm(prev => ({ ...prev, wing_id: currentUserWingId }));
                            }
                            setShowForm(true);
                        }}>
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

            {/* ===== Form ===== */}
            {showForm && (
                <form className="expense-form" onSubmit={handleSubmit}>
                    <div className="form-grid">
                        <select 
                            name="wing_id" 
                            value={form.wing_id} 
                            onChange={handleChange} 
                            required
                            disabled={currentUserWingId !== null && wings.length === 1}
                        >
                            <option value="">Select Wing</option>
                            {wings.map((w) => (
                                <option key={w.wing_id} value={w.wing_id}>
                                    {w.wing_name}
                                </option>
                            ))}
                        </select>

                        <select
                            name="catg_name"
                            value={uniqueCategories.find(c => c.catg_ids.includes(parseInt(form.catg_id)))?.catg_name || ""}
                            onChange={handleCategoryChange}
                            required
                        >
                            <option value="">Select Category</option>
                            {uniqueCategories.map((c) => (
                                <option key={c.catg_name} value={c.catg_name}>
                                    {c.catg_name}
                                </option>
                            ))}
                        </select>

                        <select
                            name="subcatg_name"
                            value={form.subcatg_name}
                            onChange={handleSubcategoryChange}
                        >
                            <option value="">Select Subcategory</option>
                            {filteredSubcategories.map((s, index) => (
                                <option key={`${s.catg_id}-${s.subcatg_name}-${index}`} value={s.subcatg_name}>
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
                        {filePreview && !selectedFile && form.attachment_url && (
                            <div style={{ marginTop: '10px' }}>
                                <p style={{ fontSize: '12px', color: '#666' }}>Current document:</p>
                                {form.attachment_url.endsWith('.pdf') || form.attachment_url.includes('pdf') ? (
                                    <a href={form.attachment_url} target="_blank" rel="noopener noreferrer" style={{ color: '#007bff' }}>
                                        View PDF
                                    </a>
                                ) : (
                                    <img src={form.attachment_url} alt="Attachment" style={{ maxWidth: '200px', maxHeight: '200px', marginTop: '5px' }} />
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

            {/* ===== Table ===== */}
            {!showForm && (
                <>
                    <table className="expense-table">
                        <thead>
                            <tr>
                                <th>Sr. No.</th>
                                <th>Wing</th>
                                <th>Category</th>
                                <th>Subcategory</th>
                                <th>Date</th>
                                <th>Amount</th>
                                <th>Description</th>
                                <th>Paid To</th>
                                <th>Status</th>
                                <th>Attachment</th>
                                {(canEdit() || canDelete()) && <th>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {currentItems.map((e, index) => (
                                <tr key={e.exp_id} className={e.is_deleted ? "deleted-row" : ""}>
                                    <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                    <td>{wings.find((w) => w.wing_id === e.wing_id)?.wing_name || "-"}</td>
                                    {/* <td>{categories.find((c) => c.catg_id === e.catg_id)?.catg_name || "-"}</td>
                                    <td>{e.subcatg_name || "-"}</td> */}

                                    <td>{e.catg_name || categories.find(c => c.catg_id === e.catg_id)?.catg_name || "-"}</td>
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
                                        <td>
                                            {canEdit() && (
                                                <button onClick={() => handleEdit(e)}>Edit</button>
                                            )}
                                            {canDelete() && (
                                                <button onClick={() => handleDelete(e.exp_id)}>Delete</button>
                                            )}
                                        </td>
                                    )}
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
