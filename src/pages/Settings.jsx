import React, { useState, useEffect } from "react";
import "../css/Settings.css";

const Settings = () => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const [activeTab, setActiveTab] = useState("profile");
    const [loading, setLoading] = useState(false);

    // Profile Settings
    const [profileData, setProfileData] = useState({
        user_name: user?.user_name || "",
        email: user?.email || "",
        phone: user?.phone || "",
        wing_id: user?.wing_id || "",
    });

    // Password Settings
    const [passwordData, setPasswordData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });

    // Notification Settings
    const [notificationSettings, setNotificationSettings] = useState({
        emailNotifications: user?.email_notifications !== false,
        smsNotifications: user?.sms_notifications || false,
        maintenanceReminders: user?.maintenance_reminders !== false,
        meetingReminders: user?.meeting_reminders !== false,
        paymentReminders: user?.payment_reminders !== false,
    });

    // Display Settings
    const [displaySettings, setDisplaySettings] = useState({
        theme: localStorage.getItem("theme") || "light",
        language: localStorage.getItem("language") || "en",
        dateFormat: localStorage.getItem("dateFormat") || "DD/MM/YYYY",
        itemsPerPage: localStorage.getItem("itemsPerPage") || "10",
    });

    useEffect(() => {
        // Load saved settings from localStorage
        const savedTheme = localStorage.getItem("theme");
        const savedLanguage = localStorage.getItem("language");
        const savedDateFormat = localStorage.getItem("dateFormat");
        const savedItemsPerPage = localStorage.getItem("itemsPerPage");

        if (savedTheme) setDisplaySettings(prev => ({ ...prev, theme: savedTheme }));
        if (savedLanguage) setDisplaySettings(prev => ({ ...prev, language: savedLanguage }));
        if (savedDateFormat) setDisplaySettings(prev => ({ ...prev, dateFormat: savedDateFormat }));
        if (savedItemsPerPage) setDisplaySettings(prev => ({ ...prev, itemsPerPage: savedItemsPerPage }));
    }, []);

    const handleProfileChange = (e) => {
        const { name, value } = e.target;
        setProfileData(prev => ({ ...prev, [name]: value }));
    };

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({ ...prev, [name]: value }));
    };

    const handleNotificationChange = (e) => {
        const { name, checked } = e.target;
        setNotificationSettings(prev => ({ ...prev, [name]: checked }));
    };

    const handleDisplayChange = (e) => {
        const { name, value } = e.target;
        setDisplaySettings(prev => ({ ...prev, [name]: value }));

        // Save to localStorage immediately
        localStorage.setItem(name, value);

        // Apply theme immediately
        if (name === "theme") {
            document.documentElement.setAttribute("data-theme", value);
        }
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Here you would call an API to update profile
            // await updateProfile(profileData);

            // Update localStorage
            const updatedUser = { ...user, ...profileData };
            localStorage.setItem("user", JSON.stringify(updatedUser));

            alert("Profile updated successfully!");
        } catch (error) {
            alert("Error updating profile: " + (error.message || "Unknown error"));
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            alert("New passwords do not match!");
            return;
        }

        if (passwordData.newPassword.length < 6) {
            alert("Password must be at least 6 characters long!");
            return;
        }

        setLoading(true);

        try {
            // Here you would call an API to change password
            // await changePassword(passwordData);

            alert("Password changed successfully!");
            setPasswordData({
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
            });
        } catch (error) {
            alert("Error changing password: " + (error.message || "Unknown error"));
        } finally {
            setLoading(false);
        }
    };

    const handleNotificationSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Here you would call an API to update notification settings
            // await updateNotificationSettings(notificationSettings);

            // Update localStorage
            const updatedUser = { ...user, ...notificationSettings };
            localStorage.setItem("user", JSON.stringify(updatedUser));

            alert("Notification settings updated successfully!");
        } catch (error) {
            alert("Error updating notification settings: " + (error.message || "Unknown error"));
        } finally {
            setLoading(false);
        }
    };


    const tabs = [
        { id: "profile", label: "Profile", icon: "👤" },
        { id: "password", label: "Password", icon: "🔒" },
        { id: "notifications", label: "Notifications", icon: "🔔" },
        { id: "display", label: "Display", icon: "🎨" },
    ];

    return (
        <div className="settings-container">
            <div className="settings-header">
                <h2>Settings</h2>
                <p>Manage your account settings and preferences</p>
            </div>

            <div className="settings-content">
                <div className="settings-sidebar">
                    <ul className="settings-tabs">
                        {tabs.map(tab => (
                            <li
                                key={tab.id}
                                className={activeTab === tab.id ? "active" : ""}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                <span className="tab-icon">{tab.icon}</span>
                                <span className="tab-label">{tab.label}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="settings-panel">
                    {/* Profile Tab */}
                    {activeTab === "profile" && (
                        <div className="settings-section">
                            <h3>Profile Information</h3>
                            <form onSubmit={handleProfileSubmit}>
                                <div className="form-group">
                                    <label>Username</label>
                                    <input
                                        type="text"
                                        name="user_name"
                                        value={profileData.user_name}
                                        onChange={handleProfileChange}
                                        disabled
                                        className="disabled-input"
                                    />
                                    <small>Username cannot be changed</small>
                                </div>

                                <div className="form-group">
                                    <label>Email</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={profileData.email}
                                        onChange={handleProfileChange}
                                        placeholder="Enter your email"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Phone Number</label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={profileData.phone}
                                        onChange={handleProfileChange}
                                        placeholder="Enter your phone number"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Wing ID</label>
                                    <input
                                        type="text"
                                        name="wing_id"
                                        value={profileData.wing_id}
                                        onChange={handleProfileChange}
                                        disabled
                                        className="disabled-input"
                                    />
                                    <small>Wing ID cannot be changed</small>
                                </div>

                                <div className="form-group">
                                    <label>Role</label>
                                    <input
                                        type="text"
                                        value={user?.role_type === "user" ? "Committee Members" : (user?.role_type || "Committee Members")}
                                        disabled
                                        className="disabled-input"
                                    />
                                </div>

                                <button type="submit" className="btn-primary" disabled={loading}>
                                    {loading ? "Saving..." : "Save Changes"}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Password Tab */}
                    {activeTab === "password" && (
                        <div className="settings-section">
                            <h3>Change Password</h3>
                            <form onSubmit={handlePasswordSubmit}>
                                <div className="form-group">
                                    <label>Current Password</label>
                                    <input
                                        type="password"
                                        name="currentPassword"
                                        value={passwordData.currentPassword}
                                        onChange={handlePasswordChange}
                                        placeholder="Enter current password"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>New Password</label>
                                    <input
                                        type="password"
                                        name="newPassword"
                                        value={passwordData.newPassword}
                                        onChange={handlePasswordChange}
                                        placeholder="Enter new password"
                                        required
                                        minLength={6}
                                    />
                                    <small>Password must be at least 6 characters</small>
                                </div>

                                <div className="form-group">
                                    <label>Confirm New Password</label>
                                    <input
                                        type="password"
                                        name="confirmPassword"
                                        value={passwordData.confirmPassword}
                                        onChange={handlePasswordChange}
                                        placeholder="Confirm new password"
                                        required
                                    />
                                </div>

                                <button type="submit" className="btn-primary" disabled={loading}>
                                    {loading ? "Changing..." : "Change Password"}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Notifications Tab */}
                    {activeTab === "notifications" && (
                        <div className="settings-section">
                            <h3>Notification Preferences</h3>
                            <p className="section-description">
                                Choose how you want to be notified about important updates
                            </p>
                            <form onSubmit={handleNotificationSubmit}>
                                <div className="settings-list">
                                    <div className="setting-item">
                                        <div className="setting-info">
                                            <label>Email Notifications</label>
                                            <p>Receive notifications via email</p>
                                        </div>
                                        <label className="toggle-switch">
                                            <input
                                                type="checkbox"
                                                name="emailNotifications"
                                                checked={notificationSettings.emailNotifications}
                                                onChange={handleNotificationChange}
                                            />
                                            <span className="slider"></span>
                                        </label>
                                    </div>

                                    <div className="setting-item">
                                        <div className="setting-info">
                                            <label>SMS Notifications</label>
                                            <p>Receive notifications via SMS</p>
                                        </div>
                                        <label className="toggle-switch">
                                            <input
                                                type="checkbox"
                                                name="smsNotifications"
                                                checked={notificationSettings.smsNotifications}
                                                onChange={handleNotificationChange}
                                            />
                                            <span className="slider"></span>
                                        </label>
                                    </div>

                                    <div className="setting-item">
                                        <div className="setting-info">
                                            <label>Maintenance Reminders</label>
                                            <p>Get reminded about maintenance payments</p>
                                        </div>
                                        <label className="toggle-switch">
                                            <input
                                                type="checkbox"
                                                name="maintenanceReminders"
                                                checked={notificationSettings.maintenanceReminders}
                                                onChange={handleNotificationChange}
                                            />
                                            <span className="slider"></span>
                                        </label>
                                    </div>

                                    <div className="setting-item">
                                        <div className="setting-info">
                                            <label>Meeting Reminders</label>
                                            <p>Get reminded about upcoming meetings</p>
                                        </div>
                                        <label className="toggle-switch">
                                            <input
                                                type="checkbox"
                                                name="meetingReminders"
                                                checked={notificationSettings.meetingReminders}
                                                onChange={handleNotificationChange}
                                            />
                                            <span className="slider"></span>
                                        </label>
                                    </div>

                                    <div className="setting-item">
                                        <div className="setting-info">
                                            <label>Payment Reminders</label>
                                            <p>Get reminded about pending payments</p>
                                        </div>
                                        <label className="toggle-switch">
                                            <input
                                                type="checkbox"
                                                name="paymentReminders"
                                                checked={notificationSettings.paymentReminders}
                                                onChange={handleNotificationChange}
                                            />
                                            <span className="slider"></span>
                                        </label>
                                    </div>
                                </div>

                                <button type="submit" className="btn-primary" disabled={loading}>
                                    {loading ? "Saving..." : "Save Preferences"}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Display Tab */}
                    {activeTab === "display" && (
                        <div className="settings-section">
                            <h3>Display Preferences</h3>
                            <p className="section-description">
                                Customize how the application looks and behaves
                            </p>
                            <form>
                                <div className="form-group">
                                    <label>Theme</label>
                                    <select
                                        name="theme"
                                        value={displaySettings.theme}
                                        onChange={handleDisplayChange}
                                    >
                                        <option value="light">Light</option>
                                        <option value="dark">Dark</option>
                                        <option value="auto">Auto (System)</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Language</label>
                                    <select
                                        name="language"
                                        value={displaySettings.language}
                                        onChange={handleDisplayChange}
                                    >
                                        <option value="en">English</option>
                                        <option value="hi">Hindi</option>
                                        <option value="mr">Marathi</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Date Format</label>
                                    <select
                                        name="dateFormat"
                                        value={displaySettings.dateFormat}
                                        onChange={handleDisplayChange}
                                    >
                                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Items Per Page</label>
                                    <select
                                        name="itemsPerPage"
                                        value={displaySettings.itemsPerPage}
                                        onChange={handleDisplayChange}
                                    >
                                        <option value="5">5</option>
                                        <option value="10">10</option>
                                        <option value="20">20</option>
                                        <option value="50">50</option>
                                    </select>
                                    <small>Number of items to display per page in tables</small>
                                </div>

                                <div className="info-box">
                                    <p><strong>Note:</strong> Display settings are saved automatically and applied immediately.</p>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Settings;

