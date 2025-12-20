# Backend API Requirements for Receipt and Reminder Features

This document outlines the backend API endpoints that need to be implemented to support the receipt generation and monthly reminder features.

## Receipt Generation Endpoints

### 1. Send Receipt via Email
**Endpoint:** `POST /api/maintenance-details/:maintainId/send-receipt/email`

**Description:** Generates a receipt for the specified maintenance record and sends it via email to the owner.

**Request:**
- URL Parameter: `maintainId` (integer) - The maintenance detail ID

**Response:**
```json
{
  "success": true,
  "message": "Receipt sent successfully via email",
  "receiptNumber": "REC-000123"
}
```

**Backend Implementation Notes:**
- Fetch the maintenance detail record by `maintainId`
- Fetch the owner details using `owner_id` from the maintenance record
- Generate receipt HTML/PDF using the receipt template (see `src/utils/receiptGenerator.js` for format)
- Send email to `owner_email` using an email service (e.g., Nodemailer, SendGrid, etc.)
- Include receipt as attachment (PDF) or in email body (HTML)

**Email Service Setup:**
You'll need to configure an email service. Example with Nodemailer:
```javascript
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});
```

### 2. Send Receipt via WhatsApp
**Endpoint:** `POST /api/maintenance-details/:maintainId/send-receipt/whatsapp`

**Description:** Generates a receipt for the specified maintenance record and sends it via WhatsApp to the owner's phone number.

**Request:**
- URL Parameter: `maintainId` (integer) - The maintenance detail ID

**Response:**
```json
{
  "success": true,
  "message": "Receipt sent successfully via WhatsApp",
  "receiptNumber": "REC-000123"
}
```

**Backend Implementation Notes:**
- Fetch the maintenance detail record by `maintainId`
- Fetch the owner details using `owner_id` from the maintenance record
- Format receipt message using WhatsApp-friendly format (see `src/utils/receiptGenerator.js` - `formatReceiptForWhatsApp`)
- Send WhatsApp message to `owner_contactno` using a WhatsApp API service (e.g., Twilio WhatsApp API, WhatsApp Business API, etc.)

**WhatsApp Service Setup:**
You'll need to integrate with a WhatsApp API service. Example with Twilio:
```javascript
const twilio = require('twilio');
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Send WhatsApp message
await client.messages.create({
  from: 'whatsapp:+14155238886', // Your Twilio WhatsApp number
  to: `whatsapp:+91${owner_contactno}`, // Owner's phone number
  body: receiptMessage
});
```

## Monthly Reminder Endpoint

### 3. Send Monthly Reminders
**Endpoint:** `POST /api/maintenance-details/send-monthly-reminders`

**Description:** Sends payment reminders to all owners who have pending maintenance payments for the current month.

**Request:**
- No request body required

**Response:**
```json
{
  "success": true,
  "message": "Monthly reminders sent successfully",
  "remindersSent": 25,
  "failed": 2
}
```

**Backend Implementation Notes:**
- Query all owners with pending maintenance payments for the current month
- For each owner:
  - Get their contact information (`owner_contactno`, `owner_email`)
  - Generate a reminder message with:
    - Owner name and flat number
    - Pending maintenance amount
    - Due date
    - Payment instructions
  - Send reminder via SMS/WhatsApp to `owner_contactno`
  - Optionally send email reminder to `owner_email`
- Track which reminders were sent successfully and which failed
- Return summary of sent reminders

**Reminder Message Format:**
```
Dear [Owner Name],

This is a reminder that your maintenance payment for [Month Year] is pending.

Flat No: [Flat Number]
Amount Due: ₹[Amount]
Due Date: [Date]

Please make the payment at your earliest convenience.

Thank you,
Society Management
```

## Database Queries Needed

### For Receipt Generation:
```sql
-- Get maintenance detail with owner info
SELECT 
    md.*,
    o.owner_name,
    o.owner_email,
    o.owner_contactno,
    o.flat_no,
    ft.flat_type_name,
    w.wing_name
FROM maintenance_details md
JOIN owners o ON md.owner_id = o.owner_id
JOIN flats f ON o.flat_id = f.flat_id
JOIN flat_types ft ON f.flat_type_id = ft.flat_type_id
JOIN wings w ON f.wing_id = w.wing_id
WHERE md.maintain_id = ?
AND md.is_deleted = 0;
```

### For Monthly Reminders:
```sql
-- Get owners with pending maintenance for current month
SELECT DISTINCT
    o.owner_id,
    o.owner_name,
    o.owner_contactno,
    o.owner_email,
    o.flat_no,
    SUM(md.total_amount - md.paid_amount) as pending_amount
FROM owners o
JOIN maintenance_details md ON o.owner_id = md.owner_id
WHERE md.status != 'Paid'
AND md.is_deleted = 0
AND YEAR(md.bill_start_date) = YEAR(CURRENT_DATE)
AND MONTH(md.bill_start_date) = MONTH(CURRENT_DATE)
GROUP BY o.owner_id, o.owner_name, o.owner_contactno, o.owner_email, o.flat_no
HAVING pending_amount > 0;
```

## Environment Variables Required

Add these to your backend `.env` file:

```env
# Email Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@society.com

# WhatsApp/SMS Configuration (using Twilio as example)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_WHATSAPP_NUMBER=+14155238886

# Or for other WhatsApp services
WHATSAPP_API_KEY=your-whatsapp-api-key
WHATSAPP_API_URL=https://api.whatsapp.com/v1/messages
```

## Testing

1. **Test Receipt Email:**
   - Create a maintenance record with status "Paid"
   - Call the email receipt endpoint
   - Verify email is received with receipt attachment

2. **Test Receipt WhatsApp:**
   - Create a maintenance record with status "Paid"
   - Call the WhatsApp receipt endpoint
   - Verify WhatsApp message is received

3. **Test Monthly Reminders:**
   - Set system date to 1st of the month (or manually trigger)
   - Call the monthly reminders endpoint
   - Verify reminders are sent to all owners with pending payments

## Error Handling

All endpoints should handle:
- Invalid maintenance ID (404)
- Missing owner contact information (400)
- Email/WhatsApp service failures (500)
- Network timeouts (504)

Return appropriate error responses:
```json
{
  "success": false,
  "error": "Owner email not found",
  "code": "MISSING_EMAIL"
}
```

