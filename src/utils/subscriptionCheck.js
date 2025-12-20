import axios from 'axios';

const API = axios.create({
    baseURL: "http://localhost:5000/api",
});

/**
 * Check subscription status for a society
 * @param {number} socId - Society ID
 * @returns {Promise<Object>} Subscription status object
 */
export const checkSubscriptionStatus = async (socId) => {
    try {
        const response = await API.get(`/subscription/status/${socId}`);
        return response.data;
    } catch (error) {
        console.error('Error checking subscription:', error);
        return {
            hasSubscription: false,
            isExpired: true,
            error: error.message
        };
    }
};

/**
 * Check subscription status by wing ID
 * @param {number} wingId - Wing ID
 * @returns {Promise<Object>} Subscription status object
 */
export const checkSubscriptionByWing = async (wingId) => {
    try {
        const response = await API.get(`/subscription/status-by-wing/${wingId}`);
        console.log('API Response for wing', wingId, ':', response.data);
        return response.data;
    } catch (error) {
        console.error('Error checking subscription by wing:', error);
        console.error('Error details:', error.response?.data || error.message);
        // If it's a network error or 500, don't lock (fail open)
        // Only lock if it's a 403 (explicitly expired) or 404 (no subscription)
        if (error.response?.status === 403 || error.response?.status === 404) {
            return {
                hasSubscription: false,
                isExpired: true,
                error: error.message
            };
        }
        // For other errors (network, 500, etc.), fail open - don't lock
        return {
            hasSubscription: true,
            isExpired: false,
            error: error.message,
            allowAccess: true // Flag to allow access on error
        };
    }
};

/**
 * Get current user's wing ID and check subscription
 * @returns {Promise<Object>} Subscription status object
 */
export const checkCurrentUserSubscription = async () => {
    try {
        // Get current user from localStorage
        const userStr = localStorage.getItem('user');
        if (!userStr) {
            return {
                hasSubscription: false,
                isExpired: true,
                message: 'User not logged in'
            };
        }

        const user = JSON.parse(userStr);
        const wingId = user.wing_id;

        if (!wingId) {
            return {
                hasSubscription: false,
                isExpired: true,
                message: 'Wing ID not found'
            };
        }

        return await checkSubscriptionByWing(wingId);
    } catch (error) {
        console.error('Error checking current user subscription:', error);
        return {
            hasSubscription: false,
            isExpired: true,
            error: error.message
        };
    }
};

/**
 * Check if subscription is expired and should lock the app
 * @param {Object} subscriptionData - Subscription data from API
 * @returns {boolean} True if app should be locked
 */
export const shouldLockApp = (subscriptionData) => {
    console.log('shouldLockApp called with:', subscriptionData);
    
    if (!subscriptionData) {
        console.log('No subscription data - LOCKING');
        return true;
    }
    
    // If error occurred but allowAccess flag is set, don't lock
    if (subscriptionData.allowAccess) {
        console.log('allowAccess flag set - NOT LOCKING');
        return false;
    }
    
    if (!subscriptionData.hasSubscription) {
        console.log('No subscription found - LOCKING');
        return true;
    }
    
    if (subscriptionData.isExpired) {
        console.log('Subscription expired - LOCKING');
        return true;
    }
    
    console.log('Subscription active - NOT LOCKING');
    return false;
};

/**
 * Check subscription on app initialization
 * This should be called in App.js or main component
 */
export const initializeSubscriptionCheck = async (onLocked) => {
    try {
        const subscriptionData = await checkCurrentUserSubscription();

        if (shouldLockApp(subscriptionData)) {
            if (onLocked) {
                onLocked(subscriptionData);
            }
            return { locked: true, data: subscriptionData };
        }

        return { locked: false, data: subscriptionData };
    } catch (error) {
        console.error('Error initializing subscription check:', error);
        // On error, don't lock (fail open) - you might want to change this
        return { locked: false, data: null, error: error.message };
    }
};

