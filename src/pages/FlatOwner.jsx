import React, { useState, useEffect } from "react";
import {
    getWings,
    getFloors,
    getFlatTypes,
    getOwners,
    createFlat,
    addOwner,
    updateOwner,
    deleteOwner,
} from "../services/api";
import "../css/FlatOwner.css";

const FlatOwner = () => {
    const [owners, setOwners] = useState([]);
    const [formData, setFormData] = useState({
        flat_no: "",
        wing_id: "",
        floor_id: "",
        flat_type_id: "",
        owner_name: "",
        owner_contactno: "",
        owner_altercontactno: "",
        owner_email: "",
        is_residence: false,
        owner_adhar_no: "",
        owner_pan: "",
        ownership_type: "",
    });
    const [wings, setWings] = useState([]);
    const [floors, setFloors] = useState([]);
    const [flatTypes, setFlatTypes] = useState([]);
    const [editMode, setEditMode] = useState(false);
    const [editId, setEditId] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [searchText, setSearchText] = useState("");

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [wingRes, floorRes, flatTypeRes, ownerRes] = await Promise.all([
                getWings(),
                getFloors(),
                getFlatTypes(),
                getOwners(),
            ]);
            setWings(wingRes.data);
            setFloors(floorRes.data);
            setFlatTypes(flatTypeRes.data);
            setOwners(ownerRes.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            let flatId;

            if (!editMode) {
                // Create Flat first
                const flatPayload = {
                    flat_no: formData.flat_no,
                    wing_id: formData.wing_id,
                    floor_id: formData.floor_id,
                    flat_type_id: formData.flat_type_id,
                    soc_id: 1,
                };
                const flatRes = await createFlat(flatPayload);
                flatId = flatRes.data.insertId;
            } else {
                flatId = formData.flat_id;
            }

            const ownerPayload = { ...formData, flat_id: flatId };

            if (editMode && editId) {
                await updateOwner(editId, ownerPayload);
                alert("Owner updated successfully");
            } else {
                await addOwner(ownerPayload);
                alert("Owner added successfully");
            }

            resetForm();
            fetchData();
            setShowForm(false);
        } catch (err) {
            console.error(err);
        }
    };

    const resetForm = () => {
        setFormData({
            flat_no: "",
            wing_id: "",
            floor_id: "",
            flat_type_id: "",
            owner_name: "",
            owner_contactno: "",
            owner_altercontactno: "",
            owner_email: "",
            is_residence: false,
            owner_adhar_no: "",
            owner_pan: "",
            ownership_type: "",
        });
        setEditMode(false);
        setEditId(null);
    };

    const handleEdit = (owner) => {
        setFormData({
            flat_id: owner.flat_id,
            flat_no: owner.flat_no,
            wing_id: owner.wing_id,
            floor_id: owner.floor_id,
            flat_type_id: owner.flat_type_id,
            owner_name: owner.owner_name,
            owner_contactno: owner.owner_contactno,
            owner_altercontactno: owner.owner_altercontactno,
            owner_email: owner.owner_email,
            is_residence: !!owner.is_residence,
            owner_adhar_no: owner.owner_adhar_no,
            owner_pan: owner.owner_pan,
            ownership_type: owner.ownership_type,
        });
        setEditMode(true);
        setEditId(owner.owner_id);
        setShowForm(true);
    };

    const handleDelete = async (owner) => {
        if (!window.confirm(`Are you sure you want to delete ${owner.owner_name}?`))
            return;
        const reason = prompt("Enter deletion reason:");
        if (!reason) return;
        try {
            await deleteOwner(owner.owner_id, reason);
            alert("Owner deleted successfully");
            fetchData();
        } catch (err) {
            console.error(err);
        }
    };

    const filteredOwners = owners.filter(
        (o) =>
            o.owner_name.toLowerCase().includes(searchText.toLowerCase()) ||
            (o.flat_no && o.flat_no.toLowerCase().includes(searchText.toLowerCase()))
    );

    return (
        <div className="flat-owner-container">
            {!showForm ? (
                <div>
                    <div className="table-header">
                        <button onClick={() => setShowForm(true)}>New Entry</button>
                        <input
                            type="text"
                            placeholder="Search by owner or flat no"
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                        />
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>Owner Name</th>
                                <th>Flat No</th>
                                <th>Wing</th>
                                <th>Floor</th>
                                <th>Flat Type</th>
                                <th>Contact</th>
                                <th>Email</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOwners.map((owner) => (
                                <tr key={owner.owner_id}>
                                    <td>{owner.owner_name}</td>
                                    <td>{owner.flat_no || "-"}</td>
                                    <td>{owner.wing_name || "-"}</td>
                                    <td>{owner.floor_name || "-"}</td>
                                    <td>{owner.flat_type_name || "-"}</td>
                                    <td>{owner.owner_contactno}</td>
                                    <td>{owner.owner_email}</td>
                                    <td>
                                        {/* <span className={`status-badge ${owner.is_deleted ? 'status-deleted' : 'status-active'}`}> */}
                                        {owner.is_deleted ? "Deleted" : "Active"}

                                    </td>
                                    <td>
                                        {!owner.is_deleted && (
                                            <button className="edit-btn-flat" onClick={() => handleEdit(owner)}>Edit</button>
                                        )}
                                        {!owner.is_deleted && (
                                            <button className="delete-btn-flat" onClick={() => handleDelete(owner)}>Delete</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div>
                    <h2>{editMode ? "Edit Owner" : "Add Owner"}</h2>
                    <form onSubmit={handleSubmit}>
                        {/* Your existing form fields */}
                        <label>Wing</label>
                        <select
                            name="wing_id"
                            value={formData.wing_id || ""}
                            onChange={handleChange}
                            required
                        >
                            <option value="">Select Wing</option>
                            {wings.map((wing) => (
                                <option key={wing.wing_id} value={wing.wing_id}>
                                    {wing.wing_name}
                                </option>
                            ))}
                        </select>

                        <label>Floor</label>
                        <select
                            name="floor_id"
                            value={formData.floor_id || ""}
                            onChange={handleChange}
                            required
                        >
                            <option value="">Select Floor</option>
                            {floors.map((floor) => (
                                <option key={floor.floor_id} value={floor.floor_id}>
                                    {floor.floor_name}
                                </option>
                            ))}
                        </select>

                        <label>Flat Type</label>
                        <select
                            name="flat_type_id"
                            value={formData.flat_type_id || ""}
                            onChange={handleChange}
                            required
                        >
                            <option value="">Select Flat Type</option>
                            {flatTypes.map((ft) => (
                                <option key={ft.flat_type_id} value={ft.flat_type_id}>
                                    {ft.flat_type_name}
                                </option>
                            ))}
                        </select>

                        <label>Flat No.</label>
                        <input
                            type="text"
                            name="flat_no"
                            value={formData.flat_no}
                            onChange={handleChange}
                            placeholder="Enter Flat No."
                            required
                            disabled={editMode}
                        />

                        <label>Owner Name</label>
                        <input
                            type="text"
                            name="owner_name"
                            value={formData.owner_name}
                            onChange={handleChange}
                            required
                        />

                        <label>Contact No.</label>
                        <input
                            type="text"
                            name="owner_contactno"
                            value={formData.owner_contactno}
                            onChange={handleChange}
                            required
                        />

                        <label>Alternate Contact</label>
                        <input
                            type="text"
                            name="owner_altercontactno"
                            value={formData.owner_altercontactno}
                            onChange={handleChange}
                        />

                        <label>Email</label>
                        <input
                            type="email"
                            name="owner_email"
                            value={formData.owner_email}
                            onChange={handleChange}
                        />

                        <label>
                            <input
                                type="checkbox"
                                name="is_residence"
                                checked={formData.is_residence}
                                onChange={handleChange}
                            />{" "}
                            Is Residence
                        </label>

                        <label>Aadhaar No.</label>
                        <input
                            type="text"
                            name="owner_adhar_no"
                            value={formData.owner_adhar_no}
                            onChange={handleChange}
                        />

                        <label>PAN No.</label>
                        <input
                            type="text"
                            name="owner_pan"
                            value={formData.owner_pan}
                            onChange={handleChange}
                        />

                        <label>Ownership Type</label>
                        <input
                            type="text"
                            name="ownership_type"
                            value={formData.ownership_type}
                            onChange={handleChange}
                        />

                        <button type="submit">{editMode ? "Update Owner" : "Add Owner"}</button>
                        <button
                            type="button"
                            onClick={() => {
                                resetForm();
                                setShowForm(false);
                            }}
                        >
                            Cancel
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default FlatOwner;