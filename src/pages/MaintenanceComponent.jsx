import React, { useEffect, useState } from "react";
import {
    getMaintenanceComponents,
    addMaintenanceComponent,
    updateMaintenanceComponent,
    deleteMaintenanceComponent,
    restoreMaintenanceComponent,
} from "../services/api";
import "../css/Maintenance.css";

const MaintenanceComponent = () => {
    const [components, setComponents] = useState([]);
    const [formData, setFormData] = useState({ componant_name: "", description: "" });
    const [editId, setEditId] = useState(null);

    const fetchComponents = async () => {
        const res = await getMaintenanceComponents();
        setComponents(res.data);
    };

    useEffect(() => {
        fetchComponents();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (editId) {
            await updateMaintenanceComponent(editId, formData);
        } else {
            await addMaintenanceComponent(formData);
        }
        setFormData({ componant_name: "", description: "" });
        setEditId(null);
        fetchComponents();
    };

    const handleEdit = (item) => {
        setFormData(item);
        setEditId(item.componant_id);
    };

    const handleDelete = async (id) => {
        const reason = prompt("Enter delete reason:");
        if (reason) {
            await deleteMaintenanceComponent(id, reason);
            fetchComponents();
        }
    };

    const handleRestore = async (id) => {
        await restoreMaintenanceComponent(id);
        fetchComponents();
    };

    return (
        <div className="maintenance-container">
            <h2>Maintenance Components</h2>

            <form onSubmit={handleSubmit} className="maintenance-form">
                <input
                    type="text"
                    placeholder="Component Name"
                    value={formData.componant_name}
                    onChange={(e) => setFormData({ ...formData, componant_name: e.target.value })}
                    required
                />
                <input
                    type="text"
                    placeholder="Description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
                <button type="submit">{editId ? "Update" : "Add"}</button>
            </form>

            <table className="maintenance-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Component Name</th>
                        <th>Description</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {components.map((item) => (
                        <tr key={item.componant_id}>
                            <td>{item.componant_id}</td>
                            <td>{item.componant_name}</td>
                            <td>{item.description}</td>
                            <td>
                                <button onClick={() => handleEdit(item)}>✏️</button>
                                <button onClick={() => handleDelete(item.componant_id)}>🗑️</button>
                                <button onClick={() => handleRestore(item.componant_id)}>♻️</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default MaintenanceComponent;