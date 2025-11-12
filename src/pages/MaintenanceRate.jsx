import React, { useEffect, useState } from "react";
import {
    getMaintenanceRates,
    addMaintenanceRate,
    updateMaintenanceRate,
    deleteMaintenanceRate,
    restoreMaintenanceRate,
    getWings,
    getFlatTypes,
    getMaintenanceComponents,
} from "../services/api";
import "../css/Maintenance.css";

const MaintenanceRate = () => {
    const [rates, setRates] = useState([]);
    const [formData, setFormData] = useState({
        wing_id: "",
        flat_type_id: "",
        componant_id: "",
        amount: "",
    });
    const [editId, setEditId] = useState(null);
    const [wings, setWings] = useState([]);
    const [flatTypes, setFlatTypes] = useState([]);
    const [components, setComponents] = useState([]);

    const fetchData = async () => {
        const [rateRes, wingRes, flatRes, compRes] = await Promise.all([
            getMaintenanceRates(),
            getWings(),
            getFlatTypes(),
            getMaintenanceComponents(),
        ]);
        setRates(rateRes.data);
        setWings(wingRes.data);
        setFlatTypes(flatRes.data);
        setComponents(compRes.data);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (editId) {
            await updateMaintenanceRate(editId, formData);
            alert("Rate updated successfully!");
        }
        else {
            await addMaintenanceRate(formData);
            alert("Rate added successfully!");
        }
        setFormData({ wing_id: "", flat_type_id: "", componant_id: "", amount: "" });
        setEditId(null);
        fetchData();
    };

    /* const handleEdit = (item) => {
        setFormData(item);
        setEditId(item.rate_id);
    };
    */
    const handleEdit = (item) => {
        setFormData({
            wing_id: item.wing_id,
            flat_type_id: item.flat_type_id,
            componant_id: item.componant_id,
            amount: item.amount,
        });
        setEditId(item.rate_id);
    };

    const handleDelete = async (id) => {
        const reason = prompt("Enter delete reason:");
        if (reason) await deleteMaintenanceRate(id, reason);
        fetchData();
    };

    const handleRestore = async (id) => {
        await restoreMaintenanceRate(id);
        fetchData();
    };

    return (
        <div className="maintenance-container">
            <h2>Maintenance Rates</h2>

            <form onSubmit={handleSubmit} className="maintenance-form">
                <select
                    value={formData.wing_id}
                    onChange={(e) => setFormData({ ...formData, wing_id: e.target.value })}
                    required
                >
                    <option value="">Select Wing</option>
                    {wings.map((w) => (
                        <option key={w.wing_id} value={w.wing_id}>
                            {w.wing_name}
                        </option>
                    ))}
                </select>

                <select
                    value={formData.flat_type_id}
                    onChange={(e) => setFormData({ ...formData, flat_type_id: e.target.value })}
                    required
                >
                    <option value="">Select Flat Type</option>
                    {flatTypes.map((f) => (
                        <option key={f.flat_type_id} value={f.flat_type_id}>
                            {f.flat_type_name}
                        </option>
                    ))}
                </select>

                <select
                    value={formData.componant_id}
                    onChange={(e) => setFormData({ ...formData, componant_id: e.target.value })}
                    required
                >
                    <option value="">Select Component</option>
                    {components.map((c) => (
                        <option key={c.componant_id} value={c.componant_id}>
                            {c.componant_name}
                        </option>
                    ))}
                </select>

                <input
                    type="number"
                    placeholder="Amount"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                />
                <button type="submit">{editId ? "Update" : "Add"}</button>
            </form>

            <table className="maintenance-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Wing</th>
                        <th>Flat Type</th>
                        <th>Component</th>
                        <th>Amount</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {rates.map((r) => (
                        <tr key={r.rate_id}>
                            <td>{r.rate_id}</td>
                            {/* <td>{r.wing_id}</td>
                            <td>{r.flat_type_id}</td>
                            <td>{r.componant_id}</td> */}
                            <td>{wings.find(w => w.wing_id === r.wing_id)?.wing_name || "-"}</td>
                            <td>{flatTypes.find(f => f.flat_type_id === r.flat_type_id)?.flat_type_name || "-"}</td>
                            <td>{components.find(c => c.componant_id === r.componant_id)?.componant_name || "-"}</td>

                            <td>{r.amount}</td>
                            <td>
                                <button onClick={() => handleEdit(r)}>✏️</button>
                                <button onClick={() => handleDelete(r.rate_id)}>🗑️</button>
                                <button onClick={() => handleRestore(r.rate_id)}>♻️</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default MaintenanceRate;
