import React, { useState, useEffect } from "react";
import "../css/RentalDetail.css";
import {
    getFlatDetails,
    getRentals,
    addRental,
    updateRental,
    deleteRental,
} from "../services/api";

const RentalDetail = () => {
    const [rentals, setRentals] = useState([]);
    const [formData, setFormData] = useState({
        rental_id: null,
        flat_no: "",
        wing_name: "",
        floor_name: "",
        flat_type_name: "",
        owner_name: "",
        owner_id: "",
        tenant_name: "",
        tenant_contactno: "",
        tenant_altercontactno: "",
        tenant_email: "",
        start_date: "",
        end_date: "",
        monthly_rent: "",
        deposite: "",
    });
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(false);
    const [searchText, setSearchText] = useState("");
    const [loadingFlat, setLoadingFlat] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Delete modal state
    const [deleteModal, setDeleteModal] = useState({
        show: false,
        id: null,
        reason: "",
    });

    useEffect(() => {
        fetchRentals();
    }, []);

    const fetchRentals = async () => {
        try {
            const res = await getRentals();
            const data = res.data.map((r) => ({
                ...r,
                flat_no: r.flat_no || r.flat_number || "",
                wing_name: r.wing_name || "",
                floor_name: r.floor_name || "",
                flat_type_name: r.flat_type_name || "",
                owner_name: r.owner_name || "",
            }));
            setRentals(data);
        } catch (err) {
            console.error(err);
            alert("Error fetching rentals!");
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleFlatSearch = async () => {
        if (!formData.flat_no) return alert("Enter flat number first!");
        try {
            setLoadingFlat(true);
            const res = await getFlatDetails(formData.flat_no);
            const flat = res.data;
            setFormData((prev) => ({
                ...prev,
                wing_name: flat.wing_name || "",
                floor_name: flat.floor_name || "",
                flat_type_name: flat.flat_type_name || "",
                owner_name: flat.owner_name || "",
                owner_id: flat.owner_id || "",
            }));
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || "Flat not found!");
        } finally {
            setLoadingFlat(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.owner_id) return alert("Fetch flat details first!");
        setSubmitting(true);
        try {
            const payload = {
                flat_no: formData.flat_no,
                tenant_name: formData.tenant_name,
                tenant_contactno: formData.tenant_contactno,
                tenant_altercontactno: formData.tenant_altercontactno,
                tenant_email: formData.tenant_email,
                tenant_agrimg: null,
                start_date: formData.start_date,
                end_date: formData.end_date,
                monthly_rent: formData.monthly_rent,
                deposite: formData.deposite,
            };

            if (editing && formData.rental_id) {
                await updateRental(formData.rental_id, payload);
                alert("Rental updated successfully!");
            } else {
                await addRental(payload);
                alert("Rental added successfully!");
            }

            resetForm();
            fetchRentals();
            setShowForm(false);
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.error || "Error saving rental!");
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (rental) => {
        setFormData({
            rental_id: rental.rental_id,
            flat_no: rental.flat_no,
            wing_name: rental.wing_name,
            floor_name: rental.floor_name,
            flat_type_name: rental.flat_type_name,
            owner_name: rental.owner_name,
            owner_id: rental.owner_id,
            tenant_name: rental.tenant_name,
            tenant_contactno: rental.tenant_contactno,
            tenant_altercontactno: rental.tenant_altercontactno,
            tenant_email: rental.tenant_email,
            start_date: rental.start_date?.split("T")[0] || "",
            end_date: rental.end_date?.split("T")[0] || "",
            monthly_rent: rental.monthly_rent,
            deposite: rental.deposite,
        });
        setEditing(true);
        setShowForm(true);
    };

    const handleNewEntry = () => {
        resetForm();
        setShowForm(true);
    };

    const resetForm = () => {
        setFormData({
            rental_id: null,
            flat_no: "",
            wing_name: "",
            floor_name: "",
            flat_type_name: "",
            owner_name: "",
            owner_id: "",
            tenant_name: "",
            tenant_contactno: "",
            tenant_altercontactno: "",
            tenant_email: "",
            start_date: "",
            end_date: "",
            monthly_rent: "",
            deposite: "",
        });
        setEditing(false);
    };

    const filteredRentals = rentals.filter(
        (r) =>
            r.flat_no?.toLowerCase().includes(searchText.toLowerCase()) ||
            r.tenant_name?.toLowerCase().includes(searchText.toLowerCase())
    );

    // DELETE HANDLER
    const confirmDelete = (rental) => {
        setDeleteModal({ show: true, id: rental.rental_id, reason: "" });
    };

    const handleDelete = async () => {
        if (!deleteModal.reason.trim()) return alert("Please enter reason for delete!");
        try {
            await deleteRental(deleteModal.id, deleteModal.reason);
            alert("Rental deleted successfully!");
            setDeleteModal({ show: false, id: null, reason: "" });
            fetchRentals();
        } catch (err) {
            console.error(err);
            alert("Error deleting rental!");
        }
    };

    return (
        <div className="rental-container">
            <h2>Rental Details</h2>

            {!showForm && (
                <div className="table-header">
                    <button onClick={handleNewEntry}>New Entry</button>
                    <input
                        type="text"
                        placeholder="Search by Flat No / Tenant Name"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                    />
                </div>
            )}

            {!showForm && (
                <table className="rental-table">
                    <thead>
                        <tr>
                            <th>Flat No</th>
                            <th>Wing</th>
                            <th>Floor</th>
                            <th>Flat Type</th>
                            <th>Owner Name</th>
                            <th>Tenant Name</th>
                            <th>Contact</th>
                            <th>Monthly Rent</th>
                            <th>Deposit</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRentals.length ? (
                            filteredRentals.map((rental) => (
                                <tr key={rental.rental_id}>
                                    <td>{rental.flat_no}</td>
                                    <td>{rental.wing_name}</td>
                                    <td>{rental.floor_name}</td>
                                    <td>{rental.flat_type_name}</td>
                                    <td>{rental.owner_name}</td>
                                    <td>{rental.tenant_name}</td>
                                    <td>{rental.tenant_contactno}</td>
                                    <td>{rental.monthly_rent}</td>
                                    <td>{rental.deposite}</td>
                                    <td>
                                        <button onClick={() => handleEdit(rental)}>Edit</button>
                                        <button
                                            className="delete-btn"
                                            onClick={() => confirmDelete(rental)}
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="10">No rentals found</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            )}

            {showForm && (
                <div className="rental-form-container">
                    <h3>{editing ? "Edit Rental" : "Add Rental"}</h3>
                    <form onSubmit={handleSubmit} className="rental-form">
                        <div className="flat-section">
                            <label>Flat No:</label>
                            <input
                                type="text"
                                name="flat_no"
                                value={formData.flat_no}
                                onChange={handleChange}
                                required
                            />
                            <button type="button" onClick={handleFlatSearch} disabled={loadingFlat}>
                                {loadingFlat ? "Fetching..." : "Fetch Details"}
                            </button>
                        </div>

                        <div className="flat-info">
                            <label>Wing:</label>
                            <input type="text" value={formData.wing_name} readOnly />
                            <label>Floor:</label>
                            <input type="text" value={formData.floor_name} readOnly />
                            <label>Flat Type:</label>
                            <input type="text" value={formData.flat_type_name} readOnly />
                            <label>Owner Name:</label>
                            <input type="text" value={formData.owner_name} readOnly />
                        </div>

                        <h3>Tenant Details</h3>
                        <label>Tenant Name:</label>
                        <input type="text" name="tenant_name" value={formData.tenant_name} onChange={handleChange} required />
                        <label>Contact No:</label>
                        <input type="text" name="tenant_contactno" value={formData.tenant_contactno} onChange={handleChange} required />
                        <label>Alternate Contact:</label>
                        <input type="text" name="tenant_altercontactno" value={formData.tenant_altercontactno} onChange={handleChange} />
                        <label>Email:</label>
                        <input type="email" name="tenant_email" value={formData.tenant_email} onChange={handleChange} />
                        <label>Start Date:</label>
                        <input type="date" name="start_date" value={formData.start_date} onChange={handleChange} />
                        <label>End Date:</label>
                        <input type="date" name="end_date" value={formData.end_date} onChange={handleChange} />
                        <label>Monthly Rent:</label>
                        <input type="number" name="monthly_rent" value={formData.monthly_rent} onChange={handleChange} />
                        <label>Deposit:</label>
                        <input type="number" name="deposite" value={formData.deposite} onChange={handleChange} />

                        <div className="form-buttons">
                            <button type="submit" disabled={submitting}>
                                {submitting ? "Submitting..." : editing ? "Update Rental" : "Add Rental"}
                            </button>
                            <button type="button" onClick={() => setShowForm(false)}>
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteModal.show && (
                <div className="delete-modal">
                    <div className="delete-modal-content">
                        <h3>Confirm Delete</h3>
                        <p>Enter reason for deleting this rental:</p>
                        <textarea
                            rows="3"
                            value={deleteModal.reason}
                            onChange={(e) =>
                                setDeleteModal((prev) => ({
                                    ...prev,
                                    reason: e.target.value,
                                }))
                            }
                        ></textarea>
                        <div className="delete-modal-actions">
                            <button onClick={handleDelete}>Confirm Delete</button>
                            <button
                                className="cancel"
                                onClick={() =>
                                    setDeleteModal({ show: false, id: null, reason: "" })
                                }
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RentalDetail;