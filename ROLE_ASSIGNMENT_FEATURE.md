# Role Assignment & Delegation Feature

## Overview

The Role Assignment module allows **Admin** and **Secretary** users to temporarily delegate limited access to other users in their absence. This feature enables controlled, time-bound access to specific modules without granting full administrative privileges.

## Features

- ✅ Create temporary role delegations with start and end dates
- ✅ Select specific modules/permissions to grant (limited access)
- ✅ View all delegations with status (Active/Inactive/Revoked)
- ✅ Edit existing delegations
- ✅ Revoke delegations before their end date
- ✅ Search and filter delegations
- ✅ Permission checking utility for module access control

## Frontend Implementation

### Files Created/Modified

1. **`src/pages/RoleAssignment.jsx`** - Main component for managing role delegations
2. **`src/utils/permissionChecker.js`** - Utility functions for checking permissions
3. **`src/css/RoleAssignment.css`** - Styling for the role assignment page
4. **`src/services/api.js`** - Added API functions for role delegation
5. **`src/components/Sidebar.jsx`** - Added "Role Assignment" menu item
6. **`src/components/Dashboard.jsx`** - Added route handling for Role Assignment

### Available Modules for Delegation

The following modules can be assigned to users:

- Society
- Flat Owner
- Rental Detail
- Category
- Meetings
- Activity Details
- Activity Payment
- Activity Expenses
- Expenses
- Maintenance Component
- Maintenance Rate
- Maintenance Detail

## Backend API Requirements

The following endpoints need to be implemented in your backend:

### 1. Get All Users
```
GET /api/users
Response: { data: [{ user_id, user_name, role_type, wing_id, ... }] }
```

### 2. Create Role Delegation
```
POST /api/role-delegations
Body: {
  delegated_to_user_id: number,
  delegated_to_user_name: string,
  delegated_by_user_id: number,
  delegated_by_user_name: string,
  start_date: string (ISO date),
  end_date: string (ISO date),
  permissions: string[] (array of module IDs),
  reason: string,
  is_active: boolean
}
Response: { data: { delegation_id, ... } }
```

### 3. Get All Role Delegations
```
GET /api/role-delegations
Response: { data: [{ delegation_id, delegated_to_user_id, delegated_to_user_name, delegated_by_user_id, delegated_by_user_name, start_date, end_date, permissions, reason, is_active, created_at, updated_at }] }
```

### 4. Get My Delegations (for delegated user)
```
GET /api/role-delegations/my-delegations
Response: { data: [{ ...delegation objects... }] }
```

### 5. Update Role Delegation
```
PUT /api/role-delegations/:id
Body: { ...same as create... }
Response: { data: { ...updated delegation... } }
```

### 6. Revoke Role Delegation
```
PUT /api/role-delegations/:id/revoke
Response: { data: { ...delegation with is_active: false... } }
```

## Database Schema Suggestion

```sql
CREATE TABLE role_delegations (
  delegation_id INT PRIMARY KEY AUTO_INCREMENT,
  delegated_to_user_id INT NOT NULL,
  delegated_to_user_name VARCHAR(255) NOT NULL,
  delegated_by_user_id INT NOT NULL,
  delegated_by_user_name VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  permissions JSON NOT NULL, -- Array of module IDs
  reason TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (delegated_to_user_id) REFERENCES users(user_id),
  FOREIGN KEY (delegated_by_user_id) REFERENCES users(user_id)
);
```

## Usage Guide

### For Admin/Secretary Users

1. **Navigate to Role Assignment**
   - Click on "Role Assignment" in the sidebar (👥 icon)

2. **Create a Delegation**
   - Click "Create Delegation" button
   - Select the user to delegate to
   - Set start and end dates
   - Enter reason for delegation (optional)
   - Select the modules/permissions to grant
   - Click "Create Delegation"

3. **Edit a Delegation**
   - Click the edit icon (✏️) on any delegation row
   - Modify the details
   - Click "Update Delegation"

4. **Revoke a Delegation**
   - Click the revoke icon (🚫) on an active delegation
   - Confirm the action
   - The delegation will be marked as revoked

### For Delegated Users

Users who have been delegated permissions will automatically have access to the assigned modules during the active period. The system checks for active delegations when accessing modules.

## Permission Checking

The `permissionChecker.js` utility provides functions to check module access:

```javascript
import { hasModuleAccess, getActiveDelegationsForUser } from '../utils/permissionChecker';

// Check if user has access to a module
const hasAccess = hasModuleAccess('expenses', activeDelegations);

// Get active delegations for current user
const activeDelegations = getActiveDelegationsForUser(allDelegations);
```

## Integration with Existing Modules

To integrate permission checking in your existing modules, you can:

1. Fetch active delegations when the component loads
2. Use `hasModuleAccess()` to conditionally show/hide features
3. Check permissions before allowing actions

Example:
```javascript
import { getMyDelegations } from '../services/api';
import { hasModuleAccess } from '../utils/permissionChecker';

const [activeDelegations, setActiveDelegations] = useState([]);

useEffect(() => {
  const fetchDelegations = async () => {
    const res = await getMyDelegations();
    setActiveDelegations(res.data);
  };
  fetchDelegations();
}, []);

// Check access
const canAccessExpenses = hasModuleAccess('expenses', activeDelegations);
```

## Security Considerations

1. **Access Control**: Only Admin and Secretary can manage delegations
2. **Time-bound**: Delegations automatically expire after the end date
3. **Limited Scope**: Users can only access modules explicitly granted
4. **Audit Trail**: All delegations track who created them and when
5. **Revocation**: Delegations can be revoked at any time

## Status Indicators

- **Active**: Delegation is currently active (within date range and not revoked)
- **Inactive**: Delegation exists but is outside the date range
- **Revoked**: Delegation has been manually revoked

## Notes

- Admin and Secretary users have full access to all modules regardless of delegations
- Delegations are additive - a user can have multiple active delegations
- The system checks all active delegations when determining access
- Module IDs must match exactly between the delegation and the permission checker

## Future Enhancements

Potential improvements:
- Email notifications when delegations are created/revoked
- Automatic expiration reminders
- Delegation history/audit log
- Bulk delegation operations
- Template-based delegations
- Role-based delegation presets

