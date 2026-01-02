import React, { useState, useEffect } from "react";
import { getNotifications, getUnreadNotificationCount, markNotificationAsRead, markAllNotificationsAsRead } from "../services/api";
import "../css/NotificationPanel.css";

const NotificationPanel = ({ user }) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);

    const fetchNotifications = async () => {
        if (!user?.user_id) return;

        try {
            setLoading(true);
            const userData = {
                user_id: user.user_id,
                role_type: user.role_type,
                wing_id: user.wing_id,
                owner_id: user.owner_id
            };

            const [notifRes, countRes] = await Promise.all([
                getNotifications(userData),
                getUnreadNotificationCount(userData)
            ]);

            const notifs = Array.isArray(notifRes.data) ? notifRes.data : [];
            setNotifications(notifs);
            setUnreadCount(countRes.data?.unread_count || 0);
        } catch (error) {
            console.error("Error fetching notifications:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
        
        // Refresh notifications every 30 seconds
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [user]);

    const handleNotificationClick = async (notification) => {
        if (!notification.is_read_by_user) {
            try {
                await markNotificationAsRead({
                    notification_id: notification.notification_id,
                    user_id: user.user_id
                });
                
                // Update local state
                setNotifications(prev => prev.map(n => 
                    n.notification_id === notification.notification_id 
                        ? { ...n, is_read_by_user: 1 }
                        : n
                ));
                
                setUnreadCount(prev => Math.max(0, prev - 1));
            } catch (error) {
                console.error("Error marking notification as read:", error);
            }
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            const userData = {
                user_id: user.user_id,
                role_type: user.role_type,
                wing_id: user.wing_id
            };

            await markAllNotificationsAsRead(userData);
            
            // Update local state
            setNotifications(prev => prev.map(n => ({ ...n, is_read_by_user: 1 })));
            setUnreadCount(0);
        } catch (error) {
            console.error("Error marking all as read:", error);
        }
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'maintenance_reminder':
                return '💰';
            case 'activity_scheduled':
                return '🎉';
            case 'meeting_scheduled':
                return '📅';
            case 'cutoff':
                return '⚠️';
            case 'announcement':
                return '📢';
            default:
                return '🔔';
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const notificationDate = new Date(date);
        notificationDate.setHours(0, 0, 0, 0);

        if (notificationDate.getTime() === today.getTime()) {
            return 'Today';
        } else if (notificationDate.getTime() === today.getTime() + 86400000) {
            return 'Tomorrow';
        } else {
            return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        }
    };

    return (
        <div className="notification-panel-container">
            <div className="notification-bell" onClick={() => setIsOpen(!isOpen)}>
                <span className="bell-icon">🔔</span>
                {unreadCount > 0 && (
                    <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
            </div>

            {isOpen && (
                <>
                    <div className="notification-overlay" onClick={() => setIsOpen(false)}></div>
                    <div className="notification-dropdown">
                        <div className="notification-header">
                            <h3>Notifications</h3>
                            {unreadCount > 0 && (
                                <button 
                                    className="mark-all-read-btn"
                                    onClick={handleMarkAllAsRead}
                                >
                                    Mark all as read
                                </button>
                            )}
                        </div>

                        <div className="notification-list">
                            {loading ? (
                                <div className="notification-loading">Loading notifications...</div>
                            ) : notifications.length === 0 ? (
                                <div className="notification-empty">
                                    <p>No notifications</p>
                                </div>
                            ) : (
                                notifications.map((notification) => (
                                    <div
                                        key={notification.notification_id}
                                        className={`notification-item ${notification.is_read_by_user ? 'read' : 'unread'}`}
                                        onClick={() => handleNotificationClick(notification)}
                                    >
                                        <div className="notification-icon">
                                            {getNotificationIcon(notification.notification_type)}
                                        </div>
                                        <div className="notification-content">
                                            <div className="notification-title">
                                                {notification.title}
                                            </div>
                                            <div className="notification-message">
                                                {notification.message}
                                            </div>
                                            {/* Display images if available */}
                                            {notification.attachment_url && Array.isArray(notification.attachment_url) && notification.attachment_url.length > 0 && (
                                                <div className="notification-images">
                                                    {notification.attachment_url
                                                        .filter(url => url && url.startsWith('http') && !url.includes('pdf') && !url.includes('.pdf'))
                                                        .slice(0, 3) // Show max 3 images
                                                        .map((url, idx) => (
                                                            <img 
                                                                key={idx}
                                                                src={url} 
                                                                alt={`Notification ${idx + 1}`}
                                                                className="notification-image"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedImage(url);
                                                                }}
                                                                onError={(e) => {
                                                                    e.target.style.display = 'none';
                                                                }}
                                                            />
                                                        ))
                                                    }
                                                    {notification.attachment_url.filter(url => url && url.startsWith('http') && !url.includes('pdf') && !url.includes('.pdf')).length > 3 && (
                                                        <div className="notification-image-more">
                                                            +{notification.attachment_url.filter(url => url && url.startsWith('http') && !url.includes('pdf') && !url.includes('.pdf')).length - 3}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            <div className="notification-date">
                                                {formatDate(notification.notification_date)}
                                            </div>
                                        </div>
                                        {!notification.is_read_by_user && (
                                            <div className="unread-indicator"></div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* Image Modal */}
            {selectedImage && (
                <>
                    <div className="image-modal-overlay" onClick={() => setSelectedImage(null)}></div>
                    <div className="image-modal">
                        <button className="image-modal-close" onClick={() => setSelectedImage(null)}>×</button>
                        <img src={selectedImage} alt="Notification" className="image-modal-content" />
                    </div>
                </>
            )}
        </div>
    );
};

export default NotificationPanel;

