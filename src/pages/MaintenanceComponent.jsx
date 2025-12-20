import React, { useEffect, useState } from "react";
import {
    getMaintenanceComponents,
    addMaintenanceComponent,
    updateMaintenanceComponent,
    deleteMaintenanceComponent,
} from "../services/api";
import { canEdit, canDelete } from "../utils/ownerFilter";
import "../css/Maintenance.css";

const MaintenanceComponent = () => {
    const [components, setComponents] = useState([]);
    const [formData, setFormData] = useState({ componant_name: "", description: "" });
    const [editId, setEditId] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [search, setSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const fetchComponents = async () => {
        const res = await getMaintenanceComponents();
        setComponents(res.data);
    };

    useEffect(() => {
        fetchComponents();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editId) {
                await updateMaintenanceComponent(editId, formData);
                alert("Component updated successfully!");
            } else {
                await addMaintenanceComponent(formData);
                alert("Component added successfully!");
            }
            setFormData({ componant_name: "", description: "" });
            setEditId(null);
            setShowForm(false);
            fetchComponents();
        } catch (err) {
            console.error(err);
            alert("Error saving component!");
        }
    };

    const handleEdit = (item) => {
        setFormData(item);
        setEditId(item.componant_id);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        const reason = prompt("Enter delete reason:");
        if (reason) {
            try {
                await deleteMaintenanceComponent(id, reason);
                alert("Component deleted successfully!");
                fetchComponents();
            } catch (err) {
                console.error(err);
                alert("Error deleting component!");
            }
        }
    };

    const handleCancel = () => {
        setFormData({ componant_name: "", description: "" });
        setEditId(null);
        setShowForm(false);
    };

    // Filter components based on search
    const filtered = components.filter((c) =>
        c.componant_name?.toLowerCase().includes(search.toLowerCase()) ||
        c.description?.toLowerCase().includes(search.toLowerCase())
    );

    // Pagination logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentComponents = filtered.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filtered.length / itemsPerPage);

    // Reset to page 1 when search changes
    React.useEffect(() => {
        setCurrentPage(1);
    }, [search]);

    return (
        <div className="maintenance-detail-container">
            <h2>Maintenance Components</h2>

            {/* Controls (New Entry + Search) - Only show when form is not visible */}
            {!showForm && (
                <div className="maintenance-controls">
                    {canEdit() && (
                        <button className="new-entry-btn" onClick={() => setShowForm(true)}>
                            New Entry
                        </button>
                    )}
                    <div className="search-bar">
                        <input
                            type="text"
                            placeholder="Search by component name or description..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
            )}

            {/* Form */}
            {showForm && (
                <form onSubmit={handleSubmit} className="maintenance-form-wrapper">
                    <div className="form-section">
                        <div className="form-group">
                            <label>Component Name:</label>
                            <input
                                type="text"
                                placeholder="Component Name"
                                value={formData.componant_name}
                                onChange={(e) => setFormData({ ...formData, componant_name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Description:</label>
                            <input
                                type="text"
                                placeholder="Description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="form-actions">
                        <button type="submit" className="submit-btn">
                            {editId ? "Update Component" : "Add Component"}
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
                    <table className="maintenance-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Component Name</th>
                                <th>Description</th>
                                {(canEdit() || canDelete()) && <th>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length > 0 ? (
                                currentComponents.map((item) => (
                                    <tr key={item.componant_id}>
                                        <td>{item.componant_id}</td>
                                        <td>{item.componant_name}</td>
                                        <td>{item.description}</td>
                                        {(canEdit() || canDelete()) && (
                                            <td>
                                                {canEdit() && (
                                                    <button onClick={() => handleEdit(item)}>Edit</button>
                                                )}
                                                {canDelete() && (
                                                    <button onClick={() => handleDelete(item.componant_id)}>Delete</button>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={(canEdit() || canDelete()) ? "4" : "3"} style={{ textAlign: "center" }}>
                                        No components found.
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

export default MaintenanceComponent;