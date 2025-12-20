# Subscription Lock System Integration Guide

This guide explains how to integrate the subscription lock system into your application.

## Setup Steps

### 1. Database Migration

Run the migration to create the subscription table:

```bash
mysql -u root -p your_database_name < migrations/create_subscription_table.sql
```

### 2. Backend Setup

The subscription routes are already added to `server.js`. Make sure the server is restarted.

### 3. Frontend Integration

#### Option A: Check on App Load (Recommended)

Add subscription check in your main App component:

```jsx
import React, { useState, useEffect } from 'react';
import SubscriptionLock from './components/SubscriptionLock';
import { initializeSubscriptionCheck } from './utils/subscriptionCheck';

function App() {
    const [isLocked, setIsLocked] = useState(false);
    const [subscriptionData, setSubscriptionData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkSubscription = async () => {
            const result = await initializeSubscriptionCheck((data) => {
                setIsLocked(true);
                setSubscriptionData(data);
            });
            
            if (result.locked) {
                setIsLocked(true);
                setSubscriptionData(result.data);
            }
            
            setLoading(false);
        };

        checkSubscription();
    }, []);

    const handleRefresh = async () => {
        const result = await initializeSubscriptionCheck((data) => {
            setIsLocked(true);
            setSubscriptionData(data);
        });
        
        if (!result.locked) {
            setIsLocked(false);
        }
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    if (isLocked) {
        return <SubscriptionLock subscriptionData={subscriptionData} onRefresh={handleRefresh} />;
    }

    // Your normal app content
    return (
        <div>
            {/* Your app components */}
        </div>
    );
}

export default App;
```

#### Option B: Check on Specific Routes

Add subscription check to protected routes:

```jsx
import { useEffect, useState } from 'react';
import { checkCurrentUserSubscription, shouldLockApp } from '../utils/subscriptionCheck';
import SubscriptionLock from '../components/SubscriptionLock';

function ProtectedComponent() {
    const [isLocked, setIsLocked] = useState(false);
    const [subscriptionData, setSubscriptionData] = useState(null);

    useEffect(() => {
        const checkSubscription = async () => {
            const data = await checkCurrentUserSubscription();
            if (shouldLockApp(data)) {
                setIsLocked(true);
                setSubscriptionData(data);
            }
        };

        checkSubscription();
    }, []);

    if (isLocked) {
        return <SubscriptionLock subscriptionData={subscriptionData} />;
    }

    return <div>Your protected content</div>;
}
```

### 4. Backend Middleware Usage

To protect API routes with subscription check:

```javascript
const { checkSubscription } = require('./middleware/subscriptionCheck');

// Protect all routes
app.use('/api/protected', checkSubscription, protectedRoutes);

// Or protect specific routes
router.get('/data', checkSubscription, controller.getData);
```

## Creating Subscriptions

### Via API

```javascript
POST /api/subscription
{
    "soc_id": 1,
    "subscription_start_date": "2024-01-01",
    "subscription_end_date": "2024-12-31",
    "plan_type": "premium",
    "subscription_status": "active"
}
```

### Via SQL

```sql
INSERT INTO subscription (soc_id, subscription_start_date, subscription_end_date, plan_type, subscription_status)
VALUES (1, '2024-01-01', '2024-12-31', 'premium', 'active');
```

## File-Based Lock Mechanism

The system automatically creates lock files in `backend/locks/` directory when subscriptions expire. These files:
- Are created automatically when subscription expires
- Are removed when subscription is renewed
- Can be manually deleted to unlock (for testing)

**Lock file format:**
```json
{
  "soc_id": 1,
  "locked": true,
  "reason": "Subscription expired",
  "locked_at": "2024-01-15T10:30:00.000Z",
  "subscription_end_date": "2024-01-14"
}
```

## Testing

1. Create a subscription with past end date
2. Try to access the application
3. You should see the lock screen
4. Update subscription with future end date
5. Refresh - lock should be removed

## Customization

### Change Lock Screen Design
Edit `src/components/SubscriptionLock.jsx` and `src/css/SubscriptionLock.css`

### Change Lock Behavior
Edit `src/utils/subscriptionCheck.js` to modify when/how locking occurs

### Add Grace Period
Modify `middleware/subscriptionCheck.js` to allow access for X days after expiry

## Security Notes

- Lock files are stored server-side and cannot be bypassed by frontend
- Database checks are performed on every protected route
- Consider adding rate limiting to subscription check endpoints
- For production, add authentication to subscription management endpoints

