import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
    getOwners,
    getMaintenanceDetails,
    getExpenses,
    getRentals,
    getMeetings,
    getWings,
    getFlats,
    getMaintenancePayments,
    getAllPayments,
    getAllActivityExpenses,
} from "../services/api";
import { getCurrentUserWingId, filterOwnersByWing, filterMaintenanceDetailsByWing, filterByWing } from "../utils/wingFilter";
import "../css/Reports.css";

const Reports = ({ reportType }) => {
    const [user, setUser] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("user") || "{}");
        } catch (err) {
            console.error('❌ [Reports] Error parsing user from localStorage:', err);
            return {};
        }
    });

    // Map report type from sidebar to internal ID
    const getReportIdFromType = (type) => {
        const mapping = {
            "Owner Report": "owner",
            "Maintenance Report": "maintenance",
            "Expense Report": "expense",
            "Rental Report": "rental",
            "Meeting Report": "meeting",
            "Complete Report": "complete"
        };
        return mapping[type] || "owner";
    };

    const [activeReport, setActiveReport] = useState(() => {
        return reportType ? getReportIdFromType(reportType) : "owner";
    });
    const [loading, setLoading] = useState(false);
    const [wingsLoading, setWingsLoading] = useState(true);
    const [wings, setWings] = useState([]);
    const [error, setError] = useState("");

    // Date filters
    const [dateFilter, setDateFilter] = useState({
        startDate: "",
        endDate: "",
        wing_id: "",
        month: "", // Month filter (YYYY-MM format)
    });

    // Search filters for Owner and Rental reports
    const [searchFilter, setSearchFilter] = useState({
        flatNumber: "",
        name: "",
        ownerSearch: "", // Single search for Owner Report (searches both flat number and name)
        rentalSearch: "", // Single search for Rental Report (searches both flat number and name)
    });

    // Report data
    const [ownerReportData, setOwnerReportData] = useState([]);
    const [allOwnersForMaintenance, setAllOwnersForMaintenance] = useState([]); // Store owners for maintenance report
    const [maintenanceReportData, setMaintenanceReportData] = useState([]);
    const [expenseReportData, setExpenseReportData] = useState([]);
    const [rentalReportData, setRentalReportData] = useState([]);
    const [meetingReportData, setMeetingReportData] = useState([]);
    const [completeReportData, setCompleteReportData] = useState(null);
    const [isFormulaExpanded, setIsFormulaExpanded] = useState(false); // Track formula section expansion

    // Cache for shared data to minimize API calls
    const dataCache = useRef({
        owners: null,
        maintenanceDetails: null,
        expenses: null,
        rentals: null,
        meetings: null,
        flats: null,
        activityPayments: null,
        activityExpenses: null,
        lastFetch: null,
        cacheTimeout: 60000, // 1 minute cache
    });

    const reportRef = useRef(null);
    const isMounted = useRef(true);
    const currentUserWingId = getCurrentUserWingId();

    // Helper to safely parse array from API response
    const parseArrayResponse = (data, endpointName) => {
        try {
            if (Array.isArray(data)) {
                return data;
            } else if (data && Array.isArray(data.data)) {
                return data.data;
            } else if (data && typeof data === 'object') {
                const arrayKey = Object.keys(data).find(key => Array.isArray(data[key]));
                if (arrayKey) {
                    return data[arrayKey];
                }
            }
            console.warn(`⚠️ [Reports] ${endpointName} response is not an array:`, data);
            return [];
        } catch (err) {
            console.error(`❌ [Reports] Error parsing ${endpointName} response:`, err);
            return [];
        }
    };

    // Fetch wings on mount only
    const fetchWings = useCallback(async () => {
        if (!isMounted.current) return;
        try {
            console.log('🔄 [Reports] fetchWings - Starting...');
            setWingsLoading(true);
            setError("");

            const res = await getWings();
            console.log('📊 [Reports] fetchWings - API Response:', {
                status: res.status,
                data: res.data,
                dataType: typeof res.data,
                isArray: Array.isArray(res.data)
            });

            let wingsData = parseArrayResponse(res.data, 'Wings');

            // If user has wing restriction, filter wings to show only their wing
            if (currentUserWingId !== null) {
                wingsData = wingsData.filter(w => w.wing_id === currentUserWingId);
            }

            if (isMounted.current) {
                setWings(wingsData);
                console.log('✅ [Reports] fetchWings - Success:', wingsData.length);
            }
        } catch (err) {
            console.error('❌ [Reports] fetchWings - Error:', {
                message: err.message,
                response: err.response?.data,
                status: err.response?.status,
                stack: err.stack
            });
            if (isMounted.current) {
                let errorMessage = "Unknown error";
                if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
                    errorMessage = "Network Error: Cannot connect to server.";
                } else if (err.response?.status === 500) {
                    errorMessage = "Server Error: The server encountered an error.";
                } else if (err.response?.data) {
                    errorMessage = typeof err.response.data === 'string'
                        ? err.response.data
                        : (err.response.data.error || err.response.data.message || JSON.stringify(err.response.data));
                } else if (err.message) {
                    errorMessage = err.message;
                }
                setError(`Error fetching wings: ${errorMessage}`);
                setWings([]);
            }
        } finally {
            if (isMounted.current) {
                setWingsLoading(false);
            }
        }
    }, []);

    // Update activeReport when reportType prop changes
    useEffect(() => {
        if (reportType) {
            const reportId = getReportIdFromType(reportType);
            console.log('🔄 [Reports] Setting activeReport from reportType:', reportType, '->', reportId);
            setActiveReport(reportId);
        }
    }, [reportType]);

    // Set default wing_id if user has wing restriction
    useEffect(() => {
        if (currentUserWingId !== null) {
            setDateFilter(prev => ({ ...prev, wing_id: currentUserWingId.toString() }));
        }
    }, [currentUserWingId]);

    // Set mounted flag on mount
    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    // Fetch wings on mount
    useEffect(() => {
        fetchWings();
    }, [fetchWings]);

    // Fetch only the active report to minimize API calls
    const fetchActiveReport = async () => {
        console.log('🔄 [Reports] fetchActiveReport - Starting fetch for:', activeReport);
        console.log('📊 [Reports] fetchActiveReport - Current filters:', {
            dateFilter,
            searchFilter,
            activeReport
        });
        setLoading(true);
        setError("");

        try {
            console.log('🔄 [Reports] fetchActiveReport - Fetching report:', activeReport);

            switch (activeReport) {
                case "owner":
                    console.log('📊 [Reports] fetchActiveReport - Calling fetchOwnerReport');
                    await fetchOwnerReport();
                    break;
                case "maintenance":
                    console.log('📊 [Reports] fetchActiveReport - Calling fetchMaintenanceReport');
                    await fetchMaintenanceReport();
                    break;
                case "expense":
                    console.log('📊 [Reports] fetchActiveReport - Calling fetchExpenseReport');
                    await fetchExpenseReport();
                    break;
                case "rental":
                    console.log('📊 [Reports] fetchActiveReport - Calling fetchRentalReport');
                    await fetchRentalReport();
                    break;
                case "meeting":
                    console.log('📊 [Reports] fetchActiveReport - Calling fetchMeetingReport');
                    await fetchMeetingReport();
                    break;
                case "complete":
                    console.log('📊 [Reports] fetchActiveReport - Calling fetchCompleteReport');
                    await fetchCompleteReport();
                    break;
                default:
                    console.warn('⚠️ [Reports] Unknown report type:', activeReport);
            }
            console.log('✅ [Reports] fetchActiveReport - Completed successfully for:', activeReport);
        } catch (err) {
            console.error('❌ [Reports] fetchActiveReport - Error:', {
                message: err.message,
                stack: err.stack,
                activeReport
            });
            if (isMounted.current) {
                setError(`Error fetching ${activeReport} report: ${err.message || "Unknown error"}`);
            }
        } finally {
            // Always clear loading state to prevent UI from being stuck
            // React will handle the warning if component is unmounted, but it's better than stuck UI
            console.log('🔄 [Reports] fetchActiveReport - Setting loading to false');
            setLoading(false);
        }
    };

    // Fetch owner report with caching
    const fetchOwnerReport = useCallback(async () => {
        if (!isMounted.current) return;
        try {
            console.log('🔄 [Reports] fetchOwnerReport - Starting...');

            // Check cache first
            const now = Date.now();
            let owners = dataCache.current.owners;

            if (!owners || !dataCache.current.lastFetch || (now - dataCache.current.lastFetch) > dataCache.current.cacheTimeout) {
                console.log('📡 [Reports] fetchOwnerReport - Fetching from API...');
                const res = await getOwners();
                owners = parseArrayResponse(res.data, 'Owners');
                dataCache.current.owners = owners;
                dataCache.current.lastFetch = now;
                console.log('✅ [Reports] fetchOwnerReport - Fetched from API:', owners.length);
            } else {
                console.log('✅ [Reports] fetchOwnerReport - Using cached data:', owners.length);
            }

            // For Owner Report: No wing, date, or month filtering - only search
            let filteredOwners = owners;

            // Filter by single search term (searches both flat number and owner name)
            if (searchFilter.ownerSearch && searchFilter.ownerSearch.trim()) {
                const searchTerm = searchFilter.ownerSearch.trim().toLowerCase();
                const beforeCount = filteredOwners.length;
                filteredOwners = filteredOwners.filter(o => {
                    const flatNo = (o.flat_no || "").toString().toLowerCase();
                    const ownerName = (o.owner_name || "").toLowerCase();
                    return flatNo.includes(searchTerm) || ownerName.includes(searchTerm);
                });
                console.log('🔍 [Reports] fetchOwnerReport - After search:', beforeCount, '->', filteredOwners.length, 'Search term:', searchTerm);
            }

            if (isMounted.current) {
                setOwnerReportData(filteredOwners);
                console.log('✅ [Reports] fetchOwnerReport - Success:', filteredOwners.length);
            }
        } catch (err) {
            console.error('❌ [Reports] fetchOwnerReport - Error:', {
                message: err.message,
                response: err.response?.data,
                status: err.response?.status,
                stack: err.stack
            });
            if (isMounted.current) {
                setOwnerReportData([]);
                setError(`Error fetching owner report: ${err.message || "Unknown error"}`);
            }
        }
    }, [searchFilter]);

    // Fetch maintenance report with caching
    const fetchMaintenanceReport = useCallback(async () => {
        if (!isMounted.current) return;
        try {
            console.log('🔄 [Reports] fetchMaintenanceReport - Starting...');

            // Check cache first
            const now = Date.now();
            let maintenance = dataCache.current.maintenanceDetails;

            if (!maintenance || !dataCache.current.lastFetch || (now - dataCache.current.lastFetch) > dataCache.current.cacheTimeout) {
                console.log('📡 [Reports] fetchMaintenanceReport - Fetching from API...');
                const res = await getMaintenanceDetails();
                maintenance = parseArrayResponse(res.data, 'MaintenanceDetails');
                dataCache.current.maintenanceDetails = maintenance;
                dataCache.current.lastFetch = now;
                console.log('✅ [Reports] fetchMaintenanceReport - Fetched from API:', maintenance.length);
            } else {
                console.log('✅ [Reports] fetchMaintenanceReport - Using cached data:', maintenance.length);
            }

            // Get owners from cache or fetch if needed
            let allOwners = dataCache.current.owners;
            if (!allOwners) {
                try {
                    console.log('📡 [Reports] fetchMaintenanceReport - Fetching owners for filtering...');
                    const ownersRes = await getOwners();
                    allOwners = parseArrayResponse(ownersRes.data, 'Owners');
                    dataCache.current.owners = allOwners;
                } catch (err) {
                    console.error('❌ [Reports] fetchMaintenanceReport - Error fetching owners:', err);
                    allOwners = [];
                }
            }

            // Store all owners for maintenance report to use in rendering
            if (isMounted.current) {
                setAllOwnersForMaintenance(allOwners);
            }

            // Filter by wing if selected (use wing_id from maintenance data)
            if (dateFilter.wing_id) {
                const filteredCount = maintenance.length;
                maintenance = maintenance.filter(m => {
                    if (!m.wing_id) {
                        // If wing_id is not in maintenance data, check owner's wing
                        const owner = allOwners.find(o => o.owner_id === m.owner_id);
                        return owner && owner.wing_id && parseInt(owner.wing_id) === parseInt(dateFilter.wing_id);
                    }
                    return parseInt(m.wing_id) === parseInt(dateFilter.wing_id);
                });
                console.log(`✅ [Reports] fetchMaintenanceReport - Filtered by wing ${dateFilter.wing_id}: ${filteredCount} -> ${maintenance.length} records`);
            } else if (currentUserWingId !== null) {
                // Filter by current user's wing
                const filteredCount = maintenance.length;
                maintenance = maintenance.filter(m => {
                    if (!m.wing_id) {
                        // If wing_id is not in maintenance data, check owner's wing
                        const owner = allOwners.find(o => o.owner_id === m.owner_id);
                        return owner && owner.wing_id && parseInt(owner.wing_id) === parseInt(currentUserWingId);
                    }
                    return parseInt(m.wing_id) === parseInt(currentUserWingId);
                });
                console.log(`✅ [Reports] fetchMaintenanceReport - Filtered by user wing ${currentUserWingId}: ${filteredCount} -> ${maintenance.length} records`);
            }

            // Filter by date range
            if (dateFilter.startDate && dateFilter.endDate) {
                const dateFilterCount = maintenance.length;
                const startDate = new Date(dateFilter.startDate);
                const endDate = new Date(dateFilter.endDate);
                endDate.setHours(23, 59, 59, 999); // Include entire end date

                maintenance = maintenance.filter(m => {
                    try {
                        const billDate = m.bill_start_date ? new Date(m.bill_start_date) : (m.created_at ? new Date(m.created_at) : null);
                        if (!billDate || isNaN(billDate.getTime())) return true; // Include if date is invalid
                        return billDate >= startDate && billDate <= endDate;
                    } catch (err) {
                        console.warn('⚠️ [Reports] fetchMaintenanceReport - Error parsing date:', m.bill_start_date, err);
                        return true; // Include if date parsing fails
                    }
                });
                console.log(`✅ [Reports] fetchMaintenanceReport - Filtered by date range: ${dateFilterCount} -> ${maintenance.length} records`);
            }

            if (isMounted.current) {
                setMaintenanceReportData(maintenance);
                console.log('✅ [Reports] fetchMaintenanceReport - Success:', maintenance.length);
            }
        } catch (err) {
            console.error('❌ [Reports] fetchMaintenanceReport - Error:', {
                message: err.message,
                response: err.response?.data,
                status: err.response?.status,
                stack: err.stack
            });
            if (isMounted.current) {
                setMaintenanceReportData([]);
                setError(`Error fetching maintenance report: ${err.message || "Unknown error"}`);
            }
        }
    }, [dateFilter, currentUserWingId]);

    // Fetch expense report with caching
    const fetchExpenseReport = useCallback(async () => {
        if (!isMounted.current) return;
        try {
            console.log('🔄 [Reports] fetchExpenseReport - Starting...');

            // Check cache first
            const now = Date.now();
            let expenses = dataCache.current.expenses;

            if (!expenses || !dataCache.current.lastFetch || (now - dataCache.current.lastFetch) > dataCache.current.cacheTimeout) {
                console.log('📡 [Reports] fetchExpenseReport - Fetching from API...');
                const res = await getExpenses();
                expenses = parseArrayResponse(res.data, 'Expenses');
                dataCache.current.expenses = expenses;
                dataCache.current.lastFetch = now;
                console.log('✅ [Reports] fetchExpenseReport - Fetched from API:', expenses.length);
            } else {
                console.log('✅ [Reports] fetchExpenseReport - Using cached data:', expenses.length);
            }

            // Filter by wing if selected
            if (dateFilter.wing_id) {
                expenses = expenses.filter(e => e.wing_id && parseInt(e.wing_id) === parseInt(dateFilter.wing_id));
            } else if (currentUserWingId !== null) {
                expenses = filterByWing(expenses, currentUserWingId, 'wing_id');
            }

            // Filter by date range
            if (dateFilter.startDate && dateFilter.endDate) {
                const startDate = new Date(dateFilter.startDate);
                const endDate = new Date(dateFilter.endDate);
                endDate.setHours(23, 59, 59, 999);

                expenses = expenses.filter(e => {
                    try {
                        if (!e.date) return false;
                        const expenseDate = new Date(e.date);
                        if (isNaN(expenseDate.getTime())) return false;
                        return expenseDate >= startDate && expenseDate <= endDate;
                    } catch (err) {
                        console.warn('⚠️ [Reports] fetchExpenseReport - Error parsing date:', e.date, err);
                        return false;
                    }
                });
            }

            // Filter by month if selected (prioritize month over date range if both are set)
            if (dateFilter.month) {
                const [year, month] = dateFilter.month.split('-');
                const startOfMonth = new Date(parseInt(year), parseInt(month) - 1, 1);
                const endOfMonth = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);

                expenses = expenses.filter(e => {
                    try {
                        if (!e.date) return false;
                        const expenseDate = new Date(e.date);
                        if (isNaN(expenseDate.getTime())) return false;
                        return expenseDate >= startOfMonth && expenseDate <= endOfMonth;
                    } catch (err) {
                        console.warn('⚠️ [Reports] fetchExpenseReport - Error parsing date:', e.date, err);
                        return false;
                    }
                });
            }

            if (isMounted.current) {
                setExpenseReportData(expenses);
                console.log('✅ [Reports] fetchExpenseReport - Success:', expenses.length);
            }
        } catch (err) {
            console.error('❌ [Reports] fetchExpenseReport - Error:', {
                message: err.message,
                response: err.response?.data,
                status: err.response?.status,
                stack: err.stack
            });
            if (isMounted.current) {
                setExpenseReportData([]);
                setError(`Error fetching expense report: ${err.message || "Unknown error"}`);
            }
        }
    }, [dateFilter, currentUserWingId]);

    // Fetch rental report with caching
    const fetchRentalReport = useCallback(async () => {
        if (!isMounted.current) return;
        try {
            console.log('🔄 [Reports] fetchRentalReport - Starting...');

            // Check cache first
            const now = Date.now();
            let rentals = dataCache.current.rentals;

            if (!rentals || !dataCache.current.lastFetch || (now - dataCache.current.lastFetch) > dataCache.current.cacheTimeout) {
                console.log('📡 [Reports] fetchRentalReport - Fetching from API...');
                const res = await getRentals();
                rentals = parseArrayResponse(res.data, 'Rentals');
                dataCache.current.rentals = rentals;
                dataCache.current.lastFetch = now;
                console.log('✅ [Reports] fetchRentalReport - Fetched from API:', rentals.length);
            } else {
                console.log('✅ [Reports] fetchRentalReport - Using cached data:', rentals.length);
            }

            // Filter by single search term (searches both flat number and name)
            if (searchFilter.rentalSearch && searchFilter.rentalSearch.trim() !== "") {
                const searchTerm = searchFilter.rentalSearch.trim().toLowerCase();
                const beforeCount = rentals.length;
                rentals = rentals.filter(r => {
                    const flatNo = (r.flat_no || "").toString().toLowerCase();
                    const ownerName = (r.owner_name || "").toLowerCase();
                    const tenantName = (r.tenant_name || "").toLowerCase();
                    return flatNo.includes(searchTerm) || ownerName.includes(searchTerm) || tenantName.includes(searchTerm);
                });
                console.log('🔍 [Reports] fetchRentalReport - After search:', beforeCount, '->', rentals.length, 'Search term:', searchTerm);
            }

            if (isMounted.current) {
                setRentalReportData(rentals);
                console.log('✅ [Reports] fetchRentalReport - Success:', rentals.length);
            }
        } catch (err) {
            console.error('❌ [Reports] fetchRentalReport - Error:', {
                message: err.message,
                response: err.response?.data,
                status: err.response?.status,
                stack: err.stack
            });
            if (isMounted.current) {
                setRentalReportData([]);
                setError(`Error fetching rental report: ${err.message || "Unknown error"}`);
            }
        }
    }, [dateFilter, searchFilter]);

    // Fetch meeting report with caching
    const fetchMeetingReport = useCallback(async () => {
        if (!isMounted.current) return;
        try {
            console.log('🔄 [Reports] fetchMeetingReport - Starting...');

            // Check cache first
            const now = Date.now();
            let meetings = dataCache.current.meetings;

            if (!meetings || !dataCache.current.lastFetch || (now - dataCache.current.lastFetch) > dataCache.current.cacheTimeout) {
                console.log('📡 [Reports] fetchMeetingReport - Fetching from API...');
                const res = await getMeetings();
                meetings = parseArrayResponse(res.data, 'Meetings');
                dataCache.current.meetings = meetings;
                dataCache.current.lastFetch = now;
                console.log('✅ [Reports] fetchMeetingReport - Fetched from API:', meetings.length);
            } else {
                console.log('✅ [Reports] fetchMeetingReport - Using cached data:', meetings.length);
            }

            // Filter by date range
            if (dateFilter.startDate && dateFilter.endDate) {
                const startDate = new Date(dateFilter.startDate);
                const endDate = new Date(dateFilter.endDate);
                endDate.setHours(23, 59, 59, 999);

                meetings = meetings.filter(m => {
                    try {
                        const meetingDate = m.meeting_date ? new Date(m.meeting_date) : (m.created_at ? new Date(m.created_at) : null);
                        if (!meetingDate || isNaN(meetingDate.getTime())) return true; // Include if date is invalid
                        return meetingDate >= startDate && meetingDate <= endDate;
                    } catch (err) {
                        console.warn('⚠️ [Reports] fetchMeetingReport - Error parsing date:', m.meeting_date, err);
                        return true; // Include if date parsing fails
                    }
                });
            }

            // Filter by month if selected
            if (dateFilter.month) {
                const [year, month] = dateFilter.month.split('-');
                const startOfMonth = new Date(parseInt(year), parseInt(month) - 1, 1);
                const endOfMonth = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);

                console.log('📅 [Reports] fetchMeetingReport - Filtering by month:', dateFilter.month, 'Range:', startOfMonth, 'to', endOfMonth);

                meetings = meetings.filter(m => {
                    try {
                        const meetingDate = m.meeting_date ? new Date(m.meeting_date) : (m.created_at ? new Date(m.created_at) : null);
                        if (!meetingDate || isNaN(meetingDate.getTime())) return true; // Include if no date
                        return meetingDate >= startOfMonth && meetingDate <= endOfMonth;
                    } catch (err) {
                        return true; // Include if date parsing fails
                    }
                });
                console.log('✅ [Reports] fetchMeetingReport - After month filter:', meetings.length, 'meetings');
            }

            if (isMounted.current) {
                setMeetingReportData(meetings);
                console.log('✅ [Reports] fetchMeetingReport - Success:', meetings.length);
            }
        } catch (err) {
            console.error('❌ [Reports] fetchMeetingReport - Error:', {
                message: err.message,
                response: err.response?.data,
                status: err.response?.status,
                stack: err.stack
            });
            if (isMounted.current) {
                setMeetingReportData([]);
                setError(`Error fetching meeting report: ${err.message || "Unknown error"}`);
            }
        }
    }, [dateFilter]);

    // Fetch complete report with caching and error handling
    const fetchCompleteReport = useCallback(async () => {
        if (!isMounted.current) return;
        try {
            console.log('🔄 [Reports] fetchCompleteReport - Starting...');

            // Use cached data where available, fetch only what's needed
            const now = Date.now();
            const useCache = dataCache.current.lastFetch && (now - dataCache.current.lastFetch) <= dataCache.current.cacheTimeout;

            // Prepare API calls - use cache if available
            const apiCalls = [];
            const callNames = [];

            if (!useCache || !dataCache.current.maintenanceDetails) {
                apiCalls.push(getMaintenanceDetails());
                callNames.push('maintenanceDetails');
            }
            if (!useCache || !dataCache.current.activityPayments) {
                apiCalls.push(getAllPayments());
                callNames.push('activityPayments');
            }
            if (!useCache || !dataCache.current.activityExpenses) {
                apiCalls.push(getAllActivityExpenses());
                callNames.push('activityExpenses');
            }
            if (!useCache || !dataCache.current.expenses) {
                apiCalls.push(getExpenses());
                callNames.push('expenses');
            }
            if (!useCache || !dataCache.current.owners) {
                apiCalls.push(getOwners());
                callNames.push('owners');
            }
            if (!useCache || !dataCache.current.flats) {
                apiCalls.push(getFlats());
                callNames.push('flats');
            }

            // Fetch only what's needed using Promise.allSettled to handle partial failures
            let results = [];
            if (apiCalls.length > 0) {
                console.log(`📡 [Reports] fetchCompleteReport - Fetching ${apiCalls.length} APIs...`);
                results = await Promise.allSettled(apiCalls);

                // Process results and update cache
                results.forEach((result, index) => {
                    const callName = callNames[index];
                    if (result.status === 'fulfilled') {
                        const data = parseArrayResponse(result.value.data, callName);
                        dataCache.current[callName] = data;
                        console.log(`✅ [Reports] fetchCompleteReport - ${callName} fetched:`, data.length);
                    } else {
                        console.error(`❌ [Reports] fetchCompleteReport - ${callName} failed:`, result.reason);
                        // Use cached data if available, otherwise empty array
                        if (!dataCache.current[callName]) {
                            dataCache.current[callName] = [];
                        }
                    }
                });
                dataCache.current.lastFetch = now;
            } else {
                console.log('✅ [Reports] fetchCompleteReport - Using all cached data');
            }

            // Get data from cache
            let allMaintenanceDetails = dataCache.current.maintenanceDetails || [];
            let activityPayments = dataCache.current.activityPayments || [];
            let activityExpenses = dataCache.current.activityExpenses || [];
            let expenses = dataCache.current.expenses || [];
            let allOwners = dataCache.current.owners || [];
            let allFlats = dataCache.current.flats || [];

            // Ensure we have arrays
            if (!Array.isArray(allMaintenanceDetails)) allMaintenanceDetails = [];
            if (!Array.isArray(activityPayments)) activityPayments = [];
            if (!Array.isArray(activityExpenses)) activityExpenses = [];
            if (!Array.isArray(expenses)) expenses = [];
            if (!Array.isArray(allOwners)) allOwners = [];
            if (!Array.isArray(allFlats)) allFlats = [];

            console.log("✅ [Reports] fetchCompleteReport - Raw data counts:", {
                maintenanceDetails: allMaintenanceDetails.length,
                activityPayments: activityPayments.length,
                activityExpenses: activityExpenses.length,
                expenses: expenses.length,
                allOwners: allOwners.length,
                allFlats: allFlats.length
            });

            // Filter maintenance details by wing if explicitly selected in filter, or if user has wing restriction
            const shouldFilterByWing = dateFilter.wing_id || (currentUserWingId !== null);

            let filteredMaintenanceDetails = allMaintenanceDetails;

            if (shouldFilterByWing) {
                const wingId = dateFilter.wing_id || currentUserWingId;

                console.log("Filtering by wing:", wingId);

                // Filter maintenance details by owner's wing
                const wingOwnerIds = new Set(
                    allOwners
                        .filter(o => o.wing_id && parseInt(o.wing_id) === parseInt(wingId))
                        .map(o => parseInt(o.owner_id))
                );

                console.log("Wing owner IDs:", Array.from(wingOwnerIds).slice(0, 5), "...");
                console.log("Maintenance details before wing filter:", filteredMaintenanceDetails.length);

                filteredMaintenanceDetails = filteredMaintenanceDetails.filter(m => {
                    const ownerId = m.owner_id ? parseInt(m.owner_id) : null;
                    return ownerId && wingOwnerIds.has(ownerId);
                });

                console.log("Maintenance details after wing filter:", filteredMaintenanceDetails.length);

                // Filter activity payments by flat's wing
                const wingFlatIds = new Set(
                    allFlats
                        .filter(f => f.wing_id && parseInt(f.wing_id) === parseInt(wingId))
                        .map(f => f.flat_id)
                );
                activityPayments = activityPayments.filter(p =>
                    p.flat_id && wingFlatIds.has(p.flat_id)
                );

                // Note: Activity expenses are not linked to flats/wings, so we don't filter them by wing
                // They are linked to activities which may not have wing associations
                // If you need to filter activity expenses by wing, you'd need to join through activities

                // Filter expenses by wing
                expenses = expenses.filter(e =>
                    e.wing_id && parseInt(e.wing_id) === parseInt(wingId)
                );
            }

            // Filter by date range
            if (dateFilter.startDate && dateFilter.endDate) {
                const startDate = new Date(dateFilter.startDate);
                const endDate = new Date(dateFilter.endDate);
                endDate.setHours(23, 59, 59, 999); // Include entire end date

                // Filter maintenance details by bill date
                filteredMaintenanceDetails = filteredMaintenanceDetails.filter(m => {
                    try {
                        const billDate = m.bill_start_date ? new Date(m.bill_start_date) : (m.created_at ? new Date(m.created_at) : null);
                        if (!billDate || isNaN(billDate.getTime())) return true; // Include if no date available
                        return billDate >= startDate && billDate <= endDate;
                    } catch (err) {
                        console.warn('⚠️ [Reports] fetchCompleteReport - Error parsing maintenance date:', m.bill_start_date, err);
                        return true;
                    }
                });

                activityPayments = activityPayments.filter(p => {
                    try {
                        if (!p.payment_date) return false;
                        const paymentDate = new Date(p.payment_date);
                        if (isNaN(paymentDate.getTime())) return false;
                        return paymentDate >= startDate && paymentDate <= endDate;
                    } catch (err) {
                        console.warn('⚠️ [Reports] fetchCompleteReport - Error parsing payment date:', p.payment_date, err);
                        return false;
                    }
                });

                // Activity expenses don't have a date field, use created_at if available, otherwise include all
                activityExpenses = activityExpenses.filter(e => {
                    try {
                        const expenseDate = e.date ? new Date(e.date) : (e.created_at ? new Date(e.created_at) : null);
                        if (!expenseDate || isNaN(expenseDate.getTime())) return true; // Include if no date available
                        return expenseDate >= startDate && expenseDate <= endDate;
                    } catch (err) {
                        console.warn('⚠️ [Reports] fetchCompleteReport - Error parsing activity expense date:', e.date, err);
                        return true;
                    }
                });

                expenses = expenses.filter(e => {
                    try {
                        if (!e.date) return false;
                        const expenseDate = new Date(e.date);
                        if (isNaN(expenseDate.getTime())) return false;
                        return expenseDate >= startDate && expenseDate <= endDate;
                    } catch (err) {
                        console.warn('⚠️ [Reports] fetchCompleteReport - Error parsing expense date:', e.date, err);
                        return false;
                    }
                });
            }

            console.log("Complete Report - After filtering:", {
                maintenanceDetails: filteredMaintenanceDetails.length,
                activityPayments: activityPayments.length,
                activityExpenses: activityExpenses.length,
                expenses: expenses.length
            });

            // Debug: Log sample data to see structure
            if (filteredMaintenanceDetails.length > 0) {
                console.log("Sample maintenance detail:", filteredMaintenanceDetails[0]);
            }
            if (activityExpenses.length > 0) {
                console.log("Sample activity expense:", activityExpenses[0]);
            }

            // Calculate breakdowns by payment mode
            const normalizePaymentMode = (mode) => {
                if (!mode) return "Other";
                const modeLower = mode.toLowerCase();
                if (modeLower.includes("cash")) return "Cash";
                if (modeLower.includes("upi")) return "UPI";
                if (modeLower.includes("bank") || modeLower.includes("transfer")) return "Bank Transfer";
                return mode; // Return original if no match
            };

            // Helper function to group by payment mode
            const groupByPaymentMode = (items, amountField) => {
                const grouped = {};
                items.forEach(item => {
                    const mode = normalizePaymentMode(item.payment_mode);
                    if (!grouped[mode]) {
                        grouped[mode] = 0;
                    }
                    const amount = parseFloat(item[amountField] || 0);
                    grouped[mode] += amount;
                });
                return grouped;
            };

            // Calculate totals by payment mode
            // NOTE: Maintenance Collected = Sum of all paid_amount from maintenance_detail table (only paid amounts, NOT pending)
            // Now that maintenance_detail has payment_mode, we can group by payment mode
            const maintenanceCollectedByMode = groupByPaymentMode(filteredMaintenanceDetails, "paid_amount");

            // Group by payment mode for other categories
            const expenseByMode = groupByPaymentMode(expenses, "amount");
            const activityPaymentByMode = groupByPaymentMode(activityPayments, "amount");
            const activityExpenseByMode = groupByPaymentMode(activityExpenses, "amount");

            // Calculate total maintenance collected
            const totalMaintenanceCollected = Object.values(maintenanceCollectedByMode).reduce((sum, val) => sum + val, 0);

            console.log("Totals by mode:", {
                maintenanceCollectedByMode,
                expenseByMode,
                activityPaymentByMode,
                activityExpenseByMode
            });

            // Get all unique payment modes
            const allModes = new Set([
                ...Object.keys(maintenanceCollectedByMode),
                ...Object.keys(expenseByMode),
                ...Object.keys(activityPaymentByMode),
                ...Object.keys(activityExpenseByMode),
            ]);

            // Calculate totals
            // totalMaintenanceCollected is already calculated above from filteredMaintenanceDetails
            const totalExpense = Object.values(expenseByMode).reduce((sum, val) => sum + val, 0);
            const totalActivityPayment = Object.values(activityPaymentByMode).reduce((sum, val) => sum + val, 0);
            const totalActivityExpense = Object.values(activityExpenseByMode).reduce((sum, val) => sum + val, 0);

            // Calculate balances by payment mode
            const maintenanceBalanceByMode = {};
            const activityBalanceByMode = {};
            const totalBalanceByMode = {};

            allModes.forEach(mode => {
                const maintCollected = maintenanceCollectedByMode[mode] || 0;
                const expense = expenseByMode[mode] || 0;
                maintenanceBalanceByMode[mode] = maintCollected - expense;

                const actPayment = activityPaymentByMode[mode] || 0;
                const actExpense = activityExpenseByMode[mode] || 0;
                activityBalanceByMode[mode] = actPayment - actExpense;

                totalBalanceByMode[mode] = maintenanceBalanceByMode[mode] + activityBalanceByMode[mode];
            });

            // Calculate grand totals
            const totalMaintenanceBalance = totalMaintenanceCollected - totalExpense;
            const totalActivityBalance = totalActivityPayment - totalActivityExpense;
            const grandTotalBalance = totalMaintenanceBalance + totalActivityBalance;

            if (isMounted.current) {
                setCompleteReportData({
                    maintenanceCollectedByMode,
                    expenseByMode,
                    maintenanceBalanceByMode,
                    activityPaymentByMode,
                    activityExpenseByMode,
                    activityBalanceByMode,
                    totalBalanceByMode,
                    totalMaintenanceCollected,
                    totalExpense,
                    totalMaintenanceBalance,
                    totalActivityPayment,
                    totalActivityExpense,
                    totalActivityBalance,
                    grandTotalBalance,
                    allModes: Array.from(allModes).sort(),
                });
                console.log('✅ [Reports] fetchCompleteReport - Success');
            }
        } catch (err) {
            console.error('❌ [Reports] fetchCompleteReport - Error:', {
                message: err.message,
                response: err.response?.data,
                status: err.response?.status,
                stack: err.stack
            });
            if (isMounted.current) {
                setCompleteReportData(null);
                setError(`Error fetching complete report: ${err.message || "Unknown error"}`);
            }
        }
    }, [dateFilter, currentUserWingId]);

    // Fetch active report when activeReport, dateFilter, or searchFilter changes
    useEffect(() => {
        fetchActiveReport();
    }, [activeReport, dateFilter, currentUserWingId]);

    // Debounced search filter - apply filters after user stops typing
    useEffect(() => {
        if (activeReport === "owner" && searchFilter.ownerSearch) {
            const timeoutId = setTimeout(() => {
                if (isMounted.current) {
                    fetchActiveReport();
                }
            }, 500); // Wait 500ms after user stops typing

            return () => clearTimeout(timeoutId);
        } else if (activeReport === "rental" && searchFilter.rentalSearch) {
            const timeoutId = setTimeout(() => {
                if (isMounted.current) {
                    fetchActiveReport();
                }
            }, 500); // Wait 500ms after user stops typing

            return () => clearTimeout(timeoutId);
        }
    }, [searchFilter, activeReport]);

    const handleDateFilterChange = (e) => {
        try {
            const { name, value } = e.target;
            setDateFilter(prev => ({ ...prev, [name]: value }));
            setError(""); // Clear error on filter change
        } catch (err) {
            console.error('❌ [Reports] handleDateFilterChange - Error:', err);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleEmail = async () => {
        const reportTitle = getReportTitle();
        const emailSubject = `${reportTitle} - ${new Date().toLocaleDateString()}`;
        const emailBody = `Please find attached the ${reportTitle}.\n\nGenerated on: ${new Date().toLocaleString()}`;

        const mailtoLink = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
        window.location.href = mailtoLink;
    };

    const getReportTitle = () => {
        const titles = {
            owner: "Owner Report",
            maintenance: "Maintenance Report",
            expense: "Expense Report",
            rental: "Rental Report",
            meeting: "Meeting Report",
            complete: "Complete Report",
        };
        return titles[activeReport] || "Report";
    };

    const getCurrentReportData = () => {
        try {
            switch (activeReport) {
                case "owner":
                    return Array.isArray(ownerReportData) ? ownerReportData : [];
                case "maintenance":
                    return Array.isArray(maintenanceReportData) ? maintenanceReportData : [];
                case "expense":
                    return Array.isArray(expenseReportData) ? expenseReportData : [];
                case "rental":
                    return Array.isArray(rentalReportData) ? rentalReportData : [];
                case "meeting":
                    return Array.isArray(meetingReportData) ? meetingReportData : [];
                case "complete":
                    return completeReportData; // This is an object, not an array
                default:
                    return [];
            }
        } catch (err) {
            console.error('❌ [Reports] getCurrentReportData - Error:', err);
            return [];
        }
    };

    const getReportSummary = () => {
        try {
            const data = getCurrentReportData();

            // Handle complete report separately (it's an object, not an array)
            if (activeReport === "complete") {
                return completeReportData ? {
                    totalMaintenanceCollected: completeReportData.totalMaintenanceCollected || 0,
                    totalExpense: completeReportData.totalExpense || 0,
                    grandTotalBalance: completeReportData.grandTotalBalance || 0,
                } : {};
            }

            // Ensure data is an array for other reports
            if (!Array.isArray(data)) {
                console.warn('⚠️ [Reports] getReportSummary - Data is not an array:', { activeReport, data });
                return { total: 0 };
            }

            switch (activeReport) {
                case "owner":
                    return {
                        total: data.length,
                        totalFlats: data.reduce((sum, o) => sum + (o.flat_no ? 1 : 0), 0),
                    };
                case "maintenance":
                    const totalAmount = data.reduce((sum, m) => sum + parseFloat(m.total_amount || 0), 0);
                    const paidAmount = data.reduce((sum, m) => sum + parseFloat(m.paid_amount || 0), 0);
                    const pendingAmount = totalAmount - paidAmount;
                    return {
                        total: data.length,
                        totalAmount: totalAmount,
                        paidAmount: paidAmount,
                        pendingAmount: pendingAmount,
                    };
                case "expense":
                    const totalExpense = data.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
                    return {
                        total: data.length,
                        totalAmount: totalExpense,
                    };
                case "rental":
                    return {
                        total: data.length,
                    };
                case "meeting":
                    return {
                        total: data.length,
                    };
                default:
                    return {};
            }
        } catch (err) {
            console.error('❌ [Reports] getReportSummary - Error:', err);
            return {};
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(amount || 0);
    };

    const formatDate = (dateString) => {
        if (!dateString) return "-";
        return new Date(dateString).toLocaleDateString('en-IN');
    };

    const reportTypes = [
        { id: "owner", label: "Owner Report", icon: "👥" },
        { id: "maintenance", label: "Maintenance Report", icon: "🧾" },
        { id: "expense", label: "Expense Report", icon: "💵" },
        { id: "rental", label: "Rental Report", icon: "🏠" },
        { id: "meeting", label: "Meeting Report", icon: "🗓️" },
        { id: "complete", label: "Complete Report", icon: "📊" },
    ];

    const summary = getReportSummary();
    const reportData = getCurrentReportData();

    return (
        <div className="reports-container">
            <div className="reports-header">
                <div className="header-left">
                    <h2>📊 {reportType || "Reports"}</h2>
                    <p>Generate and export detailed reports</p>
                </div>
                <div className="header-actions">
                    <button className="btn-print" onClick={handlePrint}>
                        🖨️ Print
                    </button>
                    <button className="btn-email" onClick={handleEmail}>
                        📧 Email
                    </button>
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div style={{
                    color: 'red',
                    marginBottom: '15px',
                    padding: '10px',
                    backgroundColor: '#ffe6e6',
                    borderRadius: '4px',
                    fontSize: '14px'
                }}>
                    ⚠️ {error}
                </div>
            )}

            {/* Filters */}
            <div className="reports-filters">
                {/* Owner Report: Only show search bar */}
                {activeReport === "owner" ? (
                    <>
                        <div className="filter-group" style={{ flex: '1 1 300px', minWidth: '300px' }}>
                            <label>Search by Flat Number or Owner Name</label>
                            <input
                                type="text"
                                name="ownerSearch"
                                placeholder="Enter flat number or owner name"
                                value={searchFilter.ownerSearch || ""}
                                onChange={(e) => {
                                    console.log('🔍 [Reports] Search input changed:', e.target.value);
                                    setSearchFilter(prev => ({ ...prev, ownerSearch: e.target.value }));
                                }}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        fetchActiveReport();
                                    }
                                }}
                                style={{ width: '100%', padding: '8px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ddd' }}
                            />
                        </div>
                        <div className="filter-group">
                            <button className="btn-filter" onClick={fetchActiveReport}>
                                🔍 Search
                            </button>
                            <button
                                className="btn-reset"
                                onClick={() => {
                                    setSearchFilter(prev => ({ ...prev, ownerSearch: "" }));
                                    fetchActiveReport();
                                }}
                            >
                                🔄 Clear
                            </button>
                        </div>
                    </>
                ) : activeReport === "rental" ? (
                    <>
                        {/* Rental Report: Only Wing and Search filters */}
                        <div className="filter-group">
                            <label>Wing</label>
                            <select
                                name="wing_id"
                                value={dateFilter.wing_id}
                                onChange={handleDateFilterChange}
                                disabled={currentUserWingId !== null} // Disable if user has wing restriction
                            >
                                {currentUserWingId === null ? (
                                    <option value="">All Wings</option>
                                ) : null}
                                {wings.map((wing) => (
                                    <option key={wing.wing_id} value={wing.wing_id}>
                                        {wing.wing_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="filter-group" style={{ flex: '1 1 300px', minWidth: '300px' }}>
                            <label>Search by Flat Number or Name</label>
                            <input
                                type="text"
                                name="rentalSearch"
                                placeholder="Enter flat number or owner/tenant name"
                                value={searchFilter.rentalSearch || ""}
                                onChange={(e) => setSearchFilter(prev => ({ ...prev, rentalSearch: e.target.value }))}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        fetchActiveReport();
                                    }
                                }}
                                style={{ width: '100%', padding: '8px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ddd' }}
                            />
                        </div>
                        <div className="filter-group">
                            <button className="btn-filter" onClick={fetchActiveReport}>
                                🔍 Search
                            </button>
                            <button
                                className="btn-reset"
                                onClick={() => {
                                    const resetFilter = {
                                        startDate: "",
                                        endDate: "",
                                        month: "",
                                        wing_id: currentUserWingId !== null ? currentUserWingId.toString() : ""
                                    };
                                    setDateFilter(resetFilter);
                                    setSearchFilter(prev => ({ ...prev, rentalSearch: "" }));
                                    fetchActiveReport();
                                }}
                            >
                                🔄 Clear
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Other reports: Show all filters */}
                        <div className="filter-group">
                            <label>Start Date</label>
                            <input
                                type="date"
                                name="startDate"
                                value={dateFilter.startDate}
                                onChange={handleDateFilterChange}
                            />
                        </div>
                        <div className="filter-group">
                            <label>End Date</label>
                            <input
                                type="date"
                                name="endDate"
                                value={dateFilter.endDate}
                                onChange={handleDateFilterChange}
                            />
                        </div>
                        <div className="filter-group">
                            <label>Month</label>
                            <input
                                type="month"
                                name="month"
                                value={dateFilter.month}
                                onChange={handleDateFilterChange}
                            />
                        </div>
                        <div className="filter-group">
                            <label>Wing</label>
                            <select
                                name="wing_id"
                                value={dateFilter.wing_id}
                                onChange={handleDateFilterChange}
                                disabled={currentUserWingId !== null} // Disable if user has wing restriction
                            >
                                {currentUserWingId === null ? (
                                    <option value="">All Wings</option>
                                ) : null}
                                {wings.map((wing) => (
                                    <option key={wing.wing_id} value={wing.wing_id}>
                                        {wing.wing_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="filter-group">
                            <button className="btn-filter" onClick={fetchActiveReport}>
                                🔍 Apply Filters
                            </button>
                            <button
                                className="btn-reset"
                                onClick={() => {
                                    const resetFilter = {
                                        startDate: "",
                                        endDate: "",
                                        month: "",
                                        wing_id: currentUserWingId !== null ? currentUserWingId.toString() : ""
                                    };
                                    setDateFilter(resetFilter);
                                    setSearchFilter({ flatNumber: "", name: "", ownerSearch: "", rentalSearch: "" });
                                }}
                            >
                                🔄 Reset
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Report Tabs - Only show if no specific reportType is passed */}
            {!reportType && (
                <div className="reports-tabs">
                    {reportTypes.map((type) => (
                        <button
                            key={type.id}
                            className={`tab-button ${activeReport === type.id ? "active" : ""}`}
                            onClick={() => setActiveReport(type.id)}
                        >
                            <span className="tab-icon">{type.icon}</span>
                            <span className="tab-label">{type.label}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* Report Content */}
            <div className="report-content" ref={reportRef}>
                {loading ? (
                    <div className="loading-state">Loading report data...</div>
                ) : (
                    <>
                        {/* Report Header */}
                        <div className="report-header print-header">
                            <div className="report-title-section">
                                <h1>{reportType || getReportTitle()}</h1>
                                <p className="report-meta">
                                    Generated on: {new Date().toLocaleString('en-IN')}
                                    {dateFilter.startDate && dateFilter.endDate && (
                                        <span> | Period: {formatDate(dateFilter.startDate)} to {formatDate(dateFilter.endDate)}</span>
                                    )}
                                    {dateFilter.wing_id && (
                                        <span> | Wing: {wings.find(w => w.wing_id === parseInt(dateFilter.wing_id))?.wing_name || "All"}</span>
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* Summary Cards */}
                        <div className="report-summary">
                            {activeReport === "owner" && (
                                <>
                                    <div className="summary-card">
                                        <div className="summary-label">Total Owners</div>
                                        <div className="summary-value">{summary.total}</div>
                                    </div>
                                    <div className="summary-card">
                                        <div className="summary-label">Total Flats</div>
                                        <div className="summary-value">{summary.totalFlats}</div>
                                    </div>
                                </>
                            )}
                            {activeReport === "maintenance" && (
                                <>
                                    <div className="summary-card">
                                        <div className="summary-label">Total Records</div>
                                        <div className="summary-value">{summary.total}</div>
                                    </div>
                                    <div className="summary-card">
                                        <div className="summary-label">Total Amount</div>
                                        <div className="summary-value">{formatCurrency(summary.totalAmount)}</div>
                                    </div>
                                    <div className="summary-card">
                                        <div className="summary-label">Paid Amount</div>
                                        <div className="summary-value success">{formatCurrency(summary.paidAmount)}</div>
                                    </div>
                                    <div className="summary-card">
                                        <div className="summary-label">Pending Amount</div>
                                        <div className="summary-value warning">{formatCurrency(summary.pendingAmount)}</div>
                                    </div>
                                </>
                            )}
                            {activeReport === "expense" && (
                                <>
                                    <div className="summary-card">
                                        <div className="summary-label">Total Expenses</div>
                                        <div className="summary-value">{summary.total}</div>
                                    </div>
                                    <div className="summary-card">
                                        <div className="summary-label">Total Amount</div>
                                        <div className="summary-value">{formatCurrency(summary.totalAmount)}</div>
                                    </div>
                                </>
                            )}
                            {(activeReport === "rental" || activeReport === "meeting") && (
                                <div className="summary-card">
                                    <div className="summary-label">Total Records</div>
                                    <div className="summary-value">{summary.total}</div>
                                </div>
                            )}
                        </div>

                        {/* Report Table */}
                        <div className="report-table-container">
                            {activeReport === "owner" && (
                                <table className="report-table">
                                    <thead>
                                        <tr>
                                            <th>Sr. No.</th>
                                            <th>Owner Name</th>
                                            <th>Flat No</th>
                                            <th>Contact</th>
                                            <th>Email</th>
                                            <th>Wing</th>
                                            <th>Residence</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reportData.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" className="no-data">No data available</td>
                                            </tr>
                                        ) : (
                                            reportData.map((owner, index) => (
                                                <tr key={owner.owner_id}>
                                                    <td>{index + 1}</td>
                                                    <td>{owner.owner_name}</td>
                                                    <td>{owner.flat_no || "-"}</td>
                                                    <td>{owner.owner_contactno || "-"}</td>
                                                    <td>{owner.owner_email || "-"}</td>
                                                    <td>{wings.find(w => w.wing_id === owner.wing_id)?.wing_name || "-"}</td>
                                                    <td>{(owner.is_residence === 1 || owner.is_residence === '1' || owner.is_residence === true) ? "Yes" : "No"}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            )}

                            {activeReport === "maintenance" && (
                                <table className="report-table">
                                    <thead>
                                        <tr>
                                            <th>Sr. No.</th>
                                            <th>Owner Name</th>
                                            <th>Bill Period</th>
                                            <th>Total Amount</th>
                                            <th>Paid Amount</th>
                                            <th>Pending Amount</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reportData.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" className="no-data">No data available</td>
                                            </tr>
                                        ) : (
                                            reportData.map((maintenance, index) => {
                                                // Use owner_name directly from maintenance data (now included in backend query)
                                                const ownerName = maintenance.owner_name || "-";
                                                const pending = parseFloat(maintenance.total_amount || 0) - parseFloat(maintenance.paid_amount || 0);
                                                return (
                                                    <tr key={maintenance.maintain_id}>
                                                        <td>{index + 1}</td>
                                                        <td>{ownerName}</td>
                                                        <td>
                                                            {formatDate(maintenance.bill_start_date)} - {formatDate(maintenance.bill_end_date)}
                                                        </td>
                                                        <td>{formatCurrency(maintenance.total_amount)}</td>
                                                        <td className="success">{formatCurrency(maintenance.paid_amount)}</td>
                                                        <td className="warning">{formatCurrency(pending)}</td>
                                                        <td>
                                                            <span className={`status-badge ${maintenance.status?.toLowerCase() || "pending"}`}>
                                                                {maintenance.status || "Pending"}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            )}

                            {activeReport === "expense" && (
                                <table className="report-table">
                                    <thead>
                                        <tr>
                                            <th>Sr. No.</th>
                                            <th>Date</th>
                                            <th>Category</th>
                                            <th>Description</th>
                                            <th>Amount</th>
                                            <th>Payment Mode</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reportData.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" className="no-data">No data available</td>
                                            </tr>
                                        ) : (
                                            reportData.map((expense, index) => (
                                                <tr key={expense.exp_id}>
                                                    <td>{index + 1}</td>
                                                    <td>{formatDate(expense.date)}</td>
                                                    <td>{expense.catg_name || "-"}</td>
                                                    <td>{expense.description || "-"}</td>
                                                    <td>{formatCurrency(expense.amount)}</td>
                                                    <td>{expense.payment_mode || "-"}</td>
                                                    <td>
                                                        <span className={`status-badge ${expense.payment_status?.toLowerCase()}`}>
                                                            {expense.payment_status || "Pending"}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            )}

                            {activeReport === "rental" && (
                                <table className="report-table">
                                    <thead>
                                        <tr>
                                            <th>Sr. No.</th>
                                            <th>Flat No</th>
                                            <th>Owner</th>
                                            <th>Tenant</th>
                                            <th>Start Date</th>
                                            <th>End Date</th>
                                            <th>Monthly Rent</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reportData.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" className="no-data">No data available</td>
                                            </tr>
                                        ) : (
                                            reportData.map((rental, index) => (
                                                <tr key={rental.rental_id}>
                                                    <td>{index + 1}</td>
                                                    <td>{rental.flat_no || "-"}</td>
                                                    <td>{rental.owner_name || "-"}</td>
                                                    <td>{rental.tenant_name || "-"}</td>
                                                    <td>{formatDate(rental.start_date)}</td>
                                                    <td>{formatDate(rental.end_date)}</td>
                                                    <td>{formatCurrency(rental.monthly_rent)}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            )}

                            {activeReport === "meeting" && (
                                <table className="report-table">
                                    <thead>
                                        <tr>
                                            <th>Sr. No.</th>
                                            <th>Meeting Date</th>
                                            <th>Title</th>
                                            <th>Agenda</th>
                                            <th>Location</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reportData.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" className="no-data">No data available</td>
                                            </tr>
                                        ) : (
                                            reportData.map((meeting, index) => (
                                                <tr key={meeting.meeting_id}>
                                                    <td>{index + 1}</td>
                                                    <td>{formatDate(meeting.meeting_date)}</td>
                                                    <td>{meeting.meeting_name || "-"}</td>
                                                    <td>{meeting.purpose || "-"}</td>
                                                    <td>{meeting.description || "-"}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            )}

                            {activeReport === "complete" && completeReportData && (
                                <div className="complete-report">
                                    {/* Summary Section */}
                                    <div className="complete-report-summary">
                                        <h3>📊 Financial Summary</h3>
                                        <div className="summary-grid">
                                            <div className="summary-item">
                                                <div className="summary-label">Total Maintenance Collected</div>
                                                <div className="summary-value success">{formatCurrency(completeReportData.totalMaintenanceCollected)}</div>
                                            </div>
                                            <div className="summary-item">
                                                <div className="summary-label">Total Expense</div>
                                                <div className="summary-value danger">{formatCurrency(completeReportData.totalExpense)}</div>
                                            </div>
                                            <div className="summary-item">
                                                <div className="summary-label">Maintenance Balance</div>
                                                <div className={`summary-value balance-maintenance ${completeReportData.totalMaintenanceBalance < 0 ? 'negative' : ''}`}>
                                                    {formatCurrency(completeReportData.totalMaintenanceBalance)}
                                                </div>
                                            </div>
                                            <div className="summary-item">
                                                <div className="summary-label">Activity Total Payment</div>
                                                <div className="summary-value success">{formatCurrency(completeReportData.totalActivityPayment)}</div>
                                            </div>
                                            <div className="summary-item">
                                                <div className="summary-label">Activity Total Expense</div>
                                                <div className="summary-value danger">{formatCurrency(completeReportData.totalActivityExpense)}</div>
                                            </div>
                                            <div className="summary-item">
                                                <div className="summary-label">Activity Balance</div>
                                                <div className={`summary-value balance-activity ${completeReportData.totalActivityBalance < 0 ? 'negative' : ''}`}>
                                                    {formatCurrency(completeReportData.totalActivityBalance)}
                                                </div>
                                            </div>
                                            <div className="summary-item highlight">
                                                <div className="summary-label">Total Balance / Profit</div>
                                                <div className={`summary-value balance-total ${completeReportData.grandTotalBalance < 0 ? 'negative' : ''}`}>
                                                    {formatCurrency(completeReportData.grandTotalBalance)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Payment Breakdown by Payment Mode */}
                                    <div className="payment-mode-breakdown">
                                        <h3>💳 Payment Breakdown by Payment Mode</h3>
                                        <div className="report-table-container">
                                            <table className="report-table payment-breakdown-table">
                                                <colgroup>
                                                    <col style={{ width: '12.5%' }} />
                                                    <col style={{ width: '12.5%' }} />
                                                    <col style={{ width: '12.5%' }} />
                                                    <col style={{ width: '12.5%' }} />
                                                    <col style={{ width: '12.5%' }} />
                                                    <col style={{ width: '12.5%' }} />
                                                    <col style={{ width: '12.5%' }} />
                                                    <col style={{ width: '12.5%' }} />
                                                </colgroup>
                                                <thead>
                                                    <tr>
                                                        <th>Payment Mode</th>
                                                        <th>Maintenance Collected</th>
                                                        <th>Expense</th>
                                                        <th>Maintenance Balance</th>
                                                        <th>Activity Payment</th>
                                                        <th>Activity Expense</th>
                                                        <th>Activity Balance</th>
                                                        <th>Total Balance</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(() => {
                                                        // Define payment modes in consistent order (priority order)
                                                        const priorityModes = ['UPI', 'Cash', 'Bank Transfer', 'Other'];

                                                        // Get all modes from data
                                                        const allModesFromData = completeReportData.allModes || [];

                                                        // Create ordered list: priority modes first, then any other modes
                                                        const orderedModes = [
                                                            ...priorityModes.filter(mode => allModesFromData.includes(mode)),
                                                            ...allModesFromData.filter(mode => !priorityModes.includes(mode))
                                                        ];

                                                        // Filter to only show modes that have data
                                                        const modesWithData = orderedModes.filter(mode => {
                                                            const hasMaintenance = (completeReportData.maintenanceCollectedByMode[mode] || 0) > 0;
                                                            const hasExpense = (completeReportData.expenseByMode[mode] || 0) > 0;
                                                            const hasActivityPayment = (completeReportData.activityPaymentByMode[mode] || 0) > 0;
                                                            const hasActivityExpense = (completeReportData.activityExpenseByMode[mode] || 0) > 0;
                                                            return hasMaintenance || hasExpense || hasActivityPayment || hasActivityExpense;
                                                        });

                                                        if (modesWithData.length === 0) {
                                                            return (
                                                                <tr>
                                                                    <td colSpan="8" className="no-data">No data available</td>
                                                                </tr>
                                                            );
                                                        }

                                                        return modesWithData.map((mode) => {
                                                            const maintCollected = completeReportData.maintenanceCollectedByMode[mode] || 0;
                                                            const expense = completeReportData.expenseByMode[mode] || 0;
                                                            const maintBalance = completeReportData.maintenanceBalanceByMode[mode] || 0;
                                                            const actPayment = completeReportData.activityPaymentByMode[mode] || 0;
                                                            const actExpense = completeReportData.activityExpenseByMode[mode] || 0;
                                                            const actBalance = completeReportData.activityBalanceByMode[mode] || 0;
                                                            const totalBalance = completeReportData.totalBalanceByMode[mode] || 0;

                                                            return (
                                                                <tr key={mode}>
                                                                    <td><strong>{mode}</strong></td>
                                                                    <td className="success">{formatCurrency(maintCollected)}</td>
                                                                    <td className="danger">{formatCurrency(expense)}</td>
                                                                    <td className={`balance-maintenance ${maintBalance < 0 ? 'negative' : ''}`}>
                                                                        {formatCurrency(maintBalance)}
                                                                    </td>
                                                                    <td className="success">{formatCurrency(actPayment)}</td>
                                                                    <td className="danger">{formatCurrency(actExpense)}</td>
                                                                    <td className={`balance-activity ${actBalance < 0 ? 'negative' : ''}`}>
                                                                        {formatCurrency(actBalance)}
                                                                    </td>
                                                                    <td className={`balance-total ${totalBalance < 0 ? 'negative' : ''}`}>
                                                                        <strong>{formatCurrency(totalBalance)}</strong>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        });
                                                    })()}

                                                </tbody>
                                                <tfoot>
                                                    <tr className="total-row">
                                                        <td><strong>GRAND TOTAL</strong></td>
                                                        <td className="success"><strong>{formatCurrency(completeReportData.totalMaintenanceCollected)}</strong></td>
                                                        <td className="danger"><strong>{formatCurrency(completeReportData.totalExpense)}</strong></td>
                                                        <td className={`balance-maintenance ${completeReportData.totalMaintenanceBalance < 0 ? 'negative' : ''}`}>
                                                            <strong>{formatCurrency(completeReportData.totalMaintenanceBalance)}</strong>
                                                        </td>
                                                        <td className="success"><strong>{formatCurrency(completeReportData.totalActivityPayment)}</strong></td>
                                                        <td className="danger"><strong>{formatCurrency(completeReportData.totalActivityExpense)}</strong></td>
                                                        <td className={`balance-activity ${completeReportData.totalActivityBalance < 0 ? 'negative' : ''}`}>
                                                            <strong>{formatCurrency(completeReportData.totalActivityBalance)}</strong>
                                                        </td>
                                                        <td className={`balance-total ${completeReportData.grandTotalBalance < 0 ? 'negative' : ''}`}>
                                                            <strong>{formatCurrency(completeReportData.grandTotalBalance)}</strong>
                                                        </td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Formula Section */}
                                    <div className="formula-section">
                                        <h3
                                            onClick={() => setIsFormulaExpanded(!isFormulaExpanded)}
                                            style={{ cursor: 'pointer', userSelect: 'none' }}
                                        >
                                            {isFormulaExpanded ? '▼' : '▶'} 📐 Calculation Formulas
                                        </h3>
                                        {isFormulaExpanded && (
                                            <div className="formula-list">
                                                <div className="formula-item">
                                                    <strong>Maintenance Balance</strong> = Total Maintenance Collected - Total Expense
                                                    <div className="formula-result">
                                                        = {formatCurrency(completeReportData.totalMaintenanceCollected)} - {formatCurrency(completeReportData.totalExpense)}
                                                        = <span className={completeReportData.totalMaintenanceBalance >= 0 ? 'success' : 'danger'}>
                                                            {formatCurrency(completeReportData.totalMaintenanceBalance)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="formula-item">
                                                    <strong>Activity Balance</strong> = Activity Total Payment - Activity Total Expense
                                                    <div className="formula-result">
                                                        = {formatCurrency(completeReportData.totalActivityPayment)} - {formatCurrency(completeReportData.totalActivityExpense)}
                                                        = <span className={completeReportData.totalActivityBalance >= 0 ? 'success' : 'danger'}>
                                                            {formatCurrency(completeReportData.totalActivityBalance)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="formula-item highlight">
                                                    <strong>Total Balance / Profit</strong> = Maintenance Balance + Activity Balance
                                                    <div className="formula-result">
                                                        = {formatCurrency(completeReportData.totalMaintenanceBalance)} + {formatCurrency(completeReportData.totalActivityBalance)}
                                                        = <span className={completeReportData.grandTotalBalance >= 0 ? 'success' : 'danger'}>
                                                            <strong>{formatCurrency(completeReportData.grandTotalBalance)}</strong>
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeReport === "complete" && !completeReportData && (
                                <div className="no-data">No data available for complete report</div>
                            )}
                        </div>

                        {/* Report Footer */}
                        <div className="report-footer print-footer">
                            <p>This report was generated by {user?.user_name || "System"} on {new Date().toLocaleString('en-IN')}</p>
                            <p className="footer-note">SocietySync Management System</p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Reports;

