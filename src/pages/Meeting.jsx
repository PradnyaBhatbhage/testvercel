import React, { useEffect, useState } from "react";
import {
    getMeetings,
    createMeeting,
    updateMeeting,
    deleteMeeting,
    restoreMeeting,
    getWings, // ✅ added this to fetch wing list
} from "../services/api";
import "../css/Meeting.css";

const Meeting = () => {
    const [meetings, setMeetings] = useState([]);
    const [wings, setWings] = useState([]); // ✅ new state for wings
    const [formData, setFormData] = useState({
        wing_id: "",
        meeting_name: "",
        purpose: "",
        meeting_date: "",
        description: "",
    });
    const [editingId, setEditingId] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    // Fetch meetings
    const fetchMeetings = async () => {
        try {
            const { data } = await getMeetings();
            setMeetings(data);
        } catch (error) {
            console.error("Error fetching meetings:", error);
        }
    };

    // ✅ Fetch wings for dropdown
    const fetchWings = async () => {
        try {
            const { data } = await getWings();
            setWings(data);
        } catch (error) {
            console.error("Error fetching wings:", error);
        }
    };

    useEffect(() => {
        fetchMeetings();
        fetchWings(); // ✅ load wings on component mount
    }, []);

    // Handle input change
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Submit form (create or update)
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await updateMeeting(editingId, formData);
                alert("Meeting updated successfully!");
            } else {
                await createMeeting(formData);
                alert("Meeting added successfully!");
            }
            setFormData({
                wing_id: "",
                meeting_name: "",
                purpose: "",
                meeting_date: "",
                description: "",
            });
            setEditingId(null);
            setShowForm(false);
            fetchMeetings();
        } catch (error) {
            alert("Error saving meeting!");
            console.error(error);
        }
    };

    // Edit meeting
    const handleEdit = (meeting) => {
        setFormData({
            wing_id: meeting.wing_id,
            meeting_name: meeting.meeting_name,
            purpose: meeting.purpose,
            meeting_date: meeting.meeting_date?.split("T")[0],
            description: meeting.description,
        });
        setEditingId(meeting.meeting_id);
        setShowForm(true);
    };

    // Delete meeting
    const handleDelete = async (id) => {
        const reason = prompt("Enter reason for deletion:");
        if (!reason) return;
        try {
            await deleteMeeting(id, reason);
            alert("Meeting deleted successfully!");
            fetchMeetings();
        } catch (error) {
            alert("Error deleting meeting!");
            console.error(error);
        }
    };

    // Restore meeting
    const handleRestore = async (id) => {
        try {
            await restoreMeeting(id);
            alert("Meeting restored successfully!");
            fetchMeetings();
        } catch (error) {
            alert("Error restoring meeting!");
            console.error(error);
        }
    };

    // Filter meetings
    const filteredMeetings = meetings.filter(
        (m) =>
            m.meeting_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.purpose?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="meeting-container">
            <div className="meeting-header">
                <h2>Meeting Management</h2>
                <button className="new-entry-btn" onClick={() => setShowForm(!showForm)}>
                    {showForm ? "Cancel" : "New Entry"}
                </button>
            </div>

            {/* Search Bar */}
            <div className="search-bar">
                <input
                    type="text"
                    placeholder="Search by Meeting Name or Purpose..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Form */}
            {showForm && (
                <form className="meeting-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Wing:</label>
                        <select
                            name="wing_id"
                            value={formData.wing_id}
                            onChange={handleChange}
                            required
                        >
                            <option value="">Select Wing</option>
                            {wings.map((wing) => (
                                <option key={wing.wing_id} value={wing.wing_id}>
                                    {wing.wing_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Meeting Name:</label>
                        <input
                            type="text"
                            name="meeting_name"
                            value={formData.meeting_name}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Purpose:</label>
                        <input
                            type="text"
                            name="purpose"
                            value={formData.purpose}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="form-group">
                        <label>Meeting Date:</label>
                        <input
                            type="date"
                            name="meeting_date"
                            value={formData.meeting_date}
                            onChange={handleChange}
                            required
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
                        {editingId ? "Update Meeting" : "Add Meeting"}
                    </button>
                </form>
            )}

            {/* Table */}
            <table className="meeting-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Wing</th>
                        <th>Meeting Name</th>
                        <th>Purpose</th>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredMeetings.length > 0 ? (
                        filteredMeetings.map((m) => (
                            <tr key={m.meeting_id}>
                                <td>{m.meeting_id}</td>
                                <td>
                                    {wings.find((w) => w.wing_id === m.wing_id)?.wing_name || m.wing_id}
                                </td>
                                <td>{m.meeting_name}</td>
                                <td>{m.purpose}</td>
                                <td>{m.meeting_date ? m.meeting_date.split("T")[0] : ""}</td>
                                <td>{m.description}</td>
                                <td>
                                    <button onClick={() => handleEdit(m)}>Edit</button>
                                    <button onClick={() => handleDelete(m.meeting_id)}>Delete</button>
                                    <button onClick={() => handleRestore(m.meeting_id)}>Restore</button>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="7" style={{ textAlign: "center" }}>
                                No meetings found.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default Meeting;