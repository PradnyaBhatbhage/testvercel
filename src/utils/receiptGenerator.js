/**
 * Utility functions for generating maintenance receipts
 */

/**
 * Generate receipt HTML content
 */
export const generateReceiptHTML = (maintenanceData, ownerData) => {
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric' 
        });
    };

    const formatCurrency = (amount) => {
        return `₹${Number(amount || 0).toFixed(2)}`;
    };

    const receiptNumber = `REC-${String(maintenanceData.maintain_id).padStart(6, '0')}`;
    const receiptDate = new Date().toLocaleDateString('en-IN', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
    });

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .receipt-container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #4CAF50;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #4CAF50;
            margin: 0;
            font-size: 28px;
        }
        .header p {
            color: #666;
            margin: 5px 0;
        }
        .receipt-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
            padding: 15px;
            background-color: #f9f9f9;
            border-radius: 5px;
        }
        .info-section {
            flex: 1;
        }
        .info-section h3 {
            margin: 0 0 10px 0;
            color: #333;
            font-size: 14px;
            text-transform: uppercase;
        }
        .info-section p {
            margin: 5px 0;
            color: #666;
        }
        .details-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        .details-table th,
        .details-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        .details-table th {
            background-color: #4CAF50;
            color: white;
            font-weight: bold;
        }
        .details-table tr:hover {
            background-color: #f5f5f5;
        }
        .total-section {
            margin-top: 20px;
            padding: 20px;
            background-color: #f9f9f9;
            border-radius: 5px;
        }
        .total-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            font-size: 16px;
        }
        .total-row.final {
            font-size: 20px;
            font-weight: bold;
            color: #4CAF50;
            border-top: 2px solid #4CAF50;
            padding-top: 15px;
            margin-top: 10px;
        }
        .footer {
            margin-top: 30px;
            text-align: center;
            color: #666;
            font-size: 12px;
            border-top: 1px solid #ddd;
            padding-top: 20px;
        }
        .status-badge {
            display: inline-block;
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 12px;
        }
        .status-paid {
            background-color: #4CAF50;
            color: white;
        }
    </style>
</head>
<body>
    <div class="receipt-container">
        <div class="header">
            <h1>MAINTENANCE PAYMENT RECEIPT</h1>
            <p>Society Management System</p>
        </div>
        
        <div class="receipt-info">
            <div class="info-section">
                <h3>Receipt Details</h3>
                <p><strong>Receipt No:</strong> ${receiptNumber}</p>
                <p><strong>Receipt Date:</strong> ${receiptDate}</p>
                <p><strong>Status:</strong> <span class="status-badge status-paid">PAID</span></p>
            </div>
            <div class="info-section">
                <h3>Owner Information</h3>
                <p><strong>Name:</strong> ${ownerData.owner_name || 'N/A'}</p>
                <p><strong>Flat No:</strong> ${ownerData.flat_no || 'N/A'}</p>
                <p><strong>Contact:</strong> ${ownerData.owner_contactno || 'N/A'}</p>
            </div>
        </div>

        <table class="details-table">
            <thead>
                <tr>
                    <th>Description</th>
                    <th>Amount</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Maintenance Rate (${maintenanceData.bill_duration || 1} month(s))</td>
                    <td>${formatCurrency(maintenanceData.total_rate_amount || (maintenanceData.total_amount - maintenanceData.prev_balance_amount))}</td>
                </tr>
                ${maintenanceData.prev_balance_amount > 0 ? `
                <tr>
                    <td>Previous Balance</td>
                    <td>${formatCurrency(maintenanceData.prev_balance_amount)}</td>
                </tr>
                ` : ''}
                <tr>
                    <td><strong>Total Amount</strong></td>
                    <td><strong>${formatCurrency(maintenanceData.total_amount)}</strong></td>
                </tr>
                <tr>
                    <td>Paid Amount</td>
                    <td>${formatCurrency(maintenanceData.paid_amount)}</td>
                </tr>
                <tr>
                    <td><strong>Balance</strong></td>
                    <td><strong>${formatCurrency(maintenanceData.total_amount - maintenanceData.paid_amount)}</strong></td>
                </tr>
            </tbody>
        </table>

        <div class="total-section">
            <div class="total-row">
                <span>Bill Period:</span>
                <span>${formatDate(maintenanceData.bill_start_date)} to ${formatDate(maintenanceData.bill_end_date)}</span>
            </div>
            <div class="total-row final">
                <span>Amount Paid:</span>
                <span>${formatCurrency(maintenanceData.paid_amount)}</span>
            </div>
        </div>

        <div class="footer">
            <p>This is a computer-generated receipt. No signature required.</p>
            <p>Thank you for your payment!</p>
        </div>
    </div>
</body>
</html>
    `;
};

/**
 * Generate receipt as PDF (for download)
 * Note: This requires a PDF library on the backend
 */
export const generateReceiptPDF = async (maintenanceData, ownerData) => {
    // This would typically call a backend endpoint to generate PDF
    // For now, we'll return the HTML which can be printed as PDF
    return generateReceiptHTML(maintenanceData, ownerData);
};

/**
 * Format receipt for WhatsApp message
 */
export const formatReceiptForWhatsApp = (maintenanceData, ownerData) => {
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric' 
        });
    };

    const formatCurrency = (amount) => {
        return `₹${Number(amount || 0).toFixed(2)}`;
    };

    const receiptNumber = `REC-${String(maintenanceData.maintain_id).padStart(6, '0')}`;
    const receiptDate = new Date().toLocaleDateString('en-IN', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
    });

    return `
*MAINTENANCE PAYMENT RECEIPT*

*Receipt No:* ${receiptNumber}
*Date:* ${receiptDate}

*Owner Details:*
Name: ${ownerData.owner_name || 'N/A'}
Flat No: ${ownerData.flat_no || 'N/A'}

*Payment Details:*
Bill Period: ${formatDate(maintenanceData.bill_start_date)} to ${formatDate(maintenanceData.bill_end_date)}
Duration: ${maintenanceData.bill_duration || 1} month(s)

Maintenance Rate: ${formatCurrency(maintenanceData.total_rate_amount || (maintenanceData.total_amount - maintenanceData.prev_balance_amount))}
${maintenanceData.prev_balance_amount > 0 ? `Previous Balance: ${formatCurrency(maintenanceData.prev_balance_amount)}\n` : ''}
*Total Amount: ${formatCurrency(maintenanceData.total_amount)}*
*Paid Amount: ${formatCurrency(maintenanceData.paid_amount)}*
Balance: ${formatCurrency(maintenanceData.total_amount - maintenanceData.paid_amount)}

*Status: PAID* ✅

Thank you for your payment!
    `.trim();
};

