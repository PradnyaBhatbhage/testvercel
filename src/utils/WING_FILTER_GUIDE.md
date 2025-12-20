# Wing Filter Implementation Guide

## Overview
This guide explains how to implement wing-based data filtering across all modules in the application.

## How It Works
When a user logs in, they select a wing. The wing_id is stored in the user object in localStorage. All data fetching and display is automatically filtered to show only data related to that wing.

## Utility Functions

### Location: `src/utils/wingFilter.js`

#### `getCurrentUserWingId()`
Returns the current logged-in user's wing_id from localStorage.
```javascript
const wingId = getCurrentUserWingId(); // Returns number or null
```

#### `filterByWing(data, wingId, wingIdField)`
Generic function to filter any array by wing_id.
```javascript
const filtered = filterByWing(data, wingId, 'wing_id');
```

#### `filterOwnersByWing(owners, wingId)`
Filters owners array by wing_id.
```javascript
const filteredOwners = filterOwnersByWing(owners, wingId);
```

#### `filterRatesByWing(rates, wingId)`
Filters maintenance rates by wing_id.
```javascript
const filteredRates = filterRatesByWing(rates, wingId);
```

#### `filterMaintenanceDetailsByWing(details, owners, wingId)`
Filters maintenance details by checking the owner's wing.
```javascript
const filteredDetails = filterMaintenanceDetailsByWing(details, owners, wingId);
```

## Implementation Steps for Any Module

### Step 1: Import the utility functions
```javascript
import {
    getCurrentUserWingId,
    filterByWing,
    filterOwnersByWing,
    // ... other specific filters as needed
} from "../utils/wingFilter";
```

### Step 2: Get current user's wing_id
```javascript
const currentUserWingId = getCurrentUserWingId();
```

### Step 3: Filter data after fetching
```javascript
const fetchData = async () => {
    const rawData = await getSomeData();
    const dataArray = Array.isArray(rawData) ? rawData : rawData.data || [];
    
    // Filter by wing if wing_id is available
    if (currentUserWingId !== null) {
        const filteredData = filterByWing(dataArray, currentUserWingId, 'wing_id');
        setData(filteredData);
    } else {
        // Fallback: show all data if no wing_id
        setData(dataArray);
    }
};
```

## Modules That Need Wing Filtering

### Already Implemented:
- ✅ MaintenanceDetail

### Need Implementation:
- FlatOwner (filter owners by wing_id)
- RentalDetail (filter by owner's wing)
- ExpenseEntry (filter expenses by wing_id)
- Meeting (filter meetings by wing_id)
- Activity (filter activities by wing_id)
- ActivityPayment (filter by activity's wing)
- ActivityExpense (filter by activity's wing)
- MaintenanceRate (filter rates by wing_id)
- MaintenanceComponent (if applicable)
- MaintenancePayment (filter by maintenance detail's wing)

## Example: FlatOwner Module

```javascript
import { getCurrentUserWingId, filterOwnersByWing } from "../utils/wingFilter";

const FlatOwner = () => {
    const [owners, setOwners] = useState([]);
    const currentUserWingId = getCurrentUserWingId();

    const fetchData = async () => {
        const ownersData = await getOwners();
        const rawOwners = Array.isArray(ownersData) ? ownersData : ownersData.data || [];
        
        if (currentUserWingId !== null) {
            const filteredOwners = filterOwnersByWing(rawOwners, currentUserWingId);
            setOwners(filteredOwners);
        } else {
            setOwners(rawOwners);
        }
    };

    // ... rest of component
};
```

## Important Notes

1. **Always check for null**: If `currentUserWingId` is null, show all data (fallback for admin users or if wing not set).

2. **Use raw data for filtering**: When filtering maintenance details or other data that depends on owners, use the raw owners array, not the filtered one.

3. **Test thoroughly**: After implementing, test with different wing logins to ensure data is properly filtered.

4. **Backend consideration**: Make sure the backend API returns data with wing_id fields. If not, you may need to update the backend first.

## Troubleshooting

- **No data showing**: Check if `currentUserWingId` is being retrieved correctly from localStorage.
- **Wrong data showing**: Verify the wing_id field name matches between the data and the filter function.
- **All data showing**: Check if `currentUserWingId` is null (user might not have wing_id set).

