import React, { useState, useEffect } from "react";
import {
    getWings,
    getFloors,
    getFlatTypes,
    getOwners,
    createFlat,
    updateFlat,
    addOwner,
    updateOwner,
    deleteOwner,
    getParking,
    addParking,
    updateParking,
    deleteParking,
} from "../services/api";
import { getCurrentUserWingId, filterOwnersByWing } from "../utils/wingFilter";
import { 
    isOwnerRole, 
    filterOwnersByCurrentOwner, 
    canEdit, 
    canDelete 
} from "../utils/ownerFilter";
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
    const [originalFlatNo, setOriginalFlatNo] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Parking details state
    const [parkingDetails, setParkingDetails] = useState([]);
    const [existingParking, setExistingParking] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [filePreview, setFilePreview] = useState(null);
    // Parking attachment states (arrays to handle multiple parking entries)
    const [parkingFiles, setParkingFiles] = useState([]);
    const [parkingFilePreviews, setParkingFilePreviews] = useState([]);

    // Get current user's wing_id
    const currentUserWingId = getCurrentUserWingId();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            console.log('🔄 [FlatOwner] fetchData - Starting to fetch data...');
            
            const [wingRes, floorRes, flatTypeRes, ownerRes] = await Promise.allSettled([
                getWings(),
                getFloors(),
                getFlatTypes(),
                getOwners(),
            ]);
            
            // Process wings
            if (wingRes.status === 'fulfilled') {
                try {
                    console.log('📊 [FlatOwner] fetchData - Wings API Response:', {
                        status: wingRes.value.status,
                        data: wingRes.value.data,
                        dataType: typeof wingRes.value.data,
                        isArray: Array.isArray(wingRes.value.data)
                    });
                    
                    let allWings = [];
                    if (Array.isArray(wingRes.value.data)) {
                        allWings = wingRes.value.data;
                    } else if (wingRes.value.data && Array.isArray(wingRes.value.data.data)) {
                        allWings = wingRes.value.data.data;
                    } else {
                        console.warn('⚠️ [FlatOwner] fetchData - Wings data is not an array:', wingRes.value.data);
                        allWings = [];
                    }
                    
                    if (currentUserWingId !== null) {
                        const filteredWings = allWings.filter(wing => Number(wing.wing_id) === Number(currentUserWingId));
                        setWings(filteredWings);
                        console.log('✅ [FlatOwner] fetchData - Wings filtered by wing_id:', filteredWings.length);
                    } else {
                        setWings(allWings);
                        console.log('✅ [FlatOwner] fetchData - All wings loaded:', allWings.length);
                    }
                } catch (err) {
                    console.error('❌ [FlatOwner] fetchData - Error processing wings:', err);
                    setWings([]);
                }
            } else {
                console.error('❌ [FlatOwner] fetchData - Wings API failed:', wingRes.reason);
                setWings([]);
            }
            
            // Process floors
            if (floorRes.status === 'fulfilled') {
                try {
                    console.log('📊 [FlatOwner] fetchData - Floors API Response:', {
                        status: floorRes.value.status,
                        data: floorRes.value.data,
                        dataType: typeof floorRes.value.data,
                        isArray: Array.isArray(floorRes.value.data)
                    });
                    
                    let floorsData = [];
                    if (Array.isArray(floorRes.value.data)) {
                        floorsData = floorRes.value.data;
                    } else if (floorRes.value.data && Array.isArray(floorRes.value.data.data)) {
                        floorsData = floorRes.value.data.data;
                    } else {
                        console.warn('⚠️ [FlatOwner] fetchData - Floors data is not an array:', floorRes.value.data);
                        floorsData = [];
                    }
                    
                    setFloors(floorsData);
                    console.log('✅ [FlatOwner] fetchData - Floors loaded:', floorsData.length);
                } catch (err) {
                    console.error('❌ [FlatOwner] fetchData - Error processing floors:', err);
                    setFloors([]);
                }
            } else {
                console.error('❌ [FlatOwner] fetchData - Floors API failed:', floorRes.reason);
                setFloors([]);
            }
            
            // Process flat types
            if (flatTypeRes.status === 'fulfilled') {
                try {
                    console.log('📊 [FlatOwner] fetchData - FlatTypes API Response:', {
                        status: flatTypeRes.value.status,
                        data: flatTypeRes.value.data,
                        dataType: typeof flatTypeRes.value.data,
                        isArray: Array.isArray(flatTypeRes.value.data)
                    });
                    
                    let flatTypesData = [];
                    if (Array.isArray(flatTypeRes.value.data)) {
                        flatTypesData = flatTypeRes.value.data;
                    } else if (flatTypeRes.value.data && Array.isArray(flatTypeRes.value.data.data)) {
                        flatTypesData = flatTypeRes.value.data.data;
                    } else {
                        console.warn('⚠️ [FlatOwner] fetchData - FlatTypes data is not an array:', flatTypeRes.value.data);
                        flatTypesData = [];
                    }
                    
                    setFlatTypes(flatTypesData);
                    console.log('✅ [FlatOwner] fetchData - FlatTypes loaded:', flatTypesData.length);
                } catch (err) {
                    console.error('❌ [FlatOwner] fetchData - Error processing flat types:', err);
                    setFlatTypes([]);
                }
            } else {
                console.error('❌ [FlatOwner] fetchData - FlatTypes API failed:', flatTypeRes.reason);
                setFlatTypes([]);
            }

            // Process owners
            if (ownerRes.status === 'fulfilled') {
                try {
                    console.log('📊 [FlatOwner] fetchData - Owners API Response:', {
                        status: ownerRes.value.status,
                        data: ownerRes.value.data,
                        dataType: typeof ownerRes.value.data,
                        isArray: Array.isArray(ownerRes.value.data)
                    });
                    
                    let rawOwners = [];
                    if (Array.isArray(ownerRes.value.data)) {
                        rawOwners = ownerRes.value.data;
                    } else if (ownerRes.value.data && Array.isArray(ownerRes.value.data.data)) {
                        rawOwners = ownerRes.value.data.data;
                    } else {
                        console.warn('⚠️ [FlatOwner] fetchData - Owners data is not an array:', ownerRes.value.data);
                        rawOwners = [];
                    }
                    
                    if (currentUserWingId !== null) {
                        rawOwners = filterOwnersByWing(rawOwners, currentUserWingId);
                        console.log('✅ [FlatOwner] fetchData - Owners filtered by wing_id:', rawOwners.length);
                    }
                    
                    if (isOwnerRole()) {
                        rawOwners = filterOwnersByCurrentOwner(rawOwners);
                        console.log('✅ [FlatOwner] fetchData - Owners filtered by owner_id:', rawOwners.length);
                    }
                    
                    setOwners(rawOwners);
                    console.log('✅ [FlatOwner] fetchData - Owners loaded:', rawOwners.length);
                } catch (err) {
                    console.error('❌ [FlatOwner] fetchData - Error processing owners:', err);
                    setOwners([]);
                }
            } else {
                console.error('❌ [FlatOwner] fetchData - Owners API failed:', ownerRes.reason);
                setOwners([]);
            }
            
            console.log('✅ [FlatOwner] fetchData - Data fetch completed');
        } catch (err) {
            console.error('❌ [FlatOwner] fetchData - Unexpected error:', {
                message: err.message,
                stack: err.stack,
                name: err.name
            });
            alert("Error loading data. Please refresh the page.");
            setWings([]);
            setFloors([]);
            setFlatTypes([]);
            setOwners([]);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
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
        try {
            console.log('🔄 [FlatOwner] handleSubmit - Starting form submission...', {
                editMode,
                editId,
                formData: { ...formData, owner_adhar_no: '[REDACTED]', owner_pan: '[REDACTED]' }
            });
            
            // Helper function to safely check if string value exists
            const hasValue = (value) => {
                if (value === null || value === undefined) return false;
                return String(value).trim().length > 0;
            };
            
            // Validation
            if (!hasValue(formData.flat_no)) {
                console.error('❌ [FlatOwner] handleSubmit - Validation failed: flat_no is required');
                alert("Flat number is required");
                return;
            }
            
            if (!formData.wing_id) {
                console.error('❌ [FlatOwner] handleSubmit - Validation failed: wing_id is required');
                alert("Please select a wing");
                return;
            }
            
            if (!formData.floor_id) {
                console.error('❌ [FlatOwner] handleSubmit - Validation failed: floor_id is required');
                alert("Please select a floor");
                return;
            }
            
            if (!formData.flat_type_id) {
                console.error('❌ [FlatOwner] handleSubmit - Validation failed: flat_type_id is required');
                alert("Please select a flat type");
                return;
            }
            
            if (!hasValue(formData.owner_name)) {
                console.error('❌ [FlatOwner] handleSubmit - Validation failed: owner_name is required');
                alert("Owner name is required");
                return;
            }
            
            if (!hasValue(formData.owner_contactno)) {
                console.error('❌ [FlatOwner] handleSubmit - Validation failed: owner_contactno is required');
                alert("Contact number is required");
                return;
            }
            
            // Check for duplicate flat number
            const flatNoToCheck = String(formData.flat_no || '').toLowerCase().trim();
            const duplicateOwner = owners.find(
                (owner) =>
                    owner.flat_no &&
                    String(owner.flat_no).toLowerCase().trim() === flatNoToCheck &&
                    (!editMode || owner.flat_id !== formData.flat_id)
            );

            if (duplicateOwner) {
                console.warn('⚠️ [FlatOwner] handleSubmit - Duplicate flat number detected:', formData.flat_no);
                alert(`Flat number "${formData.flat_no}" already exists. Please use a different flat number.`);
                return;
            }

            let flatId;
            let ownerId;

            if (!editMode) {
                // Create Flat first
                console.log('🔄 [FlatOwner] handleSubmit - Creating flat...');
                const flatPayload = {
                    flat_no: String(formData.flat_no || '').trim(),
                    wing_id: formData.wing_id,
                    floor_id: formData.floor_id,
                    flat_type_id: formData.flat_type_id,
                    soc_id: 1,
                };
                
                try {
                    const flatRes = await createFlat(flatPayload);
                    console.log('📊 [FlatOwner] handleSubmit - Flat creation response:', {
                        fullResponse: flatRes,
                        data: flatRes.data,
                        dataKeys: flatRes.data ? Object.keys(flatRes.data) : 'no data',
                        insertId: flatRes.data?.insertId,
                        flat_id: flatRes.data?.flat_id
                    });
                    
                    if (!flatRes || !flatRes.data) {
                        console.error('❌ [FlatOwner] handleSubmit - Invalid response structure:', flatRes);
                        throw new Error('Invalid response from flat creation API');
                    }
                    
                    // Try multiple possible field names
                    flatId = flatRes.data.insertId || 
                             flatRes.data.flat_id || 
                             flatRes.data.id ||
                             flatRes.data.flatId;
                    
                    if (!flatId) {
                        console.error('❌ [FlatOwner] handleSubmit - Flat ID not found in response:', {
                            responseData: flatRes.data,
                            availableKeys: Object.keys(flatRes.data || {})
                        });
                        throw new Error('Flat ID not returned from API. Response: ' + JSON.stringify(flatRes.data));
                    }
                    
                    console.log('✅ [FlatOwner] handleSubmit - Flat created successfully:', flatId);
                } catch (err) {
                    console.error('❌ [FlatOwner] handleSubmit - Error creating flat:', {
                        message: err.message,
                        response: err.response?.data,
                        status: err.response?.status,
                        fullError: err
                    });
                    alert("Error creating flat: " + (err.response?.data?.error || err.response?.data?.message || err.message || "Unknown error"));
                    return;
                }
            } else {
                flatId = formData.flat_id;
                
                // If flat number changed, update the flat record
                if (originalFlatNo && originalFlatNo !== formData.flat_no) {
                    console.log('🔄 [FlatOwner] handleSubmit - Updating flat number...');
                    const flatPayload = {
                        flat_no: String(formData.flat_no || '').trim(),
                        wing_id: formData.wing_id,
                        floor_id: formData.floor_id,
                        flat_type_id: formData.flat_type_id,
                        soc_id: 1,
                    };
                    
                    try {
                        await updateFlat(flatId, flatPayload);
                        console.log('✅ [FlatOwner] handleSubmit - Flat updated successfully');
                    } catch (err) {
                        console.error('❌ [FlatOwner] handleSubmit - Error updating flat:', {
                            message: err.message,
                            response: err.response?.data,
                            status: err.response?.status
                        });
                        alert("Error updating flat: " + (err.response?.data?.error || err.response?.data?.message || err.message || "Unknown error"));
                        return;
                    }
                }
            }

            console.log('🔄 [FlatOwner] handleSubmit - Processing owner...');
            
            // Helper function to safely convert to string and trim
            const safeTrim = (value) => {
                if (value === null || value === undefined) return null;
                return String(value).trim() || null;
            };
            
            const ownerPayload = { 
                ...formData, 
                flat_id: flatId,
                owner_name: safeTrim(formData.owner_name),
                owner_contactno: safeTrim(formData.owner_contactno),
                owner_altercontactno: safeTrim(formData.owner_altercontactno),
                owner_email: safeTrim(formData.owner_email),
                owner_adhar_no: safeTrim(formData.owner_adhar_no),
                owner_pan: safeTrim(formData.owner_pan),
                ownership_type: safeTrim(formData.ownership_type),
            };

            if (editMode && editId) {
                try {
                    console.log('🔄 [FlatOwner] handleSubmit - Updating owner...');
                    await updateOwner(editId, ownerPayload, selectedFile);
                    ownerId = editId;
                    console.log('✅ [FlatOwner] handleSubmit - Owner updated successfully');
                    alert("Owner updated successfully");
                } catch (err) {
                    console.error('❌ [FlatOwner] handleSubmit - Error updating owner:', {
                        message: err.message,
                        response: err.response?.data,
                        status: err.response?.status
                    });
                    alert("Error updating owner: " + (err.response?.data?.error || err.response?.data?.message || err.message || "Unknown error"));
                    return;
                }
            } else {
                try {
                    console.log('🔄 [FlatOwner] handleSubmit - Creating owner...');
                    const ownerRes = await addOwner(ownerPayload, selectedFile);
                    console.log('📊 [FlatOwner] handleSubmit - Owner creation response:', ownerRes.data);
                    
                    if (!ownerRes || !ownerRes.data) {
                        throw new Error('Invalid response from owner creation API');
                    }
                    
                    ownerId = ownerRes.data.id || ownerRes.data.insertId || ownerRes.data.owner_id;
                    
                    if (!ownerId) {
                        throw new Error('Owner ID not returned from API');
                    }
                    
                    console.log('✅ [FlatOwner] handleSubmit - Owner created successfully:', ownerId);
                    alert("Owner added successfully");
                } catch (err) {
                    console.error('❌ [FlatOwner] handleSubmit - Error creating owner:', {
                        message: err.message,
                        response: err.response?.data,
                        status: err.response?.status
                    });
                    alert("Error adding owner: " + (err.response?.data?.error || err.response?.data?.message || err.message || "Unknown error"));
                    return;
                }
            }

            // Handle parking details
            if (ownerId) {
                if (editMode) {
                    // In edit mode: update existing or add new parking
                    const existingParkingIds = existingParking.map(p => p.parking_id);
                    const updatedParkingIds = parkingDetails
                        .filter(p => p.parking_id)
                        .map(p => p.parking_id);

                    // Delete parking that was removed
                    for (const existing of existingParking) {
                        if (!updatedParkingIds.includes(existing.parking_id)) {
                            try {
                                await deleteParking(existing.parking_id, "Removed from owner form");
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
                                    owner_id: ownerId,
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
                                owner_id: ownerId,
                                vehical_type: parking.vehical_type,
                                vehical_no: parking.vehical_no,
                                parking_slot_no: parking.parking_slot_no || "",
                                remark: parking.remark || "",
                            }, parkingFile);
                        }
                    }
                }
            }

            // Handle parking details
            if (ownerId) {
                try {
                    console.log('🔄 [FlatOwner] handleSubmit - Processing parking details...');
                    if (editMode) {
                        // In edit mode: update existing or add new parking
                        const existingParkingIds = existingParking.map(p => p.parking_id);
                        const updatedParkingIds = parkingDetails
                            .filter(p => p.parking_id)
                            .map(p => p.parking_id);

                        // Delete parking that was removed
                        for (const existing of existingParking) {
                            if (!updatedParkingIds.includes(existing.parking_id)) {
                                try {
                                    await deleteParking(existing.parking_id, "Removed from owner form");
                                    console.log('✅ [FlatOwner] handleSubmit - Parking deleted:', existing.parking_id);
                                } catch (err) {
                                    console.error("❌ [FlatOwner] handleSubmit - Error deleting parking:", err);
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
                                    try {
                                        await updateParking(parking.parking_id, {
                                            vehical_type: parking.vehical_type,
                                            vehical_no: parking.vehical_no,
                                            parking_slot_no: parking.parking_slot_no || "",
                                            remark: parking.remark || "",
                                            attachment_url: parking.attachment_url || null,
                                        }, parkingFile);
                                        console.log('✅ [FlatOwner] handleSubmit - Parking updated:', parking.parking_id);
                                    } catch (err) {
                                        console.error('❌ [FlatOwner] handleSubmit - Error updating parking:', err);
                                    }
                                } else {
                                    // Add new parking
                                    try {
                                        await addParking({
                                            owner_id: ownerId,
                                            vehical_type: parking.vehical_type,
                                            vehical_no: parking.vehical_no,
                                            parking_slot_no: parking.parking_slot_no || "",
                                            remark: parking.remark || "",
                                        }, parkingFile);
                                        console.log('✅ [FlatOwner] handleSubmit - Parking added');
                                    } catch (err) {
                                        console.error('❌ [FlatOwner] handleSubmit - Error adding parking:', err);
                                    }
                                }
                            }
                        }
                    } else {
                        // In add mode: just add new parking
                        for (let i = 0; i < parkingDetails.length; i++) {
                            const parking = parkingDetails[i];
                            if (parking.vehical_type && parking.vehical_no) {
                                const parkingFile = parkingFiles[i] || null;
                                try {
                                    await addParking({
                                        owner_id: ownerId,
                                        vehical_type: parking.vehical_type,
                                        vehical_no: parking.vehical_no,
                                        parking_slot_no: parking.parking_slot_no || "",
                                        remark: parking.remark || "",
                                    }, parkingFile);
                                    console.log('✅ [FlatOwner] handleSubmit - Parking added');
                                } catch (err) {
                                    console.error('❌ [FlatOwner] handleSubmit - Error adding parking:', err);
                                }
                            }
                        }
                    }
                    console.log('✅ [FlatOwner] handleSubmit - Parking details processed');
                } catch (err) {
                    console.error('❌ [FlatOwner] handleSubmit - Error processing parking details:', err);
                    // Don't fail the whole operation if parking fails
                }
            }

            console.log('✅ [FlatOwner] handleSubmit - Form submission completed successfully');
            resetForm();
            fetchData();
            setShowForm(false);
        } catch (err) {
            console.error('❌ [FlatOwner] handleSubmit - Unexpected error:', {
                message: err.message,
                response: err.response?.data,
                status: err.response?.status,
                stack: err.stack
            });
            alert("Error: " + (err.response?.data?.error || err.response?.data?.message || err.message || "Unknown error occurred"));
        }
    };

    const resetForm = () => {
        // Auto-set wing_id to current user's wing when resetting for new entry
        // Since wings is filtered to only show user's wing, use the first wing if available
        let defaultWingId = "";
        if (wings.length > 0) {
            defaultWingId = wings[0].wing_id;
        } else if (currentUserWingId !== null) {
            // Fallback to currentUserWingId if wings array is empty
            defaultWingId = currentUserWingId;
        }
        
        setFormData({
            flat_no: "",
            wing_id: defaultWingId,
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
        setParkingDetails([]);
        setExistingParking([]);
        setParkingFiles([]);
        setParkingFilePreviews([]);
        setEditMode(false);
        setEditId(null);
        setOriginalFlatNo("");
        setSelectedFile(null);
        setFilePreview(null);
    };

    const handleEdit = async (owner) => {
        // Helper function to safely convert to string
        const safeString = (value) => {
            if (value === null || value === undefined) return "";
            return String(value);
        };
        
        setFormData({
            flat_id: owner.flat_id,
            flat_no: safeString(owner.flat_no),
            wing_id: owner.wing_id,
            floor_id: owner.floor_id,
            flat_type_id: owner.flat_type_id,
            owner_name: safeString(owner.owner_name),
            owner_contactno: safeString(owner.owner_contactno),
            owner_altercontactno: safeString(owner.owner_altercontactno),
            owner_email: safeString(owner.owner_email),
            is_residence: !!owner.is_residence,
            owner_adhar_no: safeString(owner.owner_adhar_no),
            owner_pan: safeString(owner.owner_pan),
            ownership_type: safeString(owner.ownership_type),
            attachment_url: owner.attachment_url || null,
        });
        setEditMode(true);
        setEditId(owner.owner_id);
        setOriginalFlatNo(owner.flat_no || "");
        setSelectedFile(null);
        setFilePreview(owner.attachment_url && owner.attachment_url.startsWith('http') ? owner.attachment_url : null);

        // Load existing parking details for this owner
        try {
            console.log('🔄 [FlatOwner] handleEdit - Loading parking details...', {
                owner_id: owner.owner_id
            });
            const parkingRes = await getParking();
            console.log('📊 [FlatOwner] handleEdit - Parking API Response:', {
                status: parkingRes.status,
                data: parkingRes.data,
                dataType: typeof parkingRes.data,
                isArray: Array.isArray(parkingRes.data)
            });
            
            let allParking = [];
            if (Array.isArray(parkingRes.data)) {
                allParking = parkingRes.data;
            } else if (parkingRes.data && Array.isArray(parkingRes.data.data)) {
                allParking = parkingRes.data.data;
            } else {
                console.warn('⚠️ [FlatOwner] handleEdit - Parking data is not an array:', parkingRes.data);
                allParking = [];
            }
            
            const ownerParking = allParking.filter(p => p.owner_id === owner.owner_id && !p.is_deleted);
            console.log('✅ [FlatOwner] handleEdit - Parking details loaded:', ownerParking.length);
            
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
            console.error("❌ [FlatOwner] handleEdit - Error loading parking details:", {
                message: err.message,
                response: err.response?.data,
                status: err.response?.status,
                stack: err.stack
            });
            setExistingParking([]);
            setParkingDetails([]);
            setParkingFiles([]);
            setParkingFilePreviews([]);
        }

        setShowForm(true);
    };

    const handleDelete = async (owner) => {
        if (!window.confirm(`Are you sure you want to delete ${owner.owner_name}?`))
            return;
        const reason = prompt("Enter deletion reason:");
        if (!reason || !reason.trim()) {
            alert("Deletion reason is required");
            return;
        }
        try {
            console.log('🔄 [FlatOwner] handleDelete - Deleting owner...', {
                owner_id: owner.owner_id,
                owner_name: owner.owner_name
            });
            await deleteOwner(owner.owner_id, reason.trim());
            console.log('✅ [FlatOwner] handleDelete - Owner deleted successfully');
            alert("Owner deleted successfully");
            fetchData();
        } catch (err) {
            console.error('❌ [FlatOwner] handleDelete - Error:', {
                message: err.message,
                response: err.response?.data,
                status: err.response?.status,
                stack: err.stack
            });
            alert("Error deleting owner: " + (err.response?.data?.error || err.response?.data?.message || err.message || "Unknown error"));
        }
    };

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

    const filteredOwners = owners.filter(
        (o) =>
            o.owner_name.toLowerCase().includes(searchText.toLowerCase()) ||
            (o.flat_no && o.flat_no.toLowerCase().includes(searchText.toLowerCase()))
    );

    // Pagination logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentOwners = filteredOwners.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredOwners.length / itemsPerPage);

    // Reset to page 1 when search changes
    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchText]);

    return (
        <div className="flat-owner-container">
            <h1>Flat Owner</h1>
            {!showForm ? (
                <div>
                    <div className="table-header">
                        {canEdit() && (
                            <button className="new-entry-btn" onClick={() => {
                                // Auto-set wing_id to current user's wing when creating new entry
                                // Since wings is filtered to only show user's wing, use the first wing if available
                                if (wings.length > 0) {
                                    setFormData(prev => ({ ...prev, wing_id: wings[0].wing_id }));
                                } else if (currentUserWingId !== null) {
                                    setFormData(prev => ({ ...prev, wing_id: currentUserWingId }));
                                }
                                setShowForm(true);
                            }}>New Entry</button>
                        )}
                        <div className="search-bar">
                            <input
                                type="text"
                                placeholder="Search by owner or flat no"
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                            />
                        </div>
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
                                <th>Attachment</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentOwners.map((owner) => (
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
                                        {owner.attachment_url ? (
                                            <a
                                                href={owner.attachment_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ color: '#007bff', textDecoration: 'none' }}
                                            >
                                                {owner.attachment_url.endsWith('.pdf') || owner.attachment_url.includes('pdf') ? '📄 View PDF' : '🖼️ View Image'}
                                            </a>
                                        ) : (
                                            <span style={{ color: '#999' }}>No attachment</span>
                                        )}
                                    </td>
                                    <td>
                                        {!owner.is_deleted && canEdit() && (
                                            <button className="edit-btn-flat" onClick={() => handleEdit(owner)}>Edit</button>
                                        )}
                                        {!owner.is_deleted && canDelete() && (
                                            <button className="delete-btn-flat" onClick={() => handleDelete(owner)}>Delete</button>
                                        )}
                                        {isOwnerRole() && (
                                            <span style={{ color: '#999', fontSize: '12px' }}>View Only</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {totalPages > 1 && (
                        <div className="pagination">
                            <button disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)}>⟸ Prev</button>
                            <span>Page {currentPage} of {totalPages}</span>
                            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(currentPage + 1)}>Next ⟹</button>
                        </div>
                    )}
                </div>
            ) : (
                <div>
                    <h2>{editMode ? "Edit Owner" : "Add Owner"}</h2>
                    <form onSubmit={handleSubmit}>
                        {/* Your existing form fields */}
                        <div className="form-field">
                            <label>Wing</label>
                            <select
                                name="wing_id"
                                value={formData.wing_id || ""}
                                onChange={handleChange}
                                required
                                disabled={currentUserWingId !== null && wings.length === 1}
                            >
                                <option value="">Select Wing</option>
                                {wings.map((wing) => (
                                    <option key={wing.wing_id} value={wing.wing_id}>
                                        {wing.wing_name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-field">
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
                        </div>

                        <div className="form-field">
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
                        </div>

                        <div className="form-field">
                            <label>Flat No.</label>
                            <input
                                type="text"
                                name="flat_no"
                                value={formData.flat_no}
                                onChange={handleChange}
                                placeholder="Enter Flat No."
                                required
                            />
                        </div>

                        <div className="form-field">
                            <label>Owner Name</label>
                            <input
                                type="text"
                                name="owner_name"
                                value={formData.owner_name}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-field">
                            <label>Contact No.</label>
                            <input
                                type="text"
                                name="owner_contactno"
                                value={formData.owner_contactno}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-field">
                            <label>Alternate Contact</label>
                            <input
                                type="text"
                                name="owner_altercontactno"
                                value={formData.owner_altercontactno}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-field">
                            <label>Email</label>
                            <input
                                type="email"
                                name="owner_email"
                                value={formData.owner_email}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-field checkbox">
                            <label>Is Residence</label>
                            <input
                                type="checkbox"
                                name="is_residence"
                                checked={formData.is_residence}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-field">
                            <label>Aadhaar No.</label>
                            <input
                                type="text"
                                name="owner_adhar_no"
                                value={formData.owner_adhar_no}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-field">
                            <label>PAN No.</label>
                            <input
                                type="text"
                                name="owner_pan"
                                value={formData.owner_pan}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-field">
                            <label>Ownership Type</label>
                            <input
                                type="text"
                                name="ownership_type"
                                value={formData.ownership_type}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-field">
                            <label>Attachment (PDF/JPEG):</label>
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
                            {filePreview && !selectedFile && formData.attachment_url && (
                                <div style={{ marginTop: '10px' }}>
                                    <p style={{ fontSize: '12px', color: '#666' }}>Current document:</p>
                                    {formData.attachment_url.endsWith('.pdf') || formData.attachment_url.includes('pdf') ? (
                                        <a href={formData.attachment_url} target="_blank" rel="noopener noreferrer" style={{ color: '#007bff' }}>
                                            View PDF
                                        </a>
                                    ) : (
                                        <img src={formData.attachment_url} alt="Attachment" style={{ maxWidth: '200px', maxHeight: '200px', marginTop: '5px' }} />
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
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default FlatOwner;