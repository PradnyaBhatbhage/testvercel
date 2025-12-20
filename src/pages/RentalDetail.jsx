import React, { useState, useEffect, useCallback } from "react";
import "../css/RentalDetail.css";
import {
    getFlatDetails,
    getRentals,
    addRental,
    updateRental,
    deleteRental,
    getParking,
    addParking,
    updateParking,
    deleteParking,
} from "../services/api";
import { getCurrentUserWingId } from "../utils/wingFilter";
import { 
    isOwnerRole, 
    filterRentalsByCurrentOwner, 
    canEdit, 
    canDelete 
} from "../utils/ownerFilter";

const RentalDetail = () => {
    const [rentals, setRentals] = useState([]);
    const [formData, setFormData] = useState({
        rental_id: null,
        flat_no: "",
        wing_id: "",
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
    const [selectedFile, setSelectedFile] = useState(null);
    const [filePreview, setFilePreview] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Parking details state
    const [parkingDetails, setParkingDetails] = useState([]);
    const [existingParking, setExistingParking] = useState([]);
    // Parking attachment states (arrays to handle multiple parking entries)
    const [parkingFiles, setParkingFiles] = useState([]);
    const [parkingFilePreviews, setParkingFilePreviews] = useState([]);

    // Get current user's wing_id
    const currentUserWingId = getCurrentUserWingId();

    // Delete modal state
    const [deleteModal, setDeleteModal] = useState({
        show: false,
        id: null,
        reason: "",
    });

    const fetchRentals = useCallback(async () => {
        try {
            const res = await getRentals();

            if (!res.data || res.data.length === 0) {
                setRentals([]);
                return;
            }

            const rawData = res.data.map((r) => ({
                ...r,
                flat_no: r.flat_no || r.flat_number || "",
                wing_name: r.wing_name || "",
                floor_name: r.floor_name || "",
                flat_type_name: r.flat_type_name || "",
                owner_name: r.owner_name || "",
            }));

            // Filter rentals by wing_id (now included in API response)
            let filteredData = rawData;
            if (currentUserWingId !== null) {
                filteredData = rawData.filter(rental => {
                    if (!rental) return false;
                    // Use wing_id directly from rental data (now included in API response)
                    const rentalWingId = rental.wing_id;
                    if (!rentalWingId) {
                        return false;
                    }
                    return Number(rentalWingId) === Number(currentUserWingId);
                });
            }
            
            // Filter by owner_id if user is owner role
            if (isOwnerRole()) {
                filteredData = filterRentalsByCurrentOwner(filteredData);
            }
            
            setRentals(filteredData);
        } catch (err) {
            console.error('Error fetching rentals:', err);
            alert("Error fetching rentals!");
            setRentals([]);
        }
    }, [currentUserWingId]);

    useEffect(() => {
        fetchRentals();
    }, [fetchRentals]);

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
            
            // Validate that the flat belongs to the current user's wing
            if (currentUserWingId !== null) {
                const flatWingId = flat.wing_id;
                if (!flatWingId || Number(flatWingId) !== Number(currentUserWingId)) {
                    alert(`This flat number belongs to a different wing. You can only add rentals for flats in your wing (Wing ID: ${currentUserWingId}).`);
                    // Clear the form data
                    setFormData((prev) => ({
                        ...prev,
                        wing_id: "",
                        wing_name: "",
                        floor_name: "",
                        flat_type_name: "",
                        owner_name: "",
                        owner_id: "",
                    }));
                    return;
                }
            }
            
            setFormData((prev) => ({
                ...prev,
                wing_id: flat.wing_id || "",
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

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
            if (!validTypes.includes(file.type)) {
                alert('Please select a PDF or JPEG/PNG image file.');
                e.target.value = '';
                return;
            }

            // Validate file size (10MB)
            if (file.size > 10 * 1024 * 1024) {
                alert('File size should be less than 10MB.');
                e.target.value = '';
                return;
            }

            setSelectedFile(file);

            // Create preview for images
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setFilePreview(reader.result);
                };
                reader.readAsDataURL(file);
            } else {
                setFilePreview(null);
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.owner_id) return alert("Fetch flat details first!");
        
        // Validate that the flat belongs to the current user's wing before saving
        if (currentUserWingId !== null) {
            const flatWingId = formData.wing_id;
            if (!flatWingId || Number(flatWingId) !== Number(currentUserWingId)) {
                alert(`You can only save rentals for flats in your wing. This flat belongs to a different wing.`);
                return;
            }
        }
        
        setSubmitting(true);
        try {
            const payload = {
                flat_no: formData.flat_no,
                tenant_name: formData.tenant_name,
                tenant_contactno: formData.tenant_contactno,
                tenant_altercontactno: formData.tenant_altercontactno,
                tenant_email: formData.tenant_email,
                tenant_agrimg: formData.tenant_agrimg || null,
                start_date: formData.start_date,
                end_date: formData.end_date,
                monthly_rent: formData.monthly_rent,
                deposite: formData.deposite,
            };

            if (editing && formData.rental_id) {
                await updateRental(formData.rental_id, payload, selectedFile);
                alert("Rental updated successfully!");
            } else {
                await addRental(payload, selectedFile);
                alert("Rental added successfully!");
            }

            // Handle parking details (using owner_id from rental)
            if (formData.owner_id) {
                if (editing) {
                    // In edit mode: update existing or add new parking
                    const existingParkingIds = existingParking.map(p => p.parking_id);
                    const updatedParkingIds = parkingDetails
                        .filter(p => p.parking_id)
                        .map(p => p.parking_id);

                    // Delete parking that was removed
                    for (const existing of existingParking) {
                        if (!updatedParkingIds.includes(existing.parking_id)) {
                            try {
                                await deleteParking(existing.parking_id, "Removed from rental form");
                            } catch (err) {
                                console.error("Error deleting parking:", err);
                            }
                        }
                    }

                    // Update or add parking
                    for (let i = 0; i < parkingDetails.length; i++) {
                        const parking = parkingDetails[i];
                        if (parking.vehical_type && parking.vehical_no) {
                            const parkingFile = parkingFiles[i] || null;
                            if (parking.parking_id && existingParkingIds.includes(parking.parking_id)) {
                                // Update existing parking
                                await updateParking(parking.parking_id, {
                                    vehical_type: parking.vehical_type,
                                    vehical_no: parking.vehical_no,
                                    parking_slot_no: parking.parking_slot_no || "",
                                    remark: parking.remark || "",
                                    attachment_url: parking.attachment_url || null,
                                }, parkingFile);
                            } else {
                                // Add new parking
                                await addParking({
                                    owner_id: formData.owner_id,
                                    vehical_type: parking.vehical_type,
                                    vehical_no: parking.vehical_no,
                                    parking_slot_no: parking.parking_slot_no || "",
                                    remark: parking.remark || "",
                                }, parkingFile);
                            }
                        }
                    }
                } else {
                    // In add mode: just add new parking
                    for (let i = 0; i < parkingDetails.length; i++) {
                        const parking = parkingDetails[i];
                        if (parking.vehical_type && parking.vehical_no) {
                            const parkingFile = parkingFiles[i] || null;
                            await addParking({
                                owner_id: formData.owner_id,
                                vehical_type: parking.vehical_type,
                                vehical_no: parking.vehical_no,
                                parking_slot_no: parking.parking_slot_no || "",
                                remark: parking.remark || "",
                            }, parkingFile);
                        }
                    }
                }
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

    const handleEdit = async (rental) => {
        setFormData({
            rental_id: rental.rental_id,
            flat_no: rental.flat_no,
            wing_id: rental.wing_id || "",
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
            tenant_agrimg: rental.tenant_agrimg || null,
        });
        setSelectedFile(null);
        setFilePreview(rental.tenant_agrimg && rental.tenant_agrimg.startsWith('http') ? rental.tenant_agrimg : null);
        setEditing(true);

        // Load existing parking details for this owner (rental uses owner_id)
        if (rental.owner_id) {
            try {
                const parkingRes = await getParking();
                const allParking = parkingRes.data || [];
                const ownerParking = allParking.filter(p => p.owner_id === rental.owner_id && !p.is_deleted);
                setExistingParking(ownerParking);
                const parkingData = ownerParking.map(p => ({
                    parking_id: p.parking_id,
                    vehical_type: p.vehical_type || "",
                    vehical_no: p.vehical_no || "",
                    parking_slot_no: p.parking_slot_no || "",
                    remark: p.remark || "",
                    attachment_url: p.attachment_url || null,
                }));
                setParkingDetails(parkingData);
                // Initialize parking file states
                setParkingFiles(new Array(parkingData.length).fill(null));
                setParkingFilePreviews(parkingData.map(p => 
                    p.attachment_url && p.attachment_url.startsWith('http') ? p.attachment_url : null
                ));
            } catch (err) {
                console.error("Error loading parking details:", err);
                setExistingParking([]);
                setParkingDetails([]);
                setParkingFiles([]);
                setParkingFilePreviews([]);
            }
        } else {
            setExistingParking([]);
            setParkingDetails([]);
            setParkingFiles([]);
            setParkingFilePreviews([]);
        }

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
            wing_id: "",
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
            tenant_agrimg: null,
        });
        setSelectedFile(null);
        setFilePreview(null);
        setParkingDetails([]);
        setExistingParking([]);
        setParkingFiles([]);
        setParkingFilePreviews([]);
        setEditing(false);
    };

    const filteredRentals = rentals.filter(
        (r) =>
            r.flat_no?.toLowerCase().includes(searchText.toLowerCase()) ||
            r.tenant_name?.toLowerCase().includes(searchText.toLowerCase())
    );

    // Pagination logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentRentals = filteredRentals.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredRentals.length / itemsPerPage);

    // Reset to page 1 when search changes
    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchText]);

    // Parking detail management functions
    const handleAddParking = () => {
        setParkingDetails([...parkingDetails, {
            vehical_type: "",
            vehical_no: "",
            parking_slot_no: "",
            remark: "",
            attachment_url: null,
        }]);
        setParkingFiles([...parkingFiles, null]);
        setParkingFilePreviews([...parkingFilePreviews, null]);
    };

    const handleRemoveParking = (index) => {
        const updated = parkingDetails.filter((_, i) => i !== index);
        setParkingDetails(updated);
        const updatedFiles = parkingFiles.filter((_, i) => i !== index);
        setParkingFiles(updatedFiles);
        const updatedPreviews = parkingFilePreviews.filter((_, i) => i !== index);
        setParkingFilePreviews(updatedPreviews);
    };

    const handleParkingChange = (index, field, value) => {
        const updated = [...parkingDetails];
        updated[index] = {
            ...updated[index],
            [field]: value,
        };
        setParkingDetails(updated);
    };

    const handleParkingFileChange = (index, e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
            if (!validTypes.includes(file.type)) {
                alert('Please select a PDF or JPEG/PNG image file.');
                e.target.value = '';
                return;
            }

            // Validate file size (10MB)
            if (file.size > 10 * 1024 * 1024) {
                alert('File size should be less than 10MB.');
                e.target.value = '';
                return;
            }

            const updatedFiles = [...parkingFiles];
            updatedFiles[index] = file;
            setParkingFiles(updatedFiles);

            // Create preview for images
            const updatedPreviews = [...parkingFilePreviews];
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    updatedPreviews[index] = reader.result;
                    setParkingFilePreviews([...updatedPreviews]);
                };
                reader.readAsDataURL(file);
            } else {
                updatedPreviews[index] = null;
                setParkingFilePreviews(updatedPreviews);
            }
        }
    };

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
                    {canEdit() && (
                        <button className="new-entry-btn" onClick={handleNewEntry}>New Entry</button>
                    )}
                    <div className="search-bar">
                        <input
                            type="text"
                            placeholder="Search by Flat No / Tenant Name"
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                        />
                    </div>
                </div>
            )}

            {!showForm && (
                <>
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
                                <th>Agreement</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRentals.length ? (
                                currentRentals.map((rental) => (
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
                                            {rental.tenant_agrimg ? (
                                                <a
                                                    href={rental.tenant_agrimg}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{ color: '#007bff', textDecoration: 'none' }}
                                                >
                                                    {rental.tenant_agrimg.endsWith('.pdf') || rental.tenant_agrimg.includes('pdf') ? '📄 View PDF' : '🖼️ View Image'}
                                                </a>
                                            ) : (
                                                <span style={{ color: '#999' }}>No document</span>
                                            )}
                                        </td>
                                        <td>
                                            {canEdit() && (
                                                <button onClick={() => handleEdit(rental)}>Edit</button>
                                            )}
                                            {canDelete() && (
                                                <button
                                                    className="delete-btn"
                                                    onClick={() => confirmDelete(rental)}
                                                >
                                                    Delete
                                                </button>
                                            )}
                                            {isOwnerRole() && (
                                                <span style={{ color: '#999', fontSize: '12px' }}>View Only</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="11">No rentals found</td>
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
                            <div className="form-field">
                                <label>Wing:</label>
                                <input type="text" value={formData.wing_name} readOnly />
                            </div>
                            <div className="form-field">
                                <label>Floor:</label>
                                <input type="text" value={formData.floor_name} readOnly />
                            </div>
                            <div className="form-field">
                                <label>Flat Type:</label>
                                <input type="text" value={formData.flat_type_name} readOnly />
                            </div>
                            <div className="form-field">
                                <label>Owner Name:</label>
                                <input type="text" value={formData.owner_name} readOnly />
                            </div>
                        </div>
                        <h3>Tenant Details</h3> <br />
                        <div className="form-field">
                            <label>Tenant Name:</label>
                            <input type="text" name="tenant_name" value={formData.tenant_name} onChange={handleChange} required />
                        </div>
                        <div className="form-field">
                            <label>Contact No:</label>
                            <input type="text" name="tenant_contactno" value={formData.tenant_contactno} onChange={handleChange} required />
                        </div>
                        <div className="form-field">
                            <label>Alternate Contact:</label>
                            <input type="text" name="tenant_altercontactno" value={formData.tenant_altercontactno} onChange={handleChange} />
                        </div>
                        <div className="form-field">
                            <label>Email:</label>
                            <input type="email" name="tenant_email" value={formData.tenant_email} onChange={handleChange} />
                        </div>
                        <div className="form-field">
                            <label>Start Date:</label>
                            <input type="date" name="start_date" value={formData.start_date} onChange={handleChange} />
                        </div>
                        <div className="form-field">
                            <label>End Date:</label>
                            <input type="date" name="end_date" value={formData.end_date} onChange={handleChange} />
                        </div>
                        <div className="form-field">
                            <label>Monthly Rent:</label>
                            <input type="number" name="monthly_rent" value={formData.monthly_rent} onChange={handleChange} />
                        </div>
                        <div className="form-field">
                            <label>Deposit:</label>
                            <input type="number" name="deposite" value={formData.deposite} onChange={handleChange} />
                        </div>
                        <div className="form-field">
                            <label>Rental Agreement Document (PDF/JPEG):</label>
                            <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={handleFileChange}
                            />
                            {selectedFile && (
                                <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                                    Selected: {selectedFile.name}
                                </p>
                            )}
                            {filePreview && !selectedFile && formData.tenant_agrimg && (
                                <div style={{ marginTop: '10px' }}>
                                    <p style={{ fontSize: '12px', color: '#666' }}>Current document:</p>
                                    {formData.tenant_agrimg.endsWith('.pdf') || formData.tenant_agrimg.includes('application/pdf') ? (
                                        <a href={formData.tenant_agrimg} target="_blank" rel="noopener noreferrer" style={{ color: '#007bff' }}>
                                            View PDF
                                        </a>
                                    ) : (
                                        <img src={formData.tenant_agrimg} alt="Rental Agreement" style={{ maxWidth: '200px', maxHeight: '200px', marginTop: '5px' }} />
                                    )}
                                </div>
                            )}
                            {filePreview && selectedFile && (
                                <div style={{ marginTop: '10px' }}>
                                    <p style={{ fontSize: '12px', color: '#666' }}>Preview:</p>
                                    {selectedFile.type === 'application/pdf' ? (
                                        <p style={{ color: '#007bff' }}>PDF file selected</p>
                                    ) : (
                                        <img src={filePreview} alt="Preview" style={{ maxWidth: '200px', maxHeight: '200px', marginTop: '5px' }} />
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Parking Detail Section */}
                        <div className="form-section-divider">
                            <h3>Parking Details</h3>
                        </div>

                        {parkingDetails.map((parking, index) => (
                            <div key={index} className="parking-detail-row">
                                <div className="form-field">
                                    <label>Vehicle Type</label>
                                    <select
                                        value={parking.vehical_type || ""}
                                        onChange={(e) => handleParkingChange(index, "vehical_type", e.target.value)}
                                    >
                                        <option value="">Select Vehicle Type</option>
                                        <option value="Car">Car</option>
                                        <option value="Bike">Bike</option>
                                        <option value="Scooter">Scooter</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>

                                <div className="form-field">
                                    <label>Vehicle Number</label>
                                    <input
                                        type="text"
                                        value={parking.vehical_no || ""}
                                        onChange={(e) => handleParkingChange(index, "vehical_no", e.target.value)}
                                        placeholder="Enter vehicle number"
                                    />
                                </div>

                                <div className="form-field">
                                    <label>Parking Slot Number</label>
                                    <input
                                        type="text"
                                        value={parking.parking_slot_no || ""}
                                        onChange={(e) => handleParkingChange(index, "parking_slot_no", e.target.value)}
                                        placeholder="Enter parking slot number"
                                    />
                                </div>

                                <div className="form-field">
                                    <label>Remark</label>
                                    <input
                                        type="text"
                                        value={parking.remark || ""}
                                        onChange={(e) => handleParkingChange(index, "remark", e.target.value)}
                                        placeholder="Optional remark"
                                    />
                                </div>

                                <div className="form-field">
                                    <label>Attachment (PDF/JPEG):</label>
                                    <input
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={(e) => handleParkingFileChange(index, e)}
                                    />
                                    {parkingFiles[index] && (
                                        <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                                            Selected: {parkingFiles[index].name}
                                        </p>
                                    )}
                                    {parkingFilePreviews[index] && !parkingFiles[index] && parking.attachment_url && (
                                        <div style={{ marginTop: '10px' }}>
                                            <p style={{ fontSize: '12px', color: '#666' }}>Current document:</p>
                                            {parking.attachment_url.endsWith('.pdf') || parking.attachment_url.includes('pdf') ? (
                                                <a href={parking.attachment_url} target="_blank" rel="noopener noreferrer" style={{ color: '#007bff' }}>
                                                    View PDF
                                                </a>
                                            ) : (
                                                <img src={parking.attachment_url} alt="Attachment" style={{ maxWidth: '200px', maxHeight: '200px', marginTop: '5px' }} />
                                            )}
                                        </div>
                                    )}
                                    {parkingFilePreviews[index] && parkingFiles[index] && (
                                        <div style={{ marginTop: '10px' }}>
                                            <p style={{ fontSize: '12px', color: '#666' }}>Preview:</p>
                                            {parkingFiles[index].type === 'application/pdf' ? (
                                                <p style={{ color: '#007bff' }}>PDF file selected</p>
                                            ) : (
                                                <img src={parkingFilePreviews[index]} alt="Preview" style={{ maxWidth: '200px', maxHeight: '200px', marginTop: '5px' }} />
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="form-field">
                                    <label>&nbsp;</label>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveParking(index)}
                                        className="remove-btn"
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        ))}

                        <div className="form-field">
                            <button
                                type="button"
                                onClick={handleAddParking}
                                className="add-parking-btn"
                            >
                                + Add Parking Detail
                            </button>
                        </div>

                        <div className="button-group">
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