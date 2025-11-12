import React, { useState, useEffect } from "react";
import {
    getMaintenancePayments,
    addMaintenancePayment,
    updateMaintenancePayment,
    deleteMaintenancePayment,
    restoreMaintenancePayment,
    getMaintenanceDetails,
} from "../services/api";
import "../css/Maintenance.css";

const MaintenancePayment = () => {
    const [payments, setPayments] = useState([]);
    const [details, setDetails] = useState([]);
    const [formData, setFormData] = useState({
        maintain_id: "",
        payment_date: "",
        payment_mode: "",
        paid_amount: "",
        remark: "",
    });
    const [editId, setEditId] = useState(null);

    // Fetch all payments
    const fetchPayments = async () => {
        try {
            const res = await getMaintenancePayments();
            setPayments(res.data);
        } catch (err) {
            console.error("Error fetching payments:", err);
        }
    };

    // Fetch all maintenance details for dropdown
    const fetchDetails = async () => {
        try {
            const res = await getMaintenanceDetails();
            setDetails(res.data);
        } catch (err) {
            console.error("Error fetching details:", err);
        }
    };

    useEffect(() => {
        fetchPayments();
        fetchDetails();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editId) {
                await updateMaintenancePayment(editId, formData);
            } else {
                await addMaintenancePayment(formData);
            }
            fetchPayments();
            setFormData({
                maintain_id: "",
                payment_date: "",
                payment_mode: "",
                paid_amount: "",
                remark: "",
            });
            setEditId(null);
        } catch (err) {
            console.error("Error saving payment:", err);
        }
    };

    const handleEdit = (payment) => {
        setFormData(payment);
        setEditId(payment.maintain_pay_id);
    };

    const handleDelete = async (id) => {
        const reason = prompt("Enter reason for delete:");
        if (!reason) return;
        try {
            await deleteMaintenancePayment(id, reason);
            fetchPayments();
        } catch (err) {
            console.error("Error deleting payment:", err);
        }
    };

    const handleRestore = async (id) => {
        try {
            await restoreMaintenancePayment(id);
            fetchPayments();
        } catch (err) {
            console.error("Error restoring payment:", err);
        }
    };

    return (
        <div className="maintenance-container">
            <h2>Maintenance Payment</h2>

            <form className="maintenance-form" onSubmit={handleSubmit}>
                <select
                    required
                    value={formData.maintain_id}
                    onChange={(e) =>
                        setFormData({ ...formData, maintain_id: e.target.value })
                    }
                >
                    <option value="">Select Maintenance Detail</option>
                    {details.map((detail) => (
                        <option key={detail.maintain_id} value={detail.maintain_id}>
                            {`#${detail.maintain_id} - ${detail.bill_period} (${detail.status})`}
                        </option>
                    ))}
                </select>

                <input
                    type="date"
                    required
                    value={formData.payment_date}
                    onChange={(e) =>
                        setFormData({ ...formData, payment_date: e.target.value })
                    }
                />

                <input
                    type="text"
                    placeholder="Payment Mode (Cash/Online/UPI)"
                    required
                    value={formData.payment_mode}
                    onChange={(e) =>
                        setFormData({ ...formData, payment_mode: e.target.value })
                    }
                />

                <input
                    type="number"
                    placeholder="Paid Amount"
                    required
                    value={formData.paid_amount}
                    onChange={(e) =>
                        setFormData({ ...formData, paid_amount: e.target.value })
                    }
                />

                <input
                    type="text"
                    placeholder="Remark"
                    value={formData.remark}
                    onChange={(e) =>
                        setFormData({ ...formData, remark: e.target.value })
                    }
                />

                <button type="submit">{editId ? "Update" : "Add"}</button>
            </form>

            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Maintain ID</th>
                        <th>Payment Date</th>
                        <th>Payment Mode</th>
                        <th>Paid Amount</th>
                        <th>Remark</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {payments.map((item) => (
                        <tr key={item.maintain_pay_id}>
                            <td>{item.maintain_pay_id}</td>
                            <td>{item.maintain_id}</td>
                            <td>
                                {item.payment_date
                                    ? new Date(item.payment_date).toLocaleDateString()
                                    : ""}
                            </td>
                            <td>{item.payment_mode}</td>
                            <td>{item.paid_amount}</td>
                            <td>{item.remark}</td>
                            <td>
                                <button onClick={() => handleEdit(item)}>Edit</button>
                                <button onClick={() => handleDelete(item.maintain_pay_id)}>
                                    Delete
                                </button>
                                <button onClick={() => handleRestore(item.maintain_pay_id)}>
                                    Restore
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default MaintenancePayment;
