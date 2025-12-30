import React, { useState, useEffect } from "react";
import { createNotification, getNotifications } from "../services/api";
import { canEdit } from "../utils/ownerFilter";
import { getWings } from "../services/api";
import "../css/Announcements.css";

const Announcements = () => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const [formData, setFormData] = useState({
        notification_type: "announcement",
        title: "",
        message: "",
        notification_date: "",
        target_audience: "all",
        wing_id: "",
        cutoff_date: "",
    });
    const [wings, setWings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [announcements, setAnnouncements] = useState([]);
    const [showForm, setShowForm] = useState(false);

    useEffect(() => {
        fetchWings();
        fetchAnnouncements();
    }, []);

    const fetchWings = async () => {
        try {
            const res = await getWings();
            setWings(Array.isArray(res.data) ? res.data : res.data?.data || []);
        } catch (err) {
            console.error("Error fetching wings:", err);
        }
    };

    const fetchAnnouncements = async () => {
        try {
            const userData = {
                user_id: user.user_id,
                role_type: user.role_type,
                wing_id: user.wing_id
            };
            const res = await getNotifications(userData);
            const notifs = Array.isArray(res.data) ? res.data : [];
            // Filter to show only announcements and cutoffs
            const announcementsList = notifs.filter(n => 
                n.notification_type === 'announcement' || n.notification_type === 'cutoff'
            );
            setAnnouncements(announcementsList);
        } catch (err) {
            console.error("Error fetching announcements:", err);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const dataToSend = {
                ...formData,
                created_by: user.user_id,
                notification_date: formData.notification_type === 'cutoff' 
                    ? new Date(new Date(formData.cutoff_date).getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                    : formData.notification_date || new Date().toISOString().split('T')[0],
                cutoff_date: formData.notification_type === 'cutoff' ? formData.cutoff_date : null,
                wing_id: formData.target_audience === 'specific_wing' ? formData.wing_id : null,
            };

            await createNotification(dataToSend);
            alert("Announcement/Cutoff notification created successfully!");
            
            setFormData({
                notification_type: "announcement",
                title: "",
                message: "",
                notification_date: "",
                target_audience: "all",
                wing_id: "",
                cutoff_date: "",
            });
            setShowForm(false);
            fetchAnnouncements();
        } catch (err) {
            console.error(err);
            alert("Error creating notification. Check console.");
        } finally {
            setLoading(false);
        }
    };

    const getNotificationTypeLabel = (type) => {
        switch (type) {
            case 'announcement':
                return 'Announcement';
            case 'cutoff':
                return 'Cutoff Alert';
            default:
                return type;
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('en-IN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className="announcements-container">
            <div className="announcements-header">
                <h2>Announcements & Cutoffs</h2>
                {canEdit() && (
                    <button className="new-announcement-btn" onClick={() => setShowForm(true)}>
                        + New Announcement
                    </button>
                )}
            </div>

            {showForm && canEdit() && (
                <div className="announcement-form-container">
                    <div className="announcement-form">
                        <h3>Create Announcement / Cutoff Notification</h3>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Type</label>
                                <select
                                    name="notification_type"
                                    value={formData.notification_type}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="announcement">Announcement</option>
                                    <option value="cutoff">Cutoff Alert (Water/Electricity)</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Title</label>
                                <input
                                    type="text"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    placeholder="e.g., Water Supply Cutoff or Important Announcement"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Message</label>
                                <textarea
                                    name="message"
                                    value={formData.message}
                                    onChange={handleChange}
                                    rows="4"
                                    placeholder="Enter the announcement message..."
                                    required
                                />
                            </div>

                            {formData.notification_type === 'cutoff' ? (
                                <div className="form-group">
                                    <label>Cutoff Date</label>
                                    <input
                                        type="date"
                                        name="cutoff_date"
                                        value={formData.cutoff_date}
                                        onChange={handleChange}
                                        required
                                    />
                                    <small>Notification will be sent 1 day before this date</small>
                                </div>
                            ) : (
                                <div className="form-group">
                                    <label>Notification Date</label>
                                    <input
                                        type="date"
                                        name="notification_date"
                                        value={formData.notification_date}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            )}

                            <div className="form-group">
                                <label>Target Audience</label>
                                <select
                                    name="target_audience"
                                    value={formData.target_audience}
                                    onChange={handleChange}
                                >
                                    <option value="all">All Residents</option>
                                    <option value="owners">Owners Only</option>
                                    <option value="specific_wing">Specific Wing</option>
                                </select>
                            </div>

                            {formData.target_audience === 'specific_wing' && (
                                <div className="form-group">
                                    <label>Select Wing</label>
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
                            )}

                            <div className="form-actions">
                                <button type="submit" className="submit-btn" disabled={loading}>
                                    {loading ? "Creating..." : "Create Notification"}
                                </button>
                                <button
                                    type="button"
                                    className="cancel-btn"
                                    onClick={() => {
                                        setShowForm(false);
                                        setFormData({
                                            notification_type: "announcement",
                                            title: "",
                                            message: "",
                                            notification_date: "",
                                            target_audience: "all",
                                            wing_id: "",
                                            cutoff_date: "",
                                        });
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="announcements-list">
                {announcements.length === 0 ? (
                    <div className="empty-state">
                        <p>No announcements or cutoff notifications yet.</p>
                    </div>
                ) : (
                    announcements.map((announcement) => (
                        <div key={announcement.notification_id} className="announcement-card">
                            <div className="announcement-header">
                                <span className="announcement-type-badge">
                                    {announcement.notification_type === 'cutoff' ? '⚠️' : '📢'} 
                                    {getNotificationTypeLabel(announcement.notification_type)}
                                </span>
                                <span className="announcement-date">
                                    {formatDate(announcement.notification_date)}
                                </span>
                            </div>
                            <h3>{announcement.title}</h3>
                            <p>{announcement.message}</p>
                            {announcement.cutoff_date && (
                                <div className="cutoff-info">
                                    <strong>Cutoff Date:</strong> {formatDate(announcement.cutoff_date)}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Announcements;

