import React, { useState, useEffect } from 'react';
import '../css/SubscriptionLock.css';

const SubscriptionLock = ({ subscriptionData, onRefresh }) => {
    const [daysRemaining, setDaysRemaining] = useState(null);

    useEffect(() => {
        if (subscriptionData?.subscription?.days_remaining !== undefined) {
            setDaysRemaining(subscriptionData.subscription.days_remaining);
        } else if (subscriptionData?.subscription?.subscription_end_date) {
            const endDate = new Date(subscriptionData.subscription.subscription_end_date);
            const today = new Date();
            const diffTime = endDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            setDaysRemaining(diffDays);
        }
    }, [subscriptionData]);

    const handleContactAdmin = () => {
        // You can customize this to open email, phone, or contact form
        window.location.href = 'mailto:admin@societysync.com?subject=Subscription Renewal Request';
    };

    return (
        <div className="subscription-lock-container">
            <div className="subscription-lock-content">
                <div className="lock-icon">🔒</div>
                <h1>Subscription Expired</h1>
                <p className="lock-message">
                    {subscriptionData?.message || 
                     'Your subscription has expired. Please renew your subscription to continue using SocietySync.'}
                </p>
                
                {subscriptionData?.subscription && (
                    <div className="subscription-details">
                        <div className="detail-item">
                            <span className="label">Society:</span>
                            <span className="value">{subscriptionData.subscription.soc_name || 'N/A'}</span>
                        </div>
                        <div className="detail-item">
                            <span className="label">Expired Date:</span>
                            <span className="value">
                                {new Date(subscriptionData.subscription.subscription_end_date).toLocaleDateString()}
                            </span>
                        </div>
                        {daysRemaining !== null && daysRemaining < 0 && (
                            <div className="detail-item">
                                <span className="label">Days Overdue:</span>
                                <span className="value expired">{Math.abs(daysRemaining)} days</span>
                            </div>
                        )}
                        <div className="detail-item">
                            <span className="label">Plan Type:</span>
                            <span className="value">{subscriptionData.subscription.plan_type || 'N/A'}</span>
                        </div>
                    </div>
                )}

                <div className="lock-actions">
                    <button onClick={onRefresh} className="refresh-btn">
                        Check Again
                    </button>
                    <button onClick={handleContactAdmin} className="contact-btn">
                        Contact Administrator
                    </button>
                </div>

                <div className="lock-footer">
                    <p>For subscription renewal, please contact your system administrator.</p>
                </div>
            </div>
        </div>
    );
};

export default SubscriptionLock;

