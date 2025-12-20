import React, { useEffect, useState } from "react";
import {
    getActivities,
    createActivity,
    updateActivity,
    deleteActivity,
} from "../services/api";
import { canEdit, canDelete } from "../utils/ownerFilter";
import "../css/Activity.css";

const Activity = () => {
    const [activities, setActivities] = useState([]);
    const [formData, setFormData] = useState({
        activity_name: "",
        plan_date: "",
        activity_date: "",
        description: "",
    });
    const [editingId, setEditingId] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [search, setSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const fetchActivities = async () => {
        try {
            const { data } = await getActivities();
            setActivities(data);
        } catch (err) {
            console.error("Error fetching activities:", err);
        }
    };

    useEffect(() => {
        fetchActivities();
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await updateActivity(editingId, formData);
                alert("Activity updated successfully!");
            } else {
                await createActivity(formData);
                alert("Activity added successfully!");
            }
            setFormData({ activity_name: "", plan_date: "", activity_date: "", description: "" });
            setEditingId(null);
            setShowForm(false);
            fetchActivities();
        } catch {
            alert("Error saving activity!");
        }
    };

    const handleEdit = (act) => {
        setFormData({
            activity_name: act.activity_name,
            plan_date: act.plan_date?.split("T")[0],
            activity_date: act.activity_date?.split("T")[0],
            description: act.description,
        });
        setEditingId(act.activity_id);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        const reason = prompt("Enter reason for deletion:");
        if (!reason) return;
        await deleteActivity(id, reason);
        alert("Deleted successfully!");
        fetchActivities();
    };

    const handleCancel = () => {
        setFormData({ activity_name: "", plan_date: "", activity_date: "", description: "" });
        setEditingId(null);
        setShowForm(false);
    };

    const filtered = activities.filter((a) =>
        a.activity_name.toLowerCase().includes(search.toLowerCase())
    );

    // Pagination logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentActivities = filtered.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filtered.length / itemsPerPage);

    // Reset to page 1 when search changes
    React.useEffect(() => {
        setCurrentPage(1);
    }, [search]);

    return (
        <div className="activity-container">
            <h2>Activity Management</h2>

            {/* Controls (New Entry + Search) - Only show when form is not visible */}
            {!showForm && (
                <div className="activity-controls">
                    {canEdit() && (
                        <button className="new-entry-btn" onClick={() => setShowForm(true)}>
                            New Entry
                        </button>
                    )}
                    <div className="search-bar">
                        <input
                            type="text"
                            placeholder="Search by activity name..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
            )}

            {/* Form */}
            {showForm && (
                <form className="activity-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Activity Name:</label>
                        <input
                            type="text"
                            name="activity_name"
                            value={formData.activity_name}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Plan Date:</label>
                        <input
                            type="date"
                            name="plan_date"
                            value={formData.plan_date}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Activity Date:</label>
                        <input
                            type="date"
                            name="activity_date"
                            value={formData.activity_date}
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

                    <div className="button-group">
                        <button type="submit" className="submit-btn">
                            {editingId ? "Update Activity" : "Add Activity"}
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
                    <table className="activity-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Activity Name</th>
                            <th>Plan Date</th>
                            <th>Activity Date</th>
                            <th>Description</th>
                            {(canEdit() || canDelete()) && <th>Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length > 0 ? (
                            currentActivities.map((a) => (
                                <tr key={a.activity_id}>
                                    <td>{a.activity_id}</td>
                                    <td>{a.activity_name}</td>
                                    <td>{a.plan_date?.split("T")[0]}</td>
                                    <td>{a.activity_date?.split("T")[0]}</td>
                                    <td>{a.description}</td>
                                    {(canEdit() || canDelete()) && (
                                        <td>
                                            {canEdit() && (
                                                <button onClick={() => handleEdit(a)}>Edit</button>
                                            )}
                                            {canDelete() && (
                                                <button onClick={() => handleDelete(a.activity_id)}>Delete</button>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={(canEdit() || canDelete()) ? "6" : "5"} style={{ textAlign: "center" }}>
                                    No activities found.
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

export default Activity;