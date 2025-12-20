/**
 * Utility functions for filtering data by owner for owner role users
 */

/**
 * Get current user from localStorage
 */
export const getCurrentUser = () => {
    try {
        const userStr = localStorage.getItem("user");
        return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
        console.error("Error parsing user from localStorage:", error);
        return null;
    }
};

/**
 * Check if current user is an owner
 * @returns {boolean}
 */
export const isOwnerRole = () => {
    const user = getCurrentUser();
    if (!user) return false;
    const roleType = user?.role_type?.toLowerCase();
    return roleType === "owner";
};

/**
 * Get owner_id from current user
 * @returns {number|null}
 */
export const getCurrentOwnerId = () => {
    const user = getCurrentUser();
    if (!user) return null;
    if (!isOwnerRole()) return null;
    return user.owner_id || null;
};

/**
 * Filter owners array to show only current owner's record
 * @param {Array} owners - Array of owner objects
 * @returns {Array} - Filtered array with only current owner's record
 */
export const filterOwnersByCurrentOwner = (owners) => {
    if (!isOwnerRole()) return owners;
    const ownerId = getCurrentOwnerId();
    if (!ownerId) return [];
    return owners.filter(owner => owner.owner_id === parseInt(ownerId));
};

/**
 * Filter maintenance details by current owner
 * @param {Array} maintenanceDetails - Array of maintenance detail objects
 * @returns {Array} - Filtered array with only current owner's records
 */
export const filterMaintenanceByCurrentOwner = (maintenanceDetails) => {
    if (!isOwnerRole()) return maintenanceDetails;
    const ownerId = getCurrentOwnerId();
    if (!ownerId) return [];
    return maintenanceDetails.filter(m => m.owner_id === parseInt(ownerId));
};

/**
 * Filter rentals by current owner
 * @param {Array} rentals - Array of rental objects
 * @returns {Array} - Filtered array with only current owner's records
 */
export const filterRentalsByCurrentOwner = (rentals) => {
    if (!isOwnerRole()) return rentals;
    const ownerId = getCurrentOwnerId();
    if (!ownerId) return [];
    return rentals.filter(r => r.owner_id === parseInt(ownerId));
};

/**
 * Filter activity payments by current owner (via flat_id -> owner_id)
 * @param {Array} activityPayments - Array of activity payment objects
 * @param {Array} owners - Array of owner objects to map flat_id to owner_id
 * @returns {Array} - Filtered array with only current owner's records
 */
export const filterActivityPaymentsByCurrentOwner = (activityPayments, owners) => {
    if (!isOwnerRole()) return activityPayments;
    const ownerId = getCurrentOwnerId();
    if (!ownerId) return [];
    
    // Create map of flat_id to owner_id
    const flatOwnerMap = {};
    owners.forEach(owner => {
        if (owner.flat_id) {
            flatOwnerMap[owner.flat_id] = owner.owner_id;
        }
    });
    
    return activityPayments.filter(ap => {
        if (!ap.flat_id) return false;
        const apOwnerId = flatOwnerMap[ap.flat_id];
        return apOwnerId && parseInt(apOwnerId) === parseInt(ownerId);
    });
};

/**
 * Check if current user can edit/delete (owners cannot edit/delete)
 * @returns {boolean}
 */
export const canEdit = () => {
    return !isOwnerRole();
};

/**
 * Check if current user can delete (owners cannot delete)
 * @returns {boolean}
 */
export const canDelete = () => {
    return !isOwnerRole();
};

