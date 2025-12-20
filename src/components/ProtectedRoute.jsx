import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { checkCurrentUserSubscription, shouldLockApp } from '../utils/subscriptionCheck';
import SubscriptionLock from './SubscriptionLock';

/**
 * ProtectedRoute component that checks subscription before allowing access
 * Use this to wrap routes that require active subscription
 */
const ProtectedRoute = ({ children }) => {
    const [isLocked, setIsLocked] = useState(false);
    const [subscriptionData, setSubscriptionData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const checkAuthAndSubscription = async () => {
            // Check if user is logged in
            const userStr = localStorage.getItem('user');
            if (!userStr) {
                setIsAuthenticated(false);
                setLoading(false);
                return;
            }

            setIsAuthenticated(true);

            // Check subscription
            try {
                const subscription = await checkCurrentUserSubscription();
                
                if (shouldLockApp(subscription)) {
                    setIsLocked(true);
                    setSubscriptionData(subscription);
                } else {
                    setIsLocked(false);
                    setSubscriptionData(subscription);
                }
            } catch (error) {
                console.error('Error checking subscription:', error);
                // On error, don't lock (fail open)
                setIsLocked(false);
            } finally {
                setLoading(false);
            }
        };

        checkAuthAndSubscription();
    }, []);

    const handleRefresh = async () => {
        try {
            const subscription = await checkCurrentUserSubscription();
            
            if (shouldLockApp(subscription)) {
                setIsLocked(true);
                setSubscriptionData(subscription);
            } else {
                setIsLocked(false);
                setSubscriptionData(subscription);
            }
        } catch (error) {
            console.error('Error refreshing subscription:', error);
        }
    };

    // Show loading state
    if (loading) {
        return (
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100vh',
                fontSize: '18px',
                color: '#666'
            }}>
                Loading...
            </div>
        );
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Show lock screen if subscription is expired
    if (isLocked) {
        return <SubscriptionLock subscriptionData={subscriptionData} onRefresh={handleRefresh} />;
    }

    // Allow access if subscription is active
    return children;
};

export default ProtectedRoute;

