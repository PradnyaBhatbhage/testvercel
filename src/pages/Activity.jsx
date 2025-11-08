import React, { useEffect, useState } from "react";
import {
    getActivities,
    createActivity,
    updateActivity,
    deleteActivity,
    restoreActivity,
} from "../services/api";
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

    const handleRestore = async (id) => {
        await restoreActivity(id);
        alert("Restored successfully!");
        fetchActivities();
    };

    const filtered = activities.filter((a) =>
        a.activity_name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="activity-container">
            <div className="activity-header">
                <h2>Activity Management</h2>
                <button className="new-entry-btn" onClick={() => setShowForm(!showForm)}>
                    {showForm ? "Cancel" : "New Entry"}
                </button>
            </div>

            <div className="search-bar">
                <input
                    type="text"
                    placeholder="Search by activity name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

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

                    <button type="submit" className="submit-btn">
                        {editingId ? "Update Activity" : "Add Activity"}
                    </button>
                </form>
            )}

            <table className="activity-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Activity Name</th>
                        <th>Plan Date</th>
                        <th>Activity Date</th>
                        <th>Description</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {filtered.length > 0 ? (
                        filtered.map((a) => (
                            <tr key={a.activity_id}>
                                <td>{a.activity_id}</td>
                                <td>{a.activity_name}</td>
                                <td>{a.plan_date?.split("T")[0]}</td>
                                <td>{a.activity_date?.split("T")[0]}</td>
                                <td>{a.description}</td>
                                <td>
                                    <button onClick={() => handleEdit(a)}>Edit</button>
                                    <button onClick={() => handleDelete(a.activity_id)}>Delete</button>
                                    <button onClick={() => handleRestore(a.activity_id)}>Restore</button>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="6" style={{ textAlign: "center" }}>
                                No activities found.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default Activity;