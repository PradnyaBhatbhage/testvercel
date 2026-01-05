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
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [filePreviews, setFilePreviews] = useState([]);
    const [showDocumentModal, setShowDocumentModal] = useState(false);
    const [modalDocuments, setModalDocuments] = useState([]);
    const [modalTenantName, setModalTenantName] = useState("");
    const [modalRentalId, setModalRentalId] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Parking details state
    const [parkingDetails, setParkingDetails] = useState([]);
    const [existingParking, setExistingParking] = useState([]);
    // Parking attachment states (arrays of arrays: [[file1, file2], [file1]] for multiple files per parking entry)
    const [parkingFiles, setParkingFiles] = useState([]); // Array of arrays: [[file1, file2], [file1]]
    const [parkingFilePreviews, setParkingFilePreviews] = useState([]); // Array of arrays

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
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const validFiles = [];
        for (const file of files) {
            // Validate file type
            const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
            if (!validTypes.includes(file.type)) {
                alert(`File "${file.name}" is not a valid PDF or JPEG/PNG image file. Skipping.`);
                continue;
            }

            // Validate file size (10MB)
            if (file.size > 10 * 1024 * 1024) {
                alert(`File "${file.name}" is larger than 10MB. Skipping.`);
                continue;
            }

            validFiles.push(file);
        }

        if (validFiles.length > 0) {
            // Append new files to existing selectedFiles
            setSelectedFiles(prev => [...prev, ...validFiles]);
            // Reset file input to allow selecting more files
            e.target.value = '';
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
                await updateRental(formData.rental_id, payload, selectedFiles.length > 0 ? selectedFiles : null);
                alert("Rental updated successfully!");
            } else {
                await addRental(payload, selectedFiles.length > 0 ? selectedFiles : null);
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
                            const parkingFilesArray = parkingFiles[i] || [];
                            if (parking.parking_id && existingParkingIds.includes(parking.parking_id)) {
                                // Update existing parking (always keep as Rental in Rental Detail form)
                                await updateParking(parking.parking_id, {
                                    vehical_type: parking.vehical_type,
                                    vehical_no: parking.vehical_no,
                                    parking_slot_no: parking.parking_slot_no || "",
                                    remark: parking.remark || "",
                                    ownership_type: "Rental", // Always Rental in Rental Detail form
                                    attachment_url: parking.attachment_url || null,
                                }, parkingFilesArray.length > 0 ? parkingFilesArray : null);
                            } else {
                                // Add new parking (always Rental in Rental Detail form)
                                await addParking({
                                    owner_id: formData.owner_id,
                                    vehical_type: parking.vehical_type,
                                    vehical_no: parking.vehical_no,
                                    parking_slot_no: parking.parking_slot_no || "",
                                    remark: parking.remark || "",
                                    ownership_type: "Rental", // Always Rental in Rental Detail form
                                }, parkingFilesArray.length > 0 ? parkingFilesArray : null);
                            }
                        }
                    }
                } else {
                    // In add mode: just add new parking (always Rental in Rental Detail form)
                    for (let i = 0; i < parkingDetails.length; i++) {
                        const parking = parkingDetails[i];
                        if (parking.vehical_type && parking.vehical_no) {
                            const parkingFilesArray = parkingFiles[i] || [];
                            await addParking({
                                owner_id: formData.owner_id,
                                vehical_type: parking.vehical_type,
                                vehical_no: parking.vehical_no,
                                parking_slot_no: parking.parking_slot_no || "",
                                remark: parking.remark || "",
                                ownership_type: "Rental", // Always Rental in Rental Detail form
                            }, parkingFilesArray.length > 0 ? parkingFilesArray : null);
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
        setSelectedFiles([]);
        // Helper function to clean and validate URLs (same as in table rendering)
        const cleanAndValidateUrls = (urlString) => {
            if (!urlString || typeof urlString !== 'string') return [];

            // Split by comma, semicolon, or newline (common delimiters)
            const potentialUrls = urlString.split(/[,;\n\r]+/).map(u => u.trim()).filter(u => u.length > 0);

            const validUrls = [];
            for (const url of potentialUrls) {
                // Skip if it's not a valid HTTP/HTTPS URL
                if (!url.startsWith('http://') && !url.startsWith('https://')) {
                    continue;
                }

                // Validate URL format
                try {
                    const urlObj = new URL(url);
                    // Only accept storage.googleapis.com or other valid domains
                    if (urlObj.protocol === 'http:' || urlObj.protocol === 'https:') {
                        // Additional validation: must be at least 10 chars and not a base64-like string
                        if (url.length >= 10 && (!url.match(/^[A-Za-z0-9+/=]+$/g) || url.length >= 50)) {
                            validUrls.push(url);
                        }
                    }
                } catch (e) {
                    // Invalid URL format, skip it
                    continue;
                }
            }

            return validUrls;
        };

        // Handle both single URL string and array of URLs
        if (rental.tenant_agrimg) {
            let urls = [];
            if (Array.isArray(rental.tenant_agrimg)) {
                // Process each URL in the array
                for (const url of rental.tenant_agrimg) {
                    const cleaned = cleanAndValidateUrls(url);
                    urls.push(...cleaned);
                }
            } else if (typeof rental.tenant_agrimg === 'string') {
                try {
                    // Try to parse as JSON first
                    const parsed = JSON.parse(rental.tenant_agrimg);
                    if (Array.isArray(parsed)) {
                        // Process each URL in the parsed array
                        for (const url of parsed) {
                            const cleaned = cleanAndValidateUrls(url);
                            urls.push(...cleaned);
                        }
                    } else if (parsed && typeof parsed === 'string') {
                        // Single URL in JSON
                        const cleaned = cleanAndValidateUrls(parsed);
                        urls.push(...cleaned);
                    }
                } catch (e) {
                    // Not JSON, treat as plain string (might contain multiple URLs)
                    const cleaned = cleanAndValidateUrls(rental.tenant_agrimg);
                    urls.push(...cleaned);
                }
            }
            // Remove duplicates
            urls = [...new Set(urls)];
            setFilePreviews(urls);
        } else {
            setFilePreviews([]);
        }
        setEditing(true);

        // Load existing parking details for this owner (rental uses owner_id)
        // Only load parking with ownership_type = "Rental" to keep owner and rental parking separate
        if (rental.owner_id) {
            try {
                const parkingRes = await getParking();
                const allParking = parkingRes.data || [];
                // Only load rental parking (ownership_type = "Rental" or NULL/empty for backward compatibility)
                const rentalParking = allParking.filter(p => {
                    if (p.owner_id !== rental.owner_id || p.is_deleted) return false;
                    const ownershipType = p.ownership_type ? String(p.ownership_type).trim() : "";
                    // Include rental parking or parking without ownership_type (for backward compatibility)
                    return ownershipType === "Rental" || ownershipType === "";
                });
                setExistingParking(rentalParking);
                const parkingData = rentalParking.map(p => ({
                    parking_id: p.parking_id,
                    vehical_type: p.vehical_type || "",
                    vehical_no: p.vehical_no || "",
                    parking_slot_no: p.parking_slot_no || "",
                    remark: p.remark || "",
                    ownership_type: "Rental", // Always set to Rental in Rental Detail form
                    attachment_url: p.attachment_url || null,
                }));
                setParkingDetails(parkingData);
                // Initialize parking file states - support multiple files per parking entry
                setParkingFiles(new Array(parkingData.length).fill([]));
                setParkingFilePreviews(parkingData.map(p => {
                    if (p.attachment_url) {
                        let urls = [];
                        if (Array.isArray(p.attachment_url)) {
                            urls = p.attachment_url.filter(url => {
                                if (!url || typeof url !== 'string') return false;
                                if (!url.startsWith('http') && !url.startsWith('https')) return false;
                                if (url.length < 10) return false;
                                if (url.match(/^[A-Za-z0-9+/=]+$/g) && url.length < 50) return false;
                                return true;
                            });
                        } else if (typeof p.attachment_url === 'string') {
                            try {
                                const parsed = JSON.parse(p.attachment_url);
                                if (Array.isArray(parsed)) {
                                    urls = parsed.filter(url => {
                                        if (!url || typeof url !== 'string') return false;
                                        if (!url.startsWith('http') && !url.startsWith('https')) return false;
                                        if (url.length < 10) return false;
                                        if (url.match(/^[A-Za-z0-9+/=]+$/g) && url.length < 50) return false;
                                        return true;
                                    });
                                } else if (parsed && typeof parsed === 'string' && (parsed.startsWith('http') || parsed.startsWith('https')) && parsed.length >= 10) {
                                    if (!parsed.match(/^[A-Za-z0-9+/=]+$/g) || parsed.length >= 50) {
                                        urls = [parsed];
                                    }
                                }
                            } catch (e) {
                                if (p.attachment_url.startsWith('http') || p.attachment_url.startsWith('https')) {
                                    if (p.attachment_url.length >= 10 && (!p.attachment_url.match(/^[A-Za-z0-9+/=]+$/g) || p.attachment_url.length >= 50)) {
                                        urls = [p.attachment_url];
                                    }
                                }
                            }
                        }
                        return urls;
                    }
                    return [];
                }));
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
        setSelectedFiles([]);
        setFilePreviews([]);
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
            ownership_type: "Rental", // Default to Rental since this is in Rental Detail form
            attachment_url: null,
        }]);
        setParkingFiles([...parkingFiles, []]); // Initialize with empty array for multiple files
        setParkingFilePreviews([...parkingFilePreviews, []]); // Initialize with empty array
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
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const validFiles = [];
        for (const file of files) {
            // Validate file type
            const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
            if (!validTypes.includes(file.type)) {
                alert(`File "${file.name}" is not a valid PDF or JPEG/PNG image file. Skipping.`);
                continue;
            }

            // Validate file size (10MB)
            if (file.size > 10 * 1024 * 1024) {
                alert(`File "${file.name}" is larger than 10MB. Skipping.`);
                continue;
            }

            validFiles.push(file);
        }

        if (validFiles.length > 0) {
            // Append new files to existing parkingFiles[index] array
            const updatedFiles = [...parkingFiles];
            if (!updatedFiles[index]) {
                updatedFiles[index] = [];
            }
            updatedFiles[index] = [...updatedFiles[index], ...validFiles];
            setParkingFiles(updatedFiles);
            // Reset file input to allow selecting more files
            e.target.value = '';
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
            <h2>Tenant Details</h2>

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
                                <th>Sr. No.</th>
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
                                currentRentals.map((rental, index) => (
                                    <tr key={rental.rental_id}>
                                        <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
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
                                            {(() => {
                                                // Helper function to clean and validate URLs
                                                const cleanAndValidateUrls = (urlString) => {
                                                    if (!urlString || typeof urlString !== 'string') return [];

                                                    // Split by comma, semicolon, or newline (common delimiters)
                                                    const potentialUrls = urlString.split(/[,;\n\r]+/).map(u => u.trim()).filter(u => u.length > 0);

                                                    const validUrls = [];
                                                    for (const url of potentialUrls) {
                                                        // Skip if it's not a valid HTTP/HTTPS URL
                                                        if (!url.startsWith('http://') && !url.startsWith('https://')) {
                                                            continue;
                                                        }

                                                        // Validate URL format
                                                        try {
                                                            const urlObj = new URL(url);
                                                            // Only accept storage.googleapis.com or other valid domains
                                                            if (urlObj.protocol === 'http:' || urlObj.protocol === 'https:') {
                                                                // Additional validation: must be at least 10 chars and not a base64-like string
                                                                if (url.length >= 10 && (!url.match(/^[A-Za-z0-9+/=]+$/g) || url.length >= 50)) {
                                                                    validUrls.push(url);
                                                                }
                                                            }
                                                        } catch (e) {
                                                            // Invalid URL format, skip it
                                                            continue;
                                                        }
                                                    }

                                                    return validUrls;
                                                };

                                                let attachmentUrls = [];

                                                if (rental.tenant_agrimg) {
                                                    if (Array.isArray(rental.tenant_agrimg)) {
                                                        // Process each URL in the array
                                                        for (const url of rental.tenant_agrimg) {
                                                            const cleaned = cleanAndValidateUrls(url);
                                                            attachmentUrls.push(...cleaned);
                                                        }
                                                    } else if (typeof rental.tenant_agrimg === 'string') {
                                                        try {
                                                            // Try to parse as JSON first
                                                            const parsed = JSON.parse(rental.tenant_agrimg);
                                                            if (Array.isArray(parsed)) {
                                                                // Process each URL in the parsed array
                                                                for (const url of parsed) {
                                                                    const cleaned = cleanAndValidateUrls(url);
                                                                    attachmentUrls.push(...cleaned);
                                                                }
                                                            } else if (parsed && typeof parsed === 'string') {
                                                                // Single URL in JSON
                                                                const cleaned = cleanAndValidateUrls(parsed);
                                                                attachmentUrls.push(...cleaned);
                                                            }
                                                        } catch (e) {
                                                            // Not JSON, treat as plain string (might contain multiple URLs)
                                                            const cleaned = cleanAndValidateUrls(rental.tenant_agrimg);
                                                            attachmentUrls.push(...cleaned);
                                                        }
                                                    }
                                                }

                                                // Remove duplicates
                                                attachmentUrls = [...new Set(attachmentUrls)];

                                                if (attachmentUrls.length === 0) {
                                                    return <span style={{ color: '#999' }}>No document</span>;
                                                }

                                                // Show "View Documents" link that opens modal
                                                return (
                                                    <a
                                                        href="#"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            setModalDocuments(attachmentUrls);
                                                            setModalTenantName(rental.tenant_name || 'Tenant');
                                                            setModalRentalId(rental.rental_id);
                                                            setShowDocumentModal(true);
                                                        }}
                                                        style={{ color: '#007bff', textDecoration: 'none', cursor: 'pointer', fontWeight: '500' }}
                                                    >
                                                        View Documents ({attachmentUrls.length})
                                                    </a>
                                                );
                                            })()}
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
                                    <td colSpan="12">No rentals found</td>
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
                        <div className="form-field full">
                            <label>Rental Agreement Documents (PDF/JPEG) - Multiple files allowed:</label>
                            <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                multiple
                                onChange={handleFileChange}
                            />
                            {(filePreviews.length > 0 || selectedFiles.length > 0) && (
                                <div style={{ marginTop: '10px' }}>
                                    <p style={{ fontSize: '12px', color: '#666', fontWeight: '600', marginBottom: '8px' }}>
                                        All documents ({filePreviews.length + selectedFiles.length}):
                                    </p>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', border: '1px solid #ddd' }}>
                                        <thead>
                                            <tr style={{ background: '#f5f5f5' }}>
                                                <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>Sr. No.</th>
                                                <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>File Name</th>
                                                <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>Type</th>
                                                <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>Status</th>
                                                <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {/* Show existing documents first */}
                                            {filePreviews.length > 0 && filePreviews.map((preview, idx) => {
                                                if (!preview) return null;

                                                // Validate URL - skip invalid URLs
                                                if (typeof preview !== 'string' || preview.length < 10) return null;
                                                if (!preview.startsWith('http') && !preview.startsWith('https')) return null;
                                                if (preview.match(/^[A-Za-z0-9+/=]+$/g) && preview.length < 50) return null;

                                                // Extract file name from URL
                                                let fileName = `Document ${idx + 1}`;
                                                try {
                                                    const url = new URL(preview);
                                                    const pathParts = url.pathname.split('/').filter(part => part && part.length > 0);
                                                    if (pathParts.length > 0) {
                                                        fileName = pathParts[pathParts.length - 1];
                                                        try {
                                                            fileName = decodeURIComponent(fileName);
                                                        } catch (decodeErr) { }
                                                        fileName = fileName.split('?')[0].split('#')[0];
                                                        if (!fileName || fileName.length < 3 || (fileName.match(/^[A-Za-z0-9+/=]+$/g) && fileName.length < 10)) {
                                                            fileName = `Document ${idx + 1}`;
                                                        }
                                                    }
                                                } catch (e) {
                                                    try {
                                                        const parts = preview.split('/').filter(part => part && part.length > 0);
                                                        if (parts.length > 0) {
                                                            fileName = parts[parts.length - 1].split('?')[0].split('#')[0];
                                                            try {
                                                                fileName = decodeURIComponent(fileName);
                                                            } catch (decodeErr) { }
                                                            if (!fileName || fileName.length < 3 || (fileName.match(/^[A-Za-z0-9+/=]+$/g) && fileName.length < 10)) {
                                                                fileName = `Document ${idx + 1}`;
                                                            }
                                                        }
                                                    } catch (splitErr) {
                                                        fileName = `Document ${idx + 1}`;
                                                    }
                                                }

                                                const lowerFileName = fileName.toLowerCase();
                                                const lowerUrl = preview.toLowerCase();
                                                const isPDF = lowerFileName.endsWith('.pdf') || lowerUrl.includes('pdf');
                                                const isImage = lowerFileName.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i) || lowerUrl.includes('image/');
                                                const fileType = isPDF ? 'PDF' : (isImage ? 'Image' : 'Document');

                                                return (
                                                    <tr key={`existing-${idx}`}>
                                                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{idx + 1}</td>
                                                        <td style={{ padding: '8px', border: '1px solid #ddd', wordBreak: 'break-word', maxWidth: '200px' }} title={fileName}>
                                                            {fileName}
                                                        </td>
                                                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{fileType}</td>
                                                        <td style={{ padding: '8px', border: '1px solid #ddd', color: '#28a745', fontWeight: '500' }}>Saved</td>
                                                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                                <a
                                                                    href={preview}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    style={{ color: '#007bff', textDecoration: 'none', fontWeight: '500' }}
                                                                >
                                                                    View
                                                                </a>
                                                                <button
                                                                    onClick={() => {
                                                                        if (!window.confirm('Are you sure you want to delete this document?')) {
                                                                            return;
                                                                        }
                                                                        // Remove from filePreviews
                                                                        const updatedPreviews = filePreviews.filter((p, i) => i !== idx);
                                                                        setFilePreviews(updatedPreviews);

                                                                        // Update formData.tenant_agrimg to reflect the change
                                                                        const updatedUrlsJson = updatedPreviews.length > 0 ? JSON.stringify(updatedPreviews) : null;
                                                                        setFormData(prev => ({
                                                                            ...prev,
                                                                            tenant_agrimg: updatedUrlsJson
                                                                        }));
                                                                    }}
                                                                    style={{
                                                                        background: '#dc3545',
                                                                        color: 'white',
                                                                        border: 'none',
                                                                        padding: '4px 8px',
                                                                        borderRadius: '4px',
                                                                        cursor: 'pointer',
                                                                        fontWeight: '500',
                                                                        fontSize: '11px'
                                                                    }}
                                                                >
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {/* Show newly selected files */}
                                            {selectedFiles.map((file, idx) => (
                                                <tr key={`new-${idx}`}>
                                                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{filePreviews.length + idx + 1}</td>
                                                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{file.name}</td>
                                                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{file.type === 'application/pdf' ? 'PDF' : 'Image'}</td>
                                                    <td style={{ padding: '8px', border: '1px solid #ddd', color: '#ffc107' }}>New</td>
                                                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const updated = selectedFiles.filter((_, i) => i !== idx);
                                                                setSelectedFiles(updated);
                                                            }}
                                                            style={{
                                                                background: '#dc3545',
                                                                color: 'white',
                                                                border: 'none',
                                                                padding: '4px 8px',
                                                                borderRadius: '4px',
                                                                cursor: 'pointer',
                                                                fontSize: '11px'
                                                            }}
                                                        >
                                                            Remove
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
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

                                {/* Ownership Type is always "Rental" for parking managed from Rental Detail form */}
                                <input type="hidden" value="Rental" />

                                <div className="form-field">
                                    <label>Remark</label>
                                    <input
                                        type="text"
                                        value={parking.remark || ""}
                                        onChange={(e) => handleParkingChange(index, "remark", e.target.value)}
                                        placeholder="Optional remark"
                                    />
                                </div>

                                <div className="form-field full">
                                    <label>Attachments (PDF/JPEG) - Multiple files allowed:</label>
                                    <input
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        multiple
                                        onChange={(e) => handleParkingFileChange(index, e)}
                                    />
                                    {((parkingFilePreviews[index] && parkingFilePreviews[index].length > 0) || (parkingFiles[index] && parkingFiles[index].length > 0)) && (
                                        <div style={{ marginTop: '10px' }}>
                                            <p style={{ fontSize: '12px', color: '#666', fontWeight: '600', marginBottom: '8px' }}>
                                                All documents ({(parkingFilePreviews[index]?.length || 0) + (parkingFiles[index]?.length || 0)}):
                                            </p>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', border: '1px solid #ddd' }}>
                                                <thead>
                                                    <tr style={{ background: '#f5f5f5' }}>
                                                        <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>Sr. No.</th>
                                                        <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>File Name</th>
                                                        <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>Type</th>
                                                        <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>Status</th>
                                                        <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {/* Show existing documents first */}
                                                    {parkingFilePreviews[index] && parkingFilePreviews[index].length > 0 && parkingFilePreviews[index].map((preview, idx) => {
                                                        if (!preview) return null;

                                                        // Validate URL - skip invalid URLs
                                                        if (typeof preview !== 'string' || preview.length < 10) return null;
                                                        if (!preview.startsWith('http') && !preview.startsWith('https')) return null;
                                                        if (preview.match(/^[A-Za-z0-9+/=]+$/g) && preview.length < 50) return null;

                                                        // Extract file name from URL
                                                        let fileName = `Document ${idx + 1}`;
                                                        try {
                                                            const url = new URL(preview);
                                                            const pathParts = url.pathname.split('/').filter(part => part && part.length > 0);
                                                            if (pathParts.length > 0) {
                                                                fileName = pathParts[pathParts.length - 1];
                                                                try {
                                                                    fileName = decodeURIComponent(fileName);
                                                                } catch (decodeErr) { }
                                                                fileName = fileName.split('?')[0].split('#')[0];
                                                                if (!fileName || fileName.length < 3 || (fileName.match(/^[A-Za-z0-9+/=]+$/g) && fileName.length < 10)) {
                                                                    fileName = `Document ${idx + 1}`;
                                                                }
                                                            }
                                                        } catch (e) {
                                                            try {
                                                                const parts = preview.split('/').filter(part => part && part.length > 0);
                                                                if (parts.length > 0) {
                                                                    fileName = parts[parts.length - 1].split('?')[0].split('#')[0];
                                                                    try {
                                                                        fileName = decodeURIComponent(fileName);
                                                                    } catch (decodeErr) { }
                                                                    if (!fileName || fileName.length < 3 || (fileName.match(/^[A-Za-z0-9+/=]+$/g) && fileName.length < 10)) {
                                                                        fileName = `Document ${idx + 1}`;
                                                                    }
                                                                }
                                                            } catch (splitErr) {
                                                                fileName = `Document ${idx + 1}`;
                                                            }
                                                        }

                                                        const lowerFileName = fileName.toLowerCase();
                                                        const lowerUrl = preview.toLowerCase();
                                                        const isPDF = lowerFileName.endsWith('.pdf') || lowerUrl.includes('pdf');
                                                        const isImage = lowerFileName.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i) || lowerUrl.includes('image/');
                                                        const fileType = isPDF ? 'PDF' : (isImage ? 'Image' : 'Document');

                                                        return (
                                                            <tr key={`existing-${idx}`}>
                                                                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{idx + 1}</td>
                                                                <td style={{ padding: '8px', border: '1px solid #ddd', wordBreak: 'break-word', maxWidth: '200px' }} title={fileName}>
                                                                    {fileName}
                                                                </td>
                                                                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{fileType}</td>
                                                                <td style={{ padding: '8px', border: '1px solid #ddd', color: '#28a745', fontWeight: '500' }}>Saved</td>
                                                                <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                                                                    <a
                                                                        href={preview}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        style={{ color: '#007bff', textDecoration: 'none', fontWeight: '500' }}
                                                                    >
                                                                        View
                                                                    </a>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                    {/* Show newly selected files */}
                                                    {parkingFiles[index] && parkingFiles[index].length > 0 && parkingFiles[index].map((file, idx) => (
                                                        <tr key={`new-${idx}`}>
                                                            <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                                                                {(parkingFilePreviews[index]?.length || 0) + idx + 1}
                                                            </td>
                                                            <td style={{ padding: '8px', border: '1px solid #ddd' }}>{file.name}</td>
                                                            <td style={{ padding: '8px', border: '1px solid #ddd' }}>{file.type === 'application/pdf' ? 'PDF' : 'Image'}</td>
                                                            <td style={{ padding: '8px', border: '1px solid #ddd', color: '#ffc107' }}>New</td>
                                                            <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const updated = [...parkingFiles];
                                                                        updated[index] = updated[index].filter((_, i) => i !== idx);
                                                                        setParkingFiles(updated);
                                                                    }}
                                                                    style={{
                                                                        background: '#dc3545',
                                                                        color: 'white',
                                                                        border: 'none',
                                                                        padding: '4px 8px',
                                                                        borderRadius: '4px',
                                                                        cursor: 'pointer',
                                                                        fontSize: '11px'
                                                                    }}
                                                                >
                                                                    Remove
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
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

            {/* Document Modal */}
            {showDocumentModal && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 1000
                    }}
                    onClick={() => setShowDocumentModal(false)}
                >
                    <div
                        style={{
                            backgroundColor: 'white',
                            borderRadius: '8px',
                            padding: '20px',
                            maxWidth: '600px',
                            width: '90%',
                            maxHeight: '80vh',
                            overflow: 'auto',
                            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ margin: 0, color: '#333' }}>Documents - {modalTenantName}</h2>
                            <button
                                onClick={() => setShowDocumentModal(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '24px',
                                    cursor: 'pointer',
                                    color: '#666',
                                    padding: '0',
                                    width: '30px',
                                    height: '30px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                ×
                            </button>
                        </div>
                        <div>
                            {modalDocuments.length === 0 ? (
                                <p style={{ color: '#999', textAlign: 'center' }}>No documents available</p>
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                    <thead>
                                        <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Sr. No.</th>
                                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>File Name</th>
                                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Type</th>
                                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {modalDocuments.map((url, idx) => {
                                            // Validate URL before processing
                                            if (!url || typeof url !== 'string' || (!url.startsWith('http://') && !url.startsWith('https://'))) {
                                                return (
                                                    <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                                                        <td style={{ padding: '12px' }}>{idx + 1}</td>
                                                        <td style={{ padding: '12px', wordBreak: 'break-word', maxWidth: '300px', color: '#999' }}>
                                                            Invalid URL
                                                        </td>
                                                        <td style={{ padding: '12px' }}>Error</td>
                                                        <td style={{ padding: '12px', color: '#dc3545' }}>
                                                            Invalid URL format
                                                        </td>
                                                    </tr>
                                                );
                                            }

                                            // Extract file name from URL
                                            let fileName = `Document ${idx + 1}`;
                                            try {
                                                const urlObj = new URL(url);
                                                const pathParts = urlObj.pathname.split('/').filter(part => part && part.length > 0);
                                                if (pathParts.length > 0) {
                                                    fileName = pathParts[pathParts.length - 1];
                                                    try {
                                                        fileName = decodeURIComponent(fileName);
                                                    } catch (e) { }
                                                    fileName = fileName.split('?')[0].split('#')[0];
                                                    if (!fileName || fileName.length < 3 || (fileName.match(/^[A-Za-z0-9+/=]+$/g) && fileName.length < 10)) {
                                                        fileName = `Document ${idx + 1}`;
                                                    }
                                                }
                                            } catch (e) {
                                                try {
                                                    const parts = url.split('/').filter(part => part && part.length > 0);
                                                    if (parts.length > 0) {
                                                        fileName = parts[parts.length - 1].split('?')[0].split('#')[0];
                                                        try {
                                                            fileName = decodeURIComponent(fileName);
                                                        } catch (e) { }
                                                        if (!fileName || fileName.length < 3 || (fileName.match(/^[A-Za-z0-9+/=]+$/g) && fileName.length < 10)) {
                                                            fileName = `Document ${idx + 1}`;
                                                        }
                                                    }
                                                } catch (err) {
                                                    fileName = `Document ${idx + 1}`;
                                                }
                                            }

                                            const lowerFileName = fileName.toLowerCase();
                                            const lowerUrl = url.toLowerCase();
                                            const isPDF = lowerFileName.endsWith('.pdf') || lowerUrl.includes('pdf');
                                            const isImage = lowerFileName.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i) || lowerUrl.includes('image/');
                                            const fileType = isPDF ? 'PDF' : (isImage ? 'Image' : 'Document');

                                            return (
                                                <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                                                    <td style={{ padding: '12px' }}>{idx + 1}</td>
                                                    <td style={{ padding: '12px', wordBreak: 'break-word', maxWidth: '300px' }} title={fileName}>
                                                        {fileName}
                                                    </td>
                                                    <td style={{ padding: '12px' }}>{fileType}</td>
                                                    <td style={{ padding: '12px' }}>
                                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                            <a
                                                                href={url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                style={{
                                                                    color: '#007bff',
                                                                    textDecoration: 'none',
                                                                    fontWeight: '500',
                                                                    padding: '6px 12px',
                                                                    border: '1px solid #007bff',
                                                                    borderRadius: '4px',
                                                                    display: 'inline-block'
                                                                }}
                                                            >
                                                                View
                                                            </a>
                                                            {canEdit() && modalRentalId && (
                                                                <button
                                                                    onClick={async () => {
                                                                        if (!window.confirm('Are you sure you want to delete this document?')) {
                                                                            return;
                                                                        }
                                                                        try {
                                                                            // Find the rental in the rentals array
                                                                            const rental = rentals.find(r => r.rental_id === modalRentalId);
                                                                            if (!rental) {
                                                                                alert('Rental not found. Please refresh the page and try again.');
                                                                                return;
                                                                            }

                                                                            // Remove from modal view
                                                                            const updatedUrls = modalDocuments.filter((u, i) => i !== idx);
                                                                            setModalDocuments(updatedUrls);

                                                                            // Prepare update data with all required fields
                                                                            const updatedUrlsJson = updatedUrls.length > 0 ? JSON.stringify(updatedUrls) : null;

                                                                            // Format dates properly (remove time if present)
                                                                            const formatDate = (dateStr) => {
                                                                                if (!dateStr) return "";
                                                                                if (dateStr.includes('T')) {
                                                                                    return dateStr.split('T')[0];
                                                                                }
                                                                                return dateStr;
                                                                            };

                                                                            const updateData = {
                                                                                tenant_name: rental.tenant_name || "",
                                                                                tenant_contactno: rental.tenant_contactno || "",
                                                                                tenant_altercontactno: rental.tenant_altercontactno || "",
                                                                                tenant_email: rental.tenant_email || "",
                                                                                tenant_agrimg: updatedUrlsJson,
                                                                                start_date: formatDate(rental.start_date),
                                                                                end_date: formatDate(rental.end_date),
                                                                                monthly_rent: rental.monthly_rent || "",
                                                                                deposite: rental.deposite || ""
                                                                            };

                                                                            console.log('🔄 [RentalDetail] Deleting attachment - Update data:', {
                                                                                rental_id: modalRentalId,
                                                                                tenant_agrimg_length: updatedUrlsJson ? updatedUrlsJson.length : 0,
                                                                                updated_urls_count: updatedUrls.length
                                                                            });

                                                                            // Update the rental record
                                                                            const response = await updateRental(modalRentalId, updateData, null);
                                                                            console.log('✅ [RentalDetail] Delete attachment - Response:', response);

                                                                            // Refresh the rentals list
                                                                            await fetchRentals();
                                                                            alert('Document deleted successfully!');
                                                                        } catch (error) {
                                                                            console.error('❌ [RentalDetail] Error deleting document:', {
                                                                                error: error,
                                                                                message: error.message,
                                                                                response: error.response?.data,
                                                                                status: error.response?.status
                                                                            });
                                                                            const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Unknown error occurred';
                                                                            alert(`Error deleting document: ${errorMessage}`);
                                                                        }
                                                                    }}
                                                                    style={{
                                                                        background: '#dc3545',
                                                                        color: 'white',
                                                                        border: 'none',
                                                                        padding: '6px 12px',
                                                                        borderRadius: '4px',
                                                                        cursor: 'pointer',
                                                                        fontWeight: '500',
                                                                        fontSize: '12px'
                                                                    }}
                                                                >
                                                                    Delete
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RentalDetail;