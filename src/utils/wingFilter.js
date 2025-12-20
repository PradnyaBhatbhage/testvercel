/**
 * Wing Filter Utility
 * Provides functions to filter data based on the logged-in user's wing
 */

/**
 * Get the current logged-in user's wing_id from localStorage
 * @returns {number|null} The wing_id of the current user, or null if not found
 */
export const getCurrentUserWingId = () => {
    try {
        const userStr = localStorage.getItem("user");
        if (!userStr) return null;
        
        const user = JSON.parse(userStr);
        // Check if wing_id exists in user object
        const wingId = user?.wing_id || user?.wingId || null;
        
        // Convert to number if it's a string
        return wingId ? Number(wingId) : null;
    } catch (error) {
        console.error("Error getting user wing_id:", error);
        return null;
    }
};

/**
 * Get the current logged-in user object from localStorage
 * @returns {object|null} The user object, or null if not found
 */
export const getCurrentUser = () => {
    try {
        const userStr = localStorage.getItem("user");
        if (!userStr) return null;
        return JSON.parse(userStr);
    } catch (error) {
        console.error("Error getting current user:", error);
        return null;
    }
};

/**
 * Filter an array of data by wing_id
 * @param {Array} data - The array of data to filter
 * @param {number|null} wingId - The wing_id to filter by (if null, returns all data)
 * @param {string} wingIdField - The field name in the data object that contains wing_id (default: 'wing_id')
 * @returns {Array} Filtered array of data
 */
export const filterByWing = (data, wingId, wingIdField = 'wing_id') => {
    if (!data || !Array.isArray(data)) return [];
    if (wingId === null || wingId === undefined) return data;
    
    return data.filter(item => {
        if (!item) return false;
        const itemWingId = item[wingIdField];
        // Handle both number and string comparisons
        return Number(itemWingId) === Number(wingId);
    });
};

/**
 * Filter owners by wing_id (owners have wing_id directly)
 * @param {Array} owners - Array of owner objects
 * @param {number|null} wingId - The wing_id to filter by
 * @returns {Array} Filtered owners
 */
export const filterOwnersByWing = (owners, wingId) => {
    return filterByWing(owners, wingId, 'wing_id');
};

/**
 * Filter maintenance details by owner's wing
 * This requires checking the owner's wing_id through the owners array
 * @param {Array} details - Array of maintenance detail objects
 * @param {Array} owners - Array of owner objects (to get wing_id)
 * @param {number|null} wingId - The wing_id to filter by
 * @returns {Array} Filtered maintenance details
 */
export const filterMaintenanceDetailsByWing = (details, owners, wingId) => {
    if (!details || !Array.isArray(details)) return [];
    if (wingId === null || wingId === undefined) return details;
    if (!owners || !Array.isArray(owners)) return [];
    
    // Create a map of owner_id to wing_id for quick lookup
    const ownerWingMap = {};
    owners.forEach(owner => {
        if (owner && owner.owner_id) {
            ownerWingMap[owner.owner_id] = Number(owner.wing_id);
        }
    });
    
    return details.filter(detail => {
        if (!detail || !detail.owner_id) return false;
        const ownerWingId = ownerWingMap[detail.owner_id];
        return ownerWingId && Number(ownerWingId) === Number(wingId);
    });
};

/**
 * Filter maintenance rates by wing_id
 * @param {Array} rates - Array of rate objects
 * @param {number|null} wingId - The wing_id to filter by
 * @returns {Array} Filtered rates
 */
export const filterRatesByWing = (rates, wingId) => {
    return filterByWing(rates, wingId, 'wing_id');
};

/**
 * React hook to get current user's wing_id
 * @returns {number|null} The wing_id of the current user
 */
export const useCurrentUserWing = () => {
    return getCurrentUserWingId();
};

