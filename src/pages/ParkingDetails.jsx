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

            // Filter by owner if user is owner role
            if (isOwnerRole()) {
                const ownerId = getCurrentOwnerId();
                if (ownerId) {
                    filteredParking = filteredParking.filter(p => 
                        p.owner_id && parseInt(p.owner_id) === parseInt(ownerId)
                    );
                }
            }

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
            
            if (isOwnerRole()) {
                rawOwners = filterOwnersByCurrentOwner(rawOwners);
            }
            
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
    const filteredParking = getParkingWithDetails().filter((p) => {
        if (!searchText) return true;
        
        const searchLower = searchText.toLowerCase();
        return (
            (p.owner_name?.toLowerCase().includes(searchLower)) ||
            (p.tenant_name?.toLowerCase().includes(searchLower)) ||
            (p.vehical_type?.toLowerCase().includes(searchLower)) ||
            (p.vehical_no?.toLowerCase().includes(searchLower))
        );
    });

    // Pagination
    const totalPages = Math.ceil(filteredParking.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentParking = filteredParking.slice(startIndex, startIndex + itemsPerPage);

    // Group by owner to count total vehicles per owner
    const ownerVehicleCounts = {};
    filteredParking.forEach(p => {
        const ownerId = p.owner_id;
        if (!ownerVehicleCounts[ownerId]) {
            ownerVehicleCounts[ownerId] = 0;
        }
        ownerVehicleCounts[ownerId]++;
    });

    // Add vehicle count to each parking record
    const parkingWithCounts = currentParking.map(p => ({
        ...p,
        total_vehicles: ownerVehicleCounts[p.owner_id] || 0,
    }));

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
                    }}
                    className="search-input"
                />
            </div>

            {/* Table */}
            <div className="parking-table-container">
                <table className="parking-table">
                    <thead>
                        <tr>
                            <th>Parking ID</th>
                            <th>Owner Name</th>
                            <th>Owner Contact</th>
                            <th>Tenant Name</th>
                            <th>Tenant Contact</th>
                            <th>Vehicle Type</th>
                            <th>Vehicle Number</th>
                            <th>Total Vehicles</th>
                            <th>Parking Slot</th>
                            <th>Image</th>
                        </tr>
                    </thead>
                    <tbody>
                        {parkingWithCounts.length === 0 ? (
                            <tr>
                                <td colSpan="10" className="no-data">
                                    {searchText ? "No parking records found matching your search." : "No parking records found."}
                                </td>
                            </tr>
                        ) : (
                            parkingWithCounts.map((parking) => (
                                <tr key={parking.parking_id}>
                                    <td>{parking.parking_id}</td>
                                    <td>{parking.owner_name || "-"}</td>
                                    <td>{parking.owner_contactno || "-"}</td>
                                    <td>{parking.tenant_name || "-"}</td>
                                    <td>{parking.tenant_contactno || "-"}</td>
                                    <td>{parking.vehical_type || "-"}</td>
                                    <td>{parking.vehical_no || "-"}</td>
                                    <td>{parking.total_vehicles || 0}</td>
                                    <td>{parking.parking_slot_no || "-"}</td>
                                    <td>
                                        {parking.attachment_url ? (
                                            <a
                                                href={parking.attachment_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ color: '#007bff', textDecoration: 'none' }}
                                            >
                                                {parking.attachment_url.endsWith('.pdf') || parking.attachment_url.includes('pdf')
                                                    ? '📄 View PDF'
                                                    : '🖼️ View Image'}
                                            </a>
                                        ) : (
                                            "-"
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="pagination">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                    >
                        Previous
                    </button>
                    <span>
                        Page {currentPage} of {totalPages} ({filteredParking.length} total records)
                    </span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
};

export default ParkingDetails;

