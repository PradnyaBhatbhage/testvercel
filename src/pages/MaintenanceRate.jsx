import React, { useEffect, useState } from "react";
import {
    getMaintenanceRates,
    addMaintenanceRate,
    updateMaintenanceRate,
    deleteMaintenanceRate,
    getWings,
    getFlatTypes,
    getMaintenanceComponents,
} from "../services/api";
import { getCurrentUserWingId, filterRatesByWing } from "../utils/wingFilter";
import { canEdit, canDelete } from "../utils/ownerFilter";
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
    const [showForm, setShowForm] = useState(false);
    const [search, setSearch] = useState("");
    const [wings, setWings] = useState([]);
    const [flatTypes, setFlatTypes] = useState([]);
    const [components, setComponents] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Get current user's wing_id
    const currentUserWingId = getCurrentUserWingId();

    const fetchData = async () => {
        const [rateRes, wingRes, flatRes, compRes] = await Promise.all([
            getMaintenanceRates(),
            getWings(),
            getFlatTypes(),
            getMaintenanceComponents(),
        ]);
        
        // Filter rates by current user's wing
        const rawRates = rateRes.data || [];
        if (currentUserWingId !== null) {
            const filteredRates = filterRatesByWing(rawRates, currentUserWingId);
            setRates(filteredRates);
        } else {
            setRates(rawRates);
        }
        
        setWings(wingRes.data);
        setFlatTypes(flatRes.data);
        setComponents(compRes.data);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editId) {
                await updateMaintenanceRate(editId, formData);
                alert("Rate updated successfully!");
            } else {
                await addMaintenanceRate(formData);
                alert("Rate added successfully!");
            }
            setFormData({ wing_id: "", flat_type_id: "", componant_id: "", amount: "" });
            setEditId(null);
            setShowForm(false);
            fetchData();
        } catch (err) {
            console.error(err);
            alert("Error saving maintenance rate!");
        }
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
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        const reason = prompt("Enter delete reason:");
        if (reason) {
            try {
                await deleteMaintenanceRate(id, reason);
                alert("Rate deleted successfully!");
                fetchData();
            } catch (err) {
                console.error(err);
                alert("Error deleting maintenance rate!");
            }
        }
    };

    const handleCancel = () => {
        setFormData({ wing_id: "", flat_type_id: "", componant_id: "", amount: "" });
        setEditId(null);
        setShowForm(false);
    };

    // Filter rates based on search
    const filtered = rates.filter((r) => {
        const wingName = wings.find(w => w.wing_id === r.wing_id)?.wing_name || "";
        const flatTypeName = flatTypes.find(f => f.flat_type_id === r.flat_type_id)?.flat_type_name || "";
        const componentName = components.find(c => c.componant_id === r.componant_id)?.componant_name || "";
        const searchLower = search.toLowerCase();
        return wingName.toLowerCase().includes(searchLower) ||
               flatTypeName.toLowerCase().includes(searchLower) ||
               componentName.toLowerCase().includes(searchLower) ||
               r.amount?.toString().includes(searchLower);
    });

    // Pagination logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentRates = filtered.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filtered.length / itemsPerPage);

    // Reset to page 1 when search changes
    React.useEffect(() => {
        setCurrentPage(1);
    }, [search]);

    return (
        <div className="maintenance-detail-container">
            <h2>Maintenance Rates</h2>

            {/* Controls (New Entry + Search) - Only show when form is not visible */}
            {!showForm && (
                <div className="maintenance-controls">
                    {canEdit() && (
                        <button className="new-entry-btn" onClick={() => setShowForm(true)}>
                            New Entry
                        </button>
                    )}
                    <div className="search-bar">
                        <input
                            type="text"
                            placeholder="Search by wing, flat type, component, or amount..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
            )}

            {/* Form */}
            {showForm && (
                <form onSubmit={handleSubmit} className="maintenance-form-wrapper">
                    <div className="form-section">
                        <div className="form-group">
                            <label>Wing:</label>
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
                        </div>

                        <div className="form-group">
                            <label>Flat Type:</label>
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
                        </div>

                        <div className="form-group">
                            <label>Component:</label>
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
                        </div>

                        <div className="form-group">
                            <label>Amount:</label>
                            <input
                                type="number"
                                placeholder="Amount"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-actions">
                        <button type="submit" className="submit-btn">
                            {editId ? "Update Maintenance Rate" : "Add Maintenance Rate"}
                        </button>
                        <button type="button" className="cancel-btn" onClick={handleCancel}>
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            {/* Table - Only show when form is not visible */}
            {!showForm && (
                <>
                    <table className="maintenance-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Wing</th>
                            <th>Flat Type</th>
                            <th>Component</th>
                            <th>Amount</th>
                            {(canEdit() || canDelete()) && <th>Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length > 0 ? (
                            currentRates.map((r) => (
                                <tr key={r.rate_id}>
                                    <td>{r.rate_id}</td>
                                    <td>{wings.find(w => w.wing_id === r.wing_id)?.wing_name || "-"}</td>
                                    <td>{flatTypes.find(f => f.flat_type_id === r.flat_type_id)?.flat_type_name || "-"}</td>
                                    <td>{components.find(c => c.componant_id === r.componant_id)?.componant_name || "-"}</td>
                                    <td>{r.amount}</td>
                                    {(canEdit() || canDelete()) && (
                                        <td>
                                            {canEdit() && (
                                                <button onClick={() => handleEdit(r)}>Edit</button>
                                            )}
                                            {canDelete() && (
                                                <button onClick={() => handleDelete(r.rate_id)}>Delete</button>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={(canEdit() || canDelete()) ? "6" : "5"} style={{ textAlign: "center" }}>
                                    No maintenance rates found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                    </table>
                    {totalPages > 1 && (
                        <div className="pagination">
                            <button disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)}>⟸ Prev</button>
                            <span>Page {currentPage} of {totalPages}</span>
                            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(currentPage + 1)}>Next ⟹</button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default MaintenanceRate;
