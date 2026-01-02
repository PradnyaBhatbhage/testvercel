import React, { useState, useEffect } from "react";
import {
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory,
} from "../services/api";
import { canEdit, canDelete } from "../utils/ownerFilter";
import "../css/Category.css";

const Category = () => {
    const [categories, setCategories] = useState([]);
    const [filteredCategories, setFilteredCategories] = useState([]);
    const [formData, setFormData] = useState({
        catg_name: "",
        subcatg_name: "",
        description: "",
        status: "Active",
    });
    const [editingId, setEditingId] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Fetch all categories
    const fetchCategories = async () => {
        try {
            const { data } = await getCategories();
            setCategories(data);
            setFilteredCategories(data);
        } catch (error) {
            console.error("Error fetching categories:", error);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    // Handle input changes
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Submit or update category
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await updateCategory(editingId, formData);
                alert("Category updated successfully!");
            } else {
                await createCategory(formData);
                alert("Category added successfully!");
            }
            setFormData({ catg_name: "", subcatg_name: "", description: "", status: "Active" });
            setEditingId(null);
            setShowForm(false);
            fetchCategories();
        } catch (error) {
            alert("Error saving category!");
            console.error(error);
        }
    };

    const handleCancel = () => {
        // reset form and hide
        setFormData({ catg_name: "", subcatg_name: "", description: "", status: "Active" });
        setEditingId(null);
        setShowForm(false);
    };

    // Edit category
    const handleEdit = (cat) => {
        setFormData({
            catg_name: cat.catg_name,
            subcatg_name: cat.subcatg_name,
            description: cat.description,
            status: cat.status,
        });
        setEditingId(cat.catg_id);
        setShowForm(true);
    };

    // Delete category
    const handleDelete = async (id) => {
        const reason = prompt("Enter reason for deletion:");
        if (!reason) return;
        try {
            await deleteCategory(id, reason);
            alert("Category deleted successfully!");
            fetchCategories();
        } catch (error) {
            alert("Error deleting category!");
            console.error(error);
        }
    };

    // 🔍 Filter categories based on search input
    const handleSearch = (e) => {
        const value = e.target.value.toLowerCase();
        setSearchTerm(value);

        const filtered = categories.filter(
            (cat) =>
                cat.catg_name.toLowerCase().includes(value) ||
                (cat.subcatg_name && cat.subcatg_name.toLowerCase().includes(value))
        );

        setFilteredCategories(filtered);
        setCurrentPage(1); // Reset to page 1 when search changes
    };

    // Pagination logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentCategories = filteredCategories.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredCategories.length / itemsPerPage);

    return (
        <div className="category-container">
            <div className="category-header">
                <h2>Category Management</h2>
            </div>

            <div className="category-controls">
                {!showForm && (
                    <>
                        {canEdit() && (
                            <button className="new-entry-btn" onClick={() => setShowForm(!showForm)}>
                                New Entry
                            </button>
                        )}

                        {/* 🔍 Search Bar */}
                        <div className="search-bar">
                            <input
                                type="text"
                                placeholder="Search by Category or Subcategory..."
                                value={searchTerm}
                                onChange={handleSearch}
                            />
                        </div>
                    </>
                )}
            </div>

            {showForm && (
                <form className="category-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Category Name:</label>
                        <input
                            type="text"
                            name="catg_name"
                            value={formData.catg_name}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Subcategory Name:</label>
                        <input
                            type="text"
                            name="subcatg_name"
                            value={formData.subcatg_name}
                            onChange={handleChange}
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
                        <label>Status:</label>
                        <select name="status" value={formData.status} onChange={handleChange}>
                            <option>Active</option>
                            <option>Inactive</option>
                        </select>
                    </div>

                    <div className="button-group">
                        <button type="submit" className="submit-btn">
                            {editingId ? "Update Category" : "Add Category"}
                        </button>
                        <button type="button" className="cancel-btn" onClick={handleCancel}>
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            {!showForm && (
                <>
                    <table className="category-table">
                        <thead>
                            <tr>
                                <th>Sr. No.</th>
                                <th>Category</th>
                                <th>Subcategory</th>
                                <th>Description</th>
                                <th>Status</th>
                                {canEdit() || canDelete() ? <th>Actions</th> : null}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCategories.length > 0 ? (
                                currentCategories.map((cat, index) => (
                                    <tr key={cat.catg_id}>
                                        <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                        <td>{cat.catg_name}</td>
                                        <td>{cat.subcatg_name}</td>
                                        <td>{cat.description}</td>
                                        <td>{cat.status}</td>
                                        {(canEdit() || canDelete()) && (
                                            <td>
                                                {canEdit() && (
                                                    <button onClick={() => handleEdit(cat)}>Edit</button>
                                                )}
                                                {canDelete() && (
                                                    <button onClick={() => handleDelete(cat.catg_id)}>Delete</button>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={(canEdit() || canDelete()) ? "6" : "5"} style={{ textAlign: "center" }}>
                                        No categories found.
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
        </div>
    );
};

export default Category;
