/**
 * Permission checking utility for role delegations
 * This utility checks if a user has access to specific modules based on:
 * 1. Their original role (Admin/Secretary has full access)
 * 2. Active delegations assigned to them
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
 * Check if user has access to a specific module
 * @param {string} moduleId - The module ID to check (e.g., "expenses", "maintenance_detail")
 * @param {Array} activeDelegations - Array of active delegations for the user
 * @returns {boolean} - True if user has access
 */
export const hasModuleAccess = (moduleId, activeDelegations = []) => {
    const user = getCurrentUser();
    
    // Admin and Secretary have full access (support both cases)
    const roleType = user?.role_type?.toLowerCase();
    if (roleType === "admin" || roleType === "secretary") {
        return true;
    }

    // Owner role can see all modules (read-only access)
    // Edit/Delete permissions are handled in individual components
    if (roleType === "owner") {
        return true;
    }

    // Check if user has an active delegation with this permission
    if (activeDelegations && activeDelegations.length > 0) {
        const now = new Date();
        const hasActiveDelegation = activeDelegations.some((delegation) => {
            if (!delegation.is_active) return false;
            
            const startDate = new Date(delegation.start_date);
            const endDate = new Date(delegation.end_date);
            const isWithinDateRange = now >= startDate && now <= endDate;
            
            return isWithinDateRange && (delegation.permissions || []).includes(moduleId);
        });

        return hasActiveDelegation;
    }

    return false;
};

/**
 * Get all active delegations for the current user
 * This should be called after fetching delegations from API
 * @param {Array} allDelegations - All delegations from API
 * @returns {Array} - Active delegations for current user
 */
export const getActiveDelegationsForUser = (allDelegations = []) => {
    const user = getCurrentUser();
    if (!user) return [];

    const now = new Date();
    return allDelegations.filter((delegation) => {
        if (!delegation.is_active) return false;
        if (delegation.delegated_to_user_id !== user.user_id) return false;

        const startDate = new Date(delegation.start_date);
        const endDate = new Date(delegation.end_date);
        return now >= startDate && now <= endDate;
    });
};

/**
 * Check if current user can manage delegations (Admin or Secretary)
 * @returns {boolean}
 */
export const canManageDelegations = () => {
    const user = getCurrentUser();
    const roleType = user?.role_type?.toLowerCase();
    return roleType === "admin" || roleType === "secretary";
};

/**
 * Get all permissions for current user (from active delegations)
 * @param {Array} activeDelegations - Active delegations for the user
 * @returns {Array} - Array of module IDs the user has access to
 */
export const getUserPermissions = (activeDelegations = []) => {
    const user = getCurrentUser();
    
    // Admin and Secretary have all permissions (support both cases)
    const roleType = user?.role_type?.toLowerCase();
    if (roleType === "admin" || roleType === "secretary") {
        return ["all"]; // Return "all" to indicate full access
    }

    // Collect all unique permissions from active delegations
    const permissions = new Set();
    activeDelegations.forEach((delegation) => {
        if (delegation.permissions && Array.isArray(delegation.permissions)) {
            delegation.permissions.forEach((perm) => permissions.add(perm));
        }
    });

    return Array.from(permissions);
};

/**
 * Module ID mapping for consistency
 * Maps module labels to their IDs
 */
export const MODULE_IDS = {
    SOCIETY: "society",
    FLAT_OWNER: "flat_owner",
    RENTAL_DETAIL: "rental_detail",
    CATEGORY: "category",
    MEETINGS: "meetings",
    ACTIVITY_DETAILS: "activity_details",
    ACTIVITY_PAYMENT: "activity_payment",
    ACTIVITY_EXPENSES: "activity_expenses",
    EXPENSES: "expenses",
    MAINTENANCE_COMPONENT: "maintenance_component",
    MAINTENANCE_RATE: "maintenance_rate",
    MAINTENANCE_DETAIL: "maintenance_detail",
};

/**
 * Map menu label to module ID
 * Used to check permissions when navigating to modules
 */
export const getModuleIdFromMenuLabel = (menuLabel) => {
    const mapping = {
        "Society": MODULE_IDS.SOCIETY,
        "Flat Owner": MODULE_IDS.FLAT_OWNER,
        "Rental Detail": MODULE_IDS.RENTAL_DETAIL,
        "Category": MODULE_IDS.CATEGORY,
        "Meetings": MODULE_IDS.MEETINGS,
        "Activity Details": MODULE_IDS.ACTIVITY_DETAILS,
        "Activity Payment": MODULE_IDS.ACTIVITY_PAYMENT,
        "Activity Expenses": MODULE_IDS.ACTIVITY_EXPENSES,
        "Expenses": MODULE_IDS.EXPENSES,
        "Maintenance Component": MODULE_IDS.MAINTENANCE_COMPONENT,
        "Maintenance Rate": MODULE_IDS.MAINTENANCE_RATE,
        "Maintenance Detail": MODULE_IDS.MAINTENANCE_DETAIL,
    };

    return mapping[menuLabel] || null;
};

