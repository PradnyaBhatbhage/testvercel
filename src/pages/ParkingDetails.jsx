import React, { useEffect, useState } from "react";
import {
    getParking,
    getOwners,
    getRentals,
} from "../services/api";
import { getCurrentUserWingId, filterOwnersByWing } from "../utils/wingFilter";
import { isOwnerRole, getCurrentOwnerId, filterOwnersByCurrentOwner } from "../utils/ownerFilter";
import "../css/ParkingDetails.css";

const ParkingDetails = () => {
    const [parkingData, setParkingData] = useState([]);
    const [owners, setOwners] = useState([]);
    const [rentals, setRentals] = useState([]);
    const [searchText, setSearchText] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [currentRentalPage, setCurrentRentalPage] = useState(1);
    const itemsPerPage = 10;

    // Get current user's wing_id
    const currentUserWingId = getCurrentUserWingId();

    useEffect(() => {
        fetchParkingData();
        fetchOwners();
        fetchRentals();
    }, []);

    const fetchParkingData = async () => {
        try {
            const res = await getParking();
            const rawParking = Array.isArray(res.data) ? res.data : res.data?.data || [];
            
            // Filter parking by current user's wing
            let filteredParking = rawParking.filter(p => !p.is_deleted);
            
            if (currentUserWingId !== null) {
                // Get owner IDs for the wing
                const allOwnersRes = await getOwners();
                const allOwners = Array.isArray(allOwnersRes.data) ? allOwnersRes.data : allOwnersRes.data?.data || [];
                const wingOwnerIds = new Set(
                    allOwners
                        .filter(o => o.wing_id && parseInt(o.wing_id) === parseInt(currentUserWingId))
                        .map(o => parseInt(o.owner_id))
                );
                filteredParking = filteredParking.filter(p => {
                    const ownerId = p.owner_id ? parseInt(p.owner_id) : null;
                    return ownerId && wingOwnerIds.has(ownerId);
                });
            }

            // Note: Owner users can see all parking records, not just their own
            // Removed owner filtering to allow owners to view all parking records

            setParkingData(filteredParking);
        } catch (err) {
            console.error("Error fetching parking data:", err);
        }
    };

    const fetchOwners = async () => {
        try {
            const res = await getOwners();
            let rawOwners = Array.isArray(res.data) ? res.data : res.data?.data || [];
            
            if (currentUserWingId !== null) {
                rawOwners = filterOwnersByWing(rawOwners, currentUserWingId);
            }
            
            // Note: For owner users, we need ALL owners (not just current owner) 
            // to properly display owner information for all parking records
            // Removed owner filtering to allow proper data joining
            
            setOwners(rawOwners);
        } catch (err) {
            console.error("Error fetching owners:", err);
        }
    };

    const fetchRentals = async () => {
        try {
            const res = await getRentals();
            const rawRentals = Array.isArray(res.data) ? res.data : res.data?.data || [];
            setRentals(rawRentals.filter(r => !r.is_deleted));
        } catch (err) {
            console.error("Error fetching rentals:", err);
        }
    };

    // Join parking with owners and rentals to get owner and tenant information
    const getParkingWithDetails = () => {
        return parkingData.map(p => {
            // Find owner information
            const owner = owners.find(o => o.owner_id && parseInt(o.owner_id) === parseInt(p.owner_id));
            
            // Find active rental (tenant) for this owner's flat
            const activeRental = rentals.find(r => {
                if (!r || r.is_deleted || !r.owner_id) return false;
                if (parseInt(r.owner_id) !== parseInt(p.owner_id)) return false;
                
                // Check if rental is currently active
                if (r.start_date && r.end_date) {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const startDate = new Date(r.start_date);
                    startDate.setHours(0, 0, 0, 0);
                    const endDate = new Date(r.end_date);
                    endDate.setHours(23, 59, 59, 999);
                    
                    return today >= startDate && today <= endDate;
                }
                return false;
            });

            return {
                ...p,
                owner_name: owner?.owner_name || "-",
                owner_contactno: owner?.owner_contactno || "-",
                tenant_name: activeRental?.tenant_name || "-",
                tenant_contactno: activeRental?.tenant_contactno || activeRental?.tenant_altercontactno || "-",
            };
        });
    };

    // Filter parking data based on search
    const allParkingWithDetails = getParkingWithDetails();
    
    // Separate into owner and rental parking
    const ownerParking = allParkingWithDetails.filter(p => {
        const ownershipType = p.ownership_type ? String(p.ownership_type).trim() : "";
        return !ownershipType || ownershipType === "Owner" || ownershipType === "";
    });
    const rentalParking = allParkingWithDetails.filter(p => {
        const ownershipType = p.ownership_type ? String(p.ownership_type).trim() : "";
        return ownershipType === "Rental";
    });

    // Debug logging (remove in production)
    if (allParkingWithDetails.length > 0) {
        console.log("Parking Details Debug:", {
            totalParking: allParkingWithDetails.length,
            ownerParkingCount: ownerParking.length,
            rentalParkingCount: rentalParking.length,
            ownershipTypes: allParkingWithDetails.map(p => p.ownership_type),
            sampleParking: allParkingWithDetails.slice(0, 3).map(p => ({
                parking_id: p.parking_id,
                ownership_type: p.ownership_type,
                owner_id: p.owner_id
            }))
        });
    }

    // Filter owner parking based on search
    const filteredOwnerParking = ownerParking.filter((p) => {
        if (!searchText) return true;
        
        const searchLower = searchText.toLowerCase();
        return (
            (p.owner_name?.toLowerCase().includes(searchLower)) ||
            (p.vehical_type?.toLowerCase().includes(searchLower)) ||
            (p.vehical_no?.toLowerCase().includes(searchLower))
        );
    });

    // Filter rental parking based on search
    const filteredRentalParking = rentalParking.filter((p) => {
        if (!searchText) return true;
        
        const searchLower = searchText.toLowerCase();
        return (
            (p.owner_name?.toLowerCase().includes(searchLower)) ||
            (p.tenant_name?.toLowerCase().includes(searchLower)) ||
            (p.vehical_type?.toLowerCase().includes(searchLower)) ||
            (p.vehical_no?.toLowerCase().includes(searchLower))
        );
    });

    // Pagination for owner parking
    const ownerTotalPages = Math.ceil(filteredOwnerParking.length / itemsPerPage);
    const ownerStartIndex = (currentPage - 1) * itemsPerPage;
    const currentOwnerParking = filteredOwnerParking.slice(ownerStartIndex, ownerStartIndex + itemsPerPage);

    // Pagination for rental parking
    const rentalTotalPages = Math.ceil(filteredRentalParking.length / itemsPerPage);
    const rentalStartIndex = (currentRentalPage - 1) * itemsPerPage;
    const currentRentalParking = filteredRentalParking.slice(rentalStartIndex, rentalStartIndex + itemsPerPage);

    // Group by owner to count total vehicles per owner (for owner parking)
    const ownerVehicleCounts = {};
    filteredOwnerParking.forEach(p => {
        const ownerId = p.owner_id;
        if (!ownerVehicleCounts[ownerId]) {
            ownerVehicleCounts[ownerId] = 0;
        }
        ownerVehicleCounts[ownerId]++;
    });

    // Group by owner to count total vehicles per owner (for rental parking)
    const rentalVehicleCounts = {};
    filteredRentalParking.forEach(p => {
        const ownerId = p.owner_id;
        if (!rentalVehicleCounts[ownerId]) {
            rentalVehicleCounts[ownerId] = 0;
        }
        rentalVehicleCounts[ownerId]++;
    });

    // Add vehicle count to each parking record
    const ownerParkingWithCounts = currentOwnerParking.map(p => ({
        ...p,
        total_vehicles: ownerVehicleCounts[p.owner_id] || 0,
    }));

    const rentalParkingWithCounts = currentRentalParking.map(p => ({
        ...p,
        total_vehicles: rentalVehicleCounts[p.owner_id] || 0,
    }));

    // Check if user is owner role
    const userIsOwner = isOwnerRole();

    return (
        <div className="parking-details-container">
            <h2>🚗 Parking Details</h2>

            {/* Search Bar */}
            <div className="parking-search-bar">
                <input
                    type="text"
                    placeholder="Search by owner name, tenant name, or vehicle name/number..."
                    value={searchText}
                    onChange={(e) => {
                        setSearchText(e.target.value);
                        setCurrentPage(1); // Reset to first page on search
                        setCurrentRentalPage(1); // Reset rental page on search
                    }}
                    className="search-input"
                />
            </div>

            {/* Owner Parking Table */}
            <div style={{ marginBottom: '40px' }}>
                <h3 style={{ marginBottom: '15px', color: '#333' }}>🏠 Owner Parking Details</h3>
                <div className="parking-table-container">
                    <table className="parking-table">
                        <thead>
                            <tr>
                                <th>Sr. No.</th>
                                <th>Owner Name</th>
                                <th>Owner Contact</th>
                                <th>Vehicle Type</th>
                                <th>Vehicle Number</th>
                                {!userIsOwner && <th>Total Vehicles</th>}
                                {!userIsOwner && <th>Parking Slot</th>}
                                {!userIsOwner && <th>Image</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {ownerParkingWithCounts.length === 0 ? (
                                <tr>
                                    <td colSpan={userIsOwner ? "5" : "8"} className="no-data">
                                        {searchText ? "No owner parking records found matching your search." : "No owner parking records found."}
                                    </td>
                                </tr>
                            ) : (
                                ownerParkingWithCounts.map((parking, index) => (
                                    <tr key={parking.parking_id}>
                                        <td>{ownerStartIndex + index + 1}</td>
                                        <td>{parking.owner_name || "-"}</td>
                                        <td>{parking.owner_contactno || "-"}</td>
                                        <td>{parking.vehical_type || "-"}</td>
                                        <td>{parking.vehical_no || "-"}</td>
                                        {!userIsOwner && <td>{parking.total_vehicles || 0}</td>}
                                        {!userIsOwner && <td>{parking.parking_slot_no || "-"}</td>}
                                        {!userIsOwner && (
                                            <td>
                                                {(() => {
                                                    // Handle both array and single string
                                                    let attachments = [];
                                                    if (parking.attachment_url) {
                                                        if (Array.isArray(parking.attachment_url)) {
                                                            attachments = parking.attachment_url;
                                                        } else if (typeof parking.attachment_url === 'string') {
                                                            // Try to parse as JSON
                                                            try {
                                                                const parsed = JSON.parse(parking.attachment_url);
                                                                attachments = Array.isArray(parsed) ? parsed : [parking.attachment_url];
                                                            } catch {
                                                                attachments = [parking.attachment_url];
                                                            }
                                                        }
                                                    }
                                                    
                                                    if (attachments.length === 0) {
                                                        return "-";
                                                    }
                                                    
                                                    return (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                                            {attachments.map((url, idx) => {
                                                                if (!url || typeof url !== 'string') return null;
                                                                const isPDF = url.endsWith('.pdf') || url.includes('pdf');
                                                                return (
                                                                    <a
                                                                        key={idx}
                                                                        href={url}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        style={{ color: '#007bff', textDecoration: 'none', fontSize: '12px' }}
                                                                    >
                                                                        {isPDF ? '📄 PDF' : '🖼️ Image'} {attachments.length > 1 ? `(${idx + 1})` : ''}
                                                                    </a>
                                                                );
                                                            })}
                                                        </div>
                                                    );
                                                })()}
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination for Owner Parking */}
                {ownerTotalPages > 1 && (
                    <div className="pagination">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                        >
                            Previous
                        </button>
                        <span>
                            Page {currentPage} of {ownerTotalPages} ({filteredOwnerParking.length} total records)
                        </span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(ownerTotalPages, p + 1))}
                            disabled={currentPage === ownerTotalPages}
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>

            {/* Rental/Tenant Parking Table */}
            <div>
                <h3 style={{ marginBottom: '15px', color: '#333' }}>🏘️ Rental/Tenant Parking Details</h3>
                <div className="parking-table-container">
                    <table className="parking-table">
                        <thead>
                            <tr>
                                <th>Sr. No.</th>
                                <th>Owner Name</th>
                                <th>Owner Contact</th>
                                <th>Tenant Name</th>
                                <th>Tenant Contact</th>
                                <th>Vehicle Type</th>
                                <th>Vehicle Number</th>
                                {!userIsOwner && <th>Total Vehicles</th>}
                                {!userIsOwner && <th>Parking Slot</th>}
                                {!userIsOwner && <th>Image</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {rentalParkingWithCounts.length === 0 ? (
                                <tr>
                                    <td colSpan={userIsOwner ? "7" : "10"} className="no-data">
                                        {searchText ? "No rental parking records found matching your search." : "No rental parking records found."}
                                    </td>
                                </tr>
                            ) : (
                                rentalParkingWithCounts.map((parking, index) => (
                                    <tr key={parking.parking_id}>
                                        <td>{rentalStartIndex + index + 1}</td>
                                        <td>{parking.owner_name || "-"}</td>
                                        <td>{parking.owner_contactno || "-"}</td>
                                        <td>{parking.tenant_name || "-"}</td>
                                        <td>{parking.tenant_contactno || "-"}</td>
                                        <td>{parking.vehical_type || "-"}</td>
                                        <td>{parking.vehical_no || "-"}</td>
                                        {!userIsOwner && <td>{parking.total_vehicles || 0}</td>}
                                        {!userIsOwner && <td>{parking.parking_slot_no || "-"}</td>}
                                        {!userIsOwner && (
                                            <td>
                                                {(() => {
                                                    // Handle both array and single string
                                                    let attachments = [];
                                                    if (parking.attachment_url) {
                                                        if (Array.isArray(parking.attachment_url)) {
                                                            attachments = parking.attachment_url;
                                                        } else if (typeof parking.attachment_url === 'string') {
                                                            // Try to parse as JSON
                                                            try {
                                                                const parsed = JSON.parse(parking.attachment_url);
                                                                attachments = Array.isArray(parsed) ? parsed : [parking.attachment_url];
                                                            } catch {
                                                                attachments = [parking.attachment_url];
                                                            }
                                                        }
                                                    }
                                                    
                                                    if (attachments.length === 0) {
                                                        return "-";
                                                    }
                                                    
                                                    return (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                                            {attachments.map((url, idx) => {
                                                                if (!url || typeof url !== 'string') return null;
                                                                const isPDF = url.endsWith('.pdf') || url.includes('pdf');
                                                                return (
                                                                    <a
                                                                        key={idx}
                                                                        href={url}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        style={{ color: '#007bff', textDecoration: 'none', fontSize: '12px' }}
                                                                    >
                                                                        {isPDF ? '📄 PDF' : '🖼️ Image'} {attachments.length > 1 ? `(${idx + 1})` : ''}
                                                                    </a>
                                                                );
                                                            })}
                                                        </div>
                                                    );
                                                })()}
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination for Rental Parking */}
                {rentalTotalPages > 1 && (
                    <div className="pagination">
                        <button
                            onClick={() => setCurrentRentalPage(p => Math.max(1, p - 1))}
                            disabled={currentRentalPage === 1}
                        >
                            Previous
                        </button>
                        <span>
                            Page {currentRentalPage} of {rentalTotalPages} ({filteredRentalParking.length} total records)
                        </span>
                        <button
                            onClick={() => setCurrentRentalPage(p => Math.min(rentalTotalPages, p + 1))}
                            disabled={currentRentalPage === rentalTotalPages}
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ParkingDetails;

