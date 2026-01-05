import axios from "axios";

// const API = axios.create({
//     baseURL: "http://localhost:5000/api", // your Node.js backend base URL
// });

const API = axios.create({
    baseURL: "https://impendent-dormant-lakeshia.ngrok-free.dev/api",
    headers: {
        'ngrok-skip-browser-warning': 'true',
        'Content-Type': 'application/json',
    },
});

// Add request interceptor to ensure ngrok header is always sent
API.interceptors.request.use(
    (config) => {
        // Ensure ngrok header is always present
        if (!config.headers['ngrok-skip-browser-warning']) {
            config.headers['ngrok-skip-browser-warning'] = 'true';
        }
        return config;
    },
    (error) => {
        console.error('❌ [API] Request interceptor error:', error);
        return Promise.reject(error);
    }
);

// Add response interceptor to handle HTML responses (ngrok warning pages) and ensure data is always in expected format
API.interceptors.response.use(
    (response) => {
        // Check if response is HTML (ngrok warning page)
        if (typeof response.data === 'string' && response.data.includes('<!DOCTYPE html>')) {
            console.error('⚠️ [API] Received HTML instead of JSON - ngrok warning page detected for:', response.config?.url);
            return Promise.reject(new Error('Received HTML response. Please check ngrok configuration.'));
        }

        // Ensure array responses are always arrays
        const url = response.config?.url || '';

        // Handle wings endpoint
        if (url.includes('/wings')) {
            if (!Array.isArray(response.data)) {
                console.warn(`⚠️ [API] Wings response is not an array, converting:`, {
                    url,
                    dataType: typeof response.data,
                    data: response.data
                });
                if (response.data && Array.isArray(response.data.data)) {
                    response.data = response.data.data;
                } else if (response.data && typeof response.data === 'object') {
                    const arrayKey = Object.keys(response.data).find(key => Array.isArray(response.data[key]));
                    if (arrayKey) {
                        response.data = response.data[arrayKey];
                    } else {
                        response.data = [];
                    }
                } else {
                    response.data = [];
                }
                console.log(`✅ [API] Converted wings response to array:`, response.data);
            }
        }

        // Handle owners endpoint
        if (url.includes('/owners') && !url.includes('/add') && !url.includes('/update') && !url.includes('/delete') && !url.includes('/restore')) {
            if (!Array.isArray(response.data)) {
                console.warn(`⚠️ [API] Owners response is not an array, converting:`, {
                    url,
                    dataType: typeof response.data,
                    data: response.data
                });
                if (response.data && Array.isArray(response.data.data)) {
                    response.data = response.data.data;
                } else if (response.data && typeof response.data === 'object') {
                    const arrayKey = Object.keys(response.data).find(key => Array.isArray(response.data[key]));
                    if (arrayKey) {
                        response.data = response.data[arrayKey];
                    } else {
                        response.data = [];
                    }
                } else {
                    response.data = [];
                }
                console.log(`✅ [API] Converted owners response to array:`, response.data);
            }
        }

        // Handle floors endpoint
        if (url.includes('/floors') && !url.includes('/update') && !url.includes('/delete') && !url.includes('/restore')) {
            if (!Array.isArray(response.data)) {
                console.warn(`⚠️ [API] Floors response is not an array, converting:`, {
                    url,
                    dataType: typeof response.data,
                    data: response.data
                });
                if (response.data && Array.isArray(response.data.data)) {
                    response.data = response.data.data;
                } else if (response.data && typeof response.data === 'object') {
                    const arrayKey = Object.keys(response.data).find(key => Array.isArray(response.data[key]));
                    if (arrayKey) {
                        response.data = response.data[arrayKey];
                    } else {
                        response.data = [];
                    }
                } else {
                    response.data = [];
                }
                console.log(`✅ [API] Converted floors response to array:`, response.data);
            }
        }

        // Handle flattype endpoint
        if (url.includes('/flattype') && !url.includes('/update') && !url.includes('/delete') && !url.includes('/restore')) {
            if (!Array.isArray(response.data)) {
                console.warn(`⚠️ [API] FlatTypes response is not an array, converting:`, {
                    url,
                    dataType: typeof response.data,
                    data: response.data
                });
                if (response.data && Array.isArray(response.data.data)) {
                    response.data = response.data.data;
                } else if (response.data && typeof response.data === 'object') {
                    const arrayKey = Object.keys(response.data).find(key => Array.isArray(response.data[key]));
                    if (arrayKey) {
                        response.data = response.data[arrayKey];
                    } else {
                        response.data = [];
                    }
                } else {
                    response.data = [];
                }
                console.log(`✅ [API] Converted flattypes response to array:`, response.data);
            }
        }

        return response;
    },
    (error) => {
        // Handle errors
        if (error.response && typeof error.response.data === 'string' && error.response.data.includes('<!DOCTYPE html>')) {
            console.error('❌ [API] Error response is HTML - ngrok warning page for:', error.config?.url);
            error.message = 'Received HTML response. Please check ngrok configuration.';
        }
        return Promise.reject(error);
    }
);

// ================= Wings =================
// Fetch wings

export const getWings = () => API.post("/wings");

// ================= Users =================
// Register user
export const registerUser = (userData) => API.post("/users", userData);

// Get all users
export const getAllUsers = () => API.get("/users");

// Update user
export const updateUser = (id, userData) => API.put(`/users/${id}`, userData);

// Delete user
export const deleteUser = (id, reason) => API.delete(`/users/${id}`, { data: { deleted_reason: reason } });

// Login user
export const loginUser = (credentials) => API.post("/auth/login", credentials);

// Forgot Password
export const requestPasswordReset = (data) => API.post("/auth/forgot-password", data);
export const verifyResetToken = (token) => API.post("/auth/verify-reset-token", { token });
export const resetPassword = (data) => API.post("/auth/reset-password", data);

// ================= Society =================
export const createSociety = (data) => API.post("/societies", data);
export const updateSociety = (id, data, logoFile = null, qrImageFile = null) => {
    if (logoFile || qrImageFile) {
        const formData = new FormData();
        // Append all form fields as strings
        Object.keys(data).forEach(key => {
            if (data[key] !== null && data[key] !== undefined) {
                // Convert booleans to strings for FormData
                if (typeof data[key] === 'boolean') {
                    formData.append(key, data[key] ? '1' : '0');
                } else {
                    formData.append(key, String(data[key]));
                }
            }
        });
        if (logoFile) {
            formData.append('logo', logoFile);
        }
        if (qrImageFile) {
            formData.append('qrImage', qrImageFile);
        }
        return API.put(`/societies/${id}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    }
    // Send as JSON when no file
    return API.put(`/societies/${id}`, data);
};
export const deleteSociety = (id, reason) => API.delete(`/societies/${id}`, { data: { deleted_reason: reason } });
export const restoreSociety = (id) => API.patch(`/societies/restore/${id}`);
export const getSocieties = () => API.get("/societies"); // if you ever need list

// ================= Flats =================
export const getFlats = () => API.get("/flats");
export const createFlat = (data) => API.post("/flats", data);
export const updateFlat = (id, data) => API.put(`/flats/${id}`, data);
export const deleteFlat = (id, reason) => API.put(`/flats/delete/${id}`, { reason });
export const restoreFlat = (id) => API.patch(`/flats/restore/${id}`);

// ================= Flat Types =================
export const getFlatTypes = () => API.get("/flattype");
export const createFlatType = (data) => API.post("/flattype", data);
export const updateFlatType = (id, data) => API.put(`/flattype/${id}`, data);
export const deleteFlatType = (id, reason) => API.put(`/flattype/delete/${id}`, { reason });
export const restoreFlatType = (id) => API.patch(`/flattype/restore/${id}`);

// ================= Floors =================
export const getFloors = () => API.get("/floors");
export const createFloor = (data) => API.post("/floors", data);
export const updateFloor = (id, data) => API.put(`/floors/${id}`, data);
export const deleteFloor = (id, reason) => API.put(`/floors/delete/${id}`, { reason });
export const restoreFloor = (id) => API.patch(`/floors/restore/${id}`);

// ================= Owner =================
export const getOwners = () => API.post("/owners");
export const addOwner = (data, files = null) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
        if (data[key] !== null && data[key] !== undefined) {
            formData.append(key, data[key]);
        }
    });
    // Support both single file and array of files
    if (files) {
        if (Array.isArray(files)) {
            files.forEach(file => {
                if (file) {
                    formData.append('attachment', file);
                }
            });
        } else {
            formData.append('attachment', files);
        }
    }
    return API.post("/owners/add", formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
};
export const updateOwner = (id, data, files = null) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
        if (data[key] !== null && data[key] !== undefined) {
            // For owner_contactno, if it's null or empty string, send empty string (backend will convert to null)
            // FormData doesn't handle null well, so we send empty string and let backend handle conversion
            formData.append(key, data[key]);
        }
    });
    // Support both single file and array of files
    if (files) {
        if (Array.isArray(files)) {
            console.log('📤 [API] updateOwner - Adding files to FormData:', {
                fileCount: files.length,
                fileNames: files.map(f => f?.name || 'invalid'),
                fileTypes: files.map(f => f?.type || 'unknown')
            });
            files.forEach((file, index) => {
                if (file && file instanceof File) {
                    formData.append('attachment', file);
                    console.log(`✅ [API] updateOwner - File ${index + 1} added to FormData:`, file.name);
                } else {
                    console.warn(`⚠️ [API] updateOwner - File ${index + 1} is not a valid File object:`, file);
                }
            });
        } else {
            if (files instanceof File) {
                formData.append('attachment', files);
                console.log('✅ [API] updateOwner - Single file added to FormData:', files.name);
            } else {
                console.warn('⚠️ [API] updateOwner - Single file is not a valid File object:', files);
            }
        }
    } else {
        console.log('ℹ️ [API] updateOwner - No files to send');
    }
    
    // Log FormData contents (for debugging)
    console.log('📋 [API] updateOwner - FormData entries:', {
        hasFiles: files ? (Array.isArray(files) ? files.length : 1) : 0,
        formDataKeys: Array.from(formData.keys())
    });
    
    return API.put(`/owners/update/${id}`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
};
export const deleteOwner = (id, reason) => API.put(`/owners/delete/${id}`, { reason });
export const restoreOwner = (id) => API.put(`/owners/restore/${id}`);

///================= Rental =================
// Create rental
export const addRental = (data, files = []) => {
    const formData = new FormData();

    // Append all form fields
    Object.keys(data).forEach(key => {
        if (data[key] !== null && data[key] !== undefined) {
            formData.append(key, data[key]);
        }
    });

    // Append files if provided (support multiple files)
    if (files && files.length > 0) {
        files.forEach((file) => {
            formData.append('rental_agreement', file);
        });
    }

    return API.post(`/rental/add`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
};

// Get all rentals
export const getRentals = () => API.get(`/rental`);

// Update rental
export const updateRental = (id, data, files = []) => {
    const formData = new FormData();

    // Append all form fields
    Object.keys(data).forEach(key => {
        if (data[key] !== null && data[key] !== undefined) {
            formData.append(key, data[key]);
        }
    });

    // Append files if provided (support multiple files)
    if (files && files.length > 0) {
        files.forEach((file) => {
            formData.append('rental_agreement', file);
        });
    }

    return API.put(`/rental/update/${id}`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
};

// Soft delete rental
export const deleteRental = (id, reason) => API.put(`/rental/delete/${id}`, { reason });

// Restore rental
export const restoreRental = (id) => API.put(`/rental/restore/${id}`);

// Get flat details by flat number
export const getFlatDetails = (flat_no) => API.get(`/rental/flats/${flat_no}`);

// ================= Categories =================
export const getCategories = () => API.get("/categories");
export const getCategoryById = (id) => API.get(`/categories/${id}`);
export const createCategory = (data) => API.post("/categories", data);
export const updateCategory = (id, data) => API.put(`/categories/${id}`, data);
export const deleteCategory = (id, reason) => API.delete(`/categories/${id}`, { data: { reason } });
export const restoreCategory = (id) => API.put(`/categories/restore/${id}`);

// ================= Meetings =================
export const getMeetings = () => API.get("/meetings");
export const getMeetingById = (id) => API.get(`/meetings/${id}`);
export const getMeetingAttendance = (id) => API.get(`/meetings/${id}/attendance`);
export const updateMeetingAttendance = (meetingId, attendance) => API.put(`/meetings/${meetingId}/attendance`, { attendance });
export const getAbsenteeWarnings = () => API.get("/meetings/warnings/absentees");
export const sendAbsenteeWarningByEmail = (ownerId) => API.post("/meetings/warnings/absentees/email", { owner_id: ownerId });
export const sendAbsenteeWarningByWhatsApp = (ownerId) => API.post("/meetings/warnings/absentees/whatsapp", { owner_id: ownerId });
export const sendAbsenteeWarningBySMS = (ownerId) => API.post("/meetings/warnings/absentees/sms", { owner_id: ownerId });
export const createMeeting = (data, files = null) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
        if (data[key] !== null && data[key] !== undefined) {
            formData.append(key, data[key]);
        }
    });
    // Support both single file and array of files
    if (files) {
        if (Array.isArray(files)) {
            files.forEach(file => {
                if (file) {
                    formData.append('attachment', file);
                }
            });
        } else {
            formData.append('attachment', files);
        }
    }
    return API.post("/meetings", formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
};
export const updateMeeting = (id, data, files = null) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
        // Always send attachment_url even if null (for deletions)
        // FormData converts null to string "null", so send empty string or JSON string
        if (key === 'attachment_url') {
            const value = data[key];
            if (value === null || value === undefined) {
                formData.append(key, '');
            } else {
                formData.append(key, value);
            }
        } else if (data[key] !== null && data[key] !== undefined) {
            formData.append(key, data[key]);
        }
    });
    // Support both single file and array of files
    if (files) {
        if (Array.isArray(files)) {
            files.forEach(file => {
                if (file) {
                    formData.append('attachment', file);
                }
            });
        } else {
            formData.append('attachment', files);
        }
    }
    return API.put(`/meetings/${id}`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
};
export const deleteMeeting = (id, reason) => API.delete(`/meetings/${id}`, { data: { reason } });
export const restoreMeeting = (id) => API.put(`/meetings/restore/${id}`);

// ================= Activities =================
export const getActivities = () => API.get("/activities");
export const getActivityById = (id) => API.get(`/activities/${id}`);
export const createActivity = (data) => API.post("/activities", data);
export const updateActivity = (id, data) => API.put(`/activities/${id}`, data);
export const deleteActivity = (id, reason) =>
    API.delete(`/activities/${id}`, { data: { reason } });
export const restoreActivity = (id) => API.put(`/activities/restore/${id}`);

// ================= Activity Expenses =================
export const getAllActivityExpenses = () => API.get("/activity-expenses");
export const getActivityExpenseById = (id) => API.get(`/activity-expenses/${id}`);
export const createActivityExpense = (data, files = null) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
        if (data[key] !== null && data[key] !== undefined) {
            formData.append(key, data[key]);
        }
    });
    // Support both single file and array of files
    if (files) {
        if (Array.isArray(files)) {
            files.forEach(file => {
                if (file) {
                    formData.append('attachment', file);
                }
            });
        } else {
            formData.append('attachment', files);
        }
    }
    return API.post("/activity-expenses", formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
};
export const updateActivityExpense = (id, data, files = null) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
        // Always send attachment_url even if null (for deletions)
        // FormData converts null to string "null", so send empty string or JSON string
        if (key === 'attachment_url') {
            const value = data[key];
            if (value === null || value === undefined) {
                formData.append(key, '');
            } else {
                formData.append(key, value);
            }
        } else if (data[key] !== null && data[key] !== undefined) {
            formData.append(key, data[key]);
        }
    });
    // Support both single file and array of files
    if (files) {
        if (Array.isArray(files)) {
            files.forEach(file => {
                if (file) {
                    formData.append('attachment', file);
                }
            });
        } else {
            formData.append('attachment', files);
        }
    }
    return API.put(`/activity-expenses/${id}`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
};
export const deleteActivityExpense = (id, reason) =>
    API.delete(`/activity-expenses/${id}`, { data: { reason } });
export const restoreActivityExpense = (id) => API.put(`/activity-expenses/restore/${id}`);

// ================= Activity Payments =================
export const getAllPayments = () => API.get("/activity-payments");
export const getPaymentById = (id) => API.get(`/activity-payments/${id}`);
export const createPayment = (data) => API.post("/activity-payments", data);
export const updatePayment = (id, data) => API.put(`/activity-payments/${id}`, data);
export const deletePayment = (id, reason) =>
    API.delete(`/activity-payments/${id}`, { data: { reason } });
export const restorePayment = (id) => API.put(`/activity-payments/restore/${id}`);
export const sendInvitationByEmail = (id) => API.post(`/activity-payments/${id}/send-invitation/email`);
export const sendInvitationByWhatsApp = (id) => API.post(`/activity-payments/${id}/send-invitation/whatsapp`);


// ================= EXPENSES =================

// Get all expenses
export const getExpenses = () => API.get("/expenses");

// Get expense by ID
export const getExpenseById = (id) => API.get(`/expenses/${id}`);

// Create a new expense
export const createExpense = (data, files = null) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
        if (data[key] !== null && data[key] !== undefined) {
            formData.append(key, data[key]);
        }
    });
    // Support both single file and array of files
    if (files) {
        if (Array.isArray(files)) {
            files.forEach(file => {
                if (file) {
                    formData.append('attachment', file);
                }
            });
        } else {
            formData.append('attachment', files);
        }
    }
    return API.post("/expenses", formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
};

// Update an existing expense
export const updateExpense = (id, data, files = null) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
        // Always send attachment_url even if null (for deletions)
        // FormData converts null to string "null", so send empty string or JSON string
        if (key === 'attachment_url') {
            const value = data[key];
            if (value === null || value === undefined) {
                formData.append(key, '');
            } else {
                formData.append(key, value);
            }
        } else if (data[key] !== null && data[key] !== undefined) {
            formData.append(key, data[key]);
        }
    });
    // Support both single file and array of files
    if (files) {
        if (Array.isArray(files)) {
            files.forEach(file => {
                if (file) {
                    formData.append('attachment', file);
                }
            });
        } else {
            formData.append('attachment', files);
        }
    }
    return API.put(`/expenses/${id}`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
};

// Soft delete expense (with reason)
export const deleteExpense = (id, reason) =>
    API.delete(`/expenses/${id}`, { data: { reason } });

// Restore deleted expense
export const restoreExpense = (id) => API.put(`/expenses/restore/${id}`);

// ================= Maintenance Component =================
export const getMaintenanceComponents = () => API.get("/maintenance-components");
export const addMaintenanceComponent = (data) => API.post("/maintenance-components/add", data);
export const updateMaintenanceComponent = (id, data) => API.put(`/maintenance-components/update/${id}`, data);
export const deleteMaintenanceComponent = (id, reason) =>
    API.put(`/maintenance-components/delete/${id}`, { reason });
export const restoreMaintenanceComponent = (id) => API.put(`/maintenance-components/restore/${id}`);

// ================= Maintenance Rate =================
export const getMaintenanceRates = () => API.get("/maintenance-rates");
export const addMaintenanceRate = (data) => API.post("/maintenance-rates/add", data);
export const updateMaintenanceRate = (id, data) => API.put(`/maintenance-rates/update/${id}`, data);
export const deleteMaintenanceRate = (id, reason) =>
    API.put(`/maintenance-rates/delete/${id}`, { reason });
export const restoreMaintenanceRate = (id) => API.put(`/maintenance-rates/restore/${id}`);

// ================= Maintenance Detail =================
export const getMaintenanceDetails = () => API.get("/maintenance-details");
export const addMaintenanceDetail = (data) => API.post("/maintenance-details/add", data);
export const updateMaintenanceDetail = (id, data) => API.put(`/maintenance-details/update/${id}`, data);
export const deleteMaintenanceDetail = (id, reason) =>
    API.put(`/maintenance-details/delete/${id}`, { reason });
export const restoreMaintenanceDetail = (id) => API.put(`/maintenance-details/restore/${id}`);

// ================= Maintenance Payment =================
export const getMaintenancePayments = () => API.get("/maintenance-payments");
export const addMaintenancePayment = (data) => API.post("/maintenance-payments", data);
export const updateMaintenancePayment = (id, data) => API.put(`/maintenance-payments/${id}`, data);
export const deleteMaintenancePayment = (id, reason) =>
    API.put(`/maintenance-payments/${id}`, { reason });
export const restoreMaintenancePayment = (id) => API.put(`/maintenance-payments/${id}`);

// ================= Maintenance Receipt & Reminders =================
// Generate and send receipt via email
export const sendReceiptByEmail = (maintainId) => API.post(`/maintenance-details/${maintainId}/send-receipt/email`);

// Generate and send receipt via WhatsApp
export const sendReceiptByWhatsApp = (maintainId) => API.post(`/maintenance-details/${maintainId}/send-receipt/whatsapp`);

// Send bill via Email
export const sendBillByEmail = (maintainId) => API.post(`/maintenance-details/${maintainId}/send-bill/email`);

// Send bill via WhatsApp
export const sendBillByWhatsApp = (maintainId) => API.post(`/maintenance-details/${maintainId}/send-bill/whatsapp`);

// Send monthly reminders to all owners
export const sendMonthlyReminders = () => API.post("/maintenance-details/send-monthly-reminders");

// Generate bills automatically for a specific month
export const generateBillsForMonth = (year, month, sendEmail = true, sendWhatsApp = true) => 
    API.post("/maintenance-details/generate-bills-for-month", { year, month, sendEmail, sendWhatsApp });

// ================= Role Delegation =================
// Get all users (for delegation selection)
export const getUsers = () => API.get("/users");

// Create role delegation
export const createRoleDelegation = (data) => API.post("/role-delegations", data);

// Get all role delegations
export const getRoleDelegations = () => API.get("/role-delegations");

// Get role delegations for current user
export const getMyDelegations = (userId) => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const user_id = userId || user?.user_id;
    return API.get(`/role-delegations/my-delegations${user_id ? `?user_id=${user_id}` : ""}`);
};

// Update role delegation
export const updateRoleDelegation = (id, data) => API.put(`/role-delegations/${id}`, data);

// Revoke role delegation
export const revokeRoleDelegation = (id) => API.put(`/role-delegations/${id}/revoke`);

// ================= Parking =================
export const getParking = () => API.get("/parking/get");
export const addParking = (data, files = null) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
        if (data[key] !== null && data[key] !== undefined) {
            formData.append(key, data[key]);
        }
    });
    // Support both single file and array of files
    if (files) {
        if (Array.isArray(files)) {
            console.log('📤 [API] addParking - Adding files to FormData:', {
                fileCount: files.length,
                fileNames: files.map(f => f?.name || 'invalid'),
                fileTypes: files.map(f => f?.type || 'unknown')
            });
            files.forEach((file, index) => {
                if (file && file instanceof File) {
                    formData.append('attachment', file);
                    console.log(`✅ [API] addParking - File ${index + 1} added to FormData:`, file.name);
                } else {
                    console.warn(`⚠️ [API] addParking - File ${index + 1} is not a valid File object:`, file);
                }
            });
        } else {
            if (files instanceof File) {
                formData.append('attachment', files);
                console.log('✅ [API] addParking - Single file added to FormData:', files.name);
            } else {
                console.warn('⚠️ [API] addParking - Single file is not a valid File object:', files);
            }
        }
    } else {
        console.log('ℹ️ [API] addParking - No files to send');
    }
    
    return API.post("/parking/add", formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
};
export const updateParking = (id, data, files = null) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
        if (data[key] !== null && data[key] !== undefined) {
            formData.append(key, data[key]);
        }
    });
    // Support both single file and array of files
    if (files) {
        if (Array.isArray(files)) {
            console.log('📤 [API] updateParking - Adding files to FormData:', {
                fileCount: files.length,
                fileNames: files.map(f => f?.name || 'invalid'),
                fileTypes: files.map(f => f?.type || 'unknown')
            });
            files.forEach((file, index) => {
                if (file && file instanceof File) {
                    formData.append('attachment', file);
                    console.log(`✅ [API] updateParking - File ${index + 1} added to FormData:`, file.name);
                } else {
                    console.warn(`⚠️ [API] updateParking - File ${index + 1} is not a valid File object:`, file);
                }
            });
        } else {
            if (files instanceof File) {
                formData.append('attachment', files);
                console.log('✅ [API] updateParking - Single file added to FormData:', files.name);
            } else {
                console.warn('⚠️ [API] updateParking - Single file is not a valid File object:', files);
            }
        }
    } else {
        console.log('ℹ️ [API] updateParking - No files to send');
    }
    
    // Log FormData contents (for debugging)
    console.log('📋 [API] updateParking - FormData entries:', {
        hasFiles: files ? (Array.isArray(files) ? files.length : 1) : 0,
        formDataKeys: Array.from(formData.keys())
    });
    
    return API.put(`/parking/update/${id}`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
};
export const deleteParking = (id, reason) => API.put(`/parking/delete/${id}`, { reason });
export const restoreParking = (id) => API.put(`/parking/restore/${id}`);

// ================= Complaints =================
export const getComplaints = () => API.get("/complaints/get");
export const addComplaint = (data, files = null) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
        if (data[key] !== null && data[key] !== undefined) {
            formData.append(key, data[key]);
        }
    });
    // Support both single file and array of files
    if (files) {
        if (Array.isArray(files)) {
            files.forEach(file => {
                if (file) {
                    formData.append('attachment', file);
                }
            });
        } else {
            formData.append('attachment', files);
        }
    }
    return API.post("/complaints/add", formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
};
export const updateComplaint = (id, data, files = null) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
        if (data[key] !== null && data[key] !== undefined) {
            formData.append(key, data[key]);
        }
    });
    // Support both single file and array of files
    if (files) {
        if (Array.isArray(files)) {
            files.forEach(file => {
                if (file) {
                    formData.append('attachment', file);
                }
            });
        } else {
            formData.append('attachment', files);
        }
    }
    return API.put(`/complaints/update/${id}`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
};
export const deleteComplaint = (id, reason) => API.put(`/complaints/delete/${id}`, { reason });
export const restoreComplaint = (id) => API.put(`/complaints/restore/${id}`);

// ================= Subscription =================
export const getSubscriptionStatus = (socId) => API.get(`/subscription/status/${socId}`);
export const getSubscriptionByWing = (wingId) => API.get(`/subscription/status-by-wing/${wingId}`);
export const getAllSubscriptions = () => API.get("/subscription");
export const createOrUpdateSubscription = (data) => API.post("/subscription", data);
export const checkAndCreateLockFile = (socId) => API.post(`/subscription/check-lock/${socId}`);

// ================= Notifications =================
export const getNotifications = (userData) => API.post("/notifications/get", userData);
export const getUnreadNotificationCount = (userData) => API.post("/notifications/unread-count", userData);
export const markNotificationAsRead = (data) => API.post("/notifications/mark-read", data);
export const markAllNotificationsAsRead = (userData) => API.post("/notifications/mark-all-read", userData);
export const createNotification = (data) => API.post("/notifications/create", data);
export const deleteNotification = (id) => API.delete(`/notifications/${id}`);

// ================= Invitations =================
export const getInvitations = () => API.get("/invitations");
export const addInvitation = (data, files = []) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
        if (data[key] !== null && data[key] !== undefined) {
            formData.append(key, data[key]);
        }
    });
    if (files && files.length > 0) {
        files.forEach(file => {
            formData.append('attachment', file);
        });
    }
    return API.post("/invitations/add", formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
};
export const updateInvitation = (id, data, files = []) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
        // Always send attachment_url even if null (for deletions)
        // FormData converts null to string "null", so send empty string or JSON string
        if (key === 'attachment_url') {
            const value = data[key];
            if (value === null || value === undefined) {
                formData.append(key, '');
            } else {
                formData.append(key, value);
            }
        } else if (data[key] !== null && data[key] !== undefined) {
            formData.append(key, data[key]);
        }
    });
    if (files && files.length > 0) {
        files.forEach(file => {
            formData.append('attachment', file);
        });
    }
    return API.put(`/invitations/update/${id}`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
};
export const deleteInvitation = (id, reason) => API.put(`/invitations/delete/${id}`, { reason });
export const restoreInvitation = (id) => API.put(`/invitations/restore/${id}`);
export const sendInvitationEmail = (id, target_audience = 'all', wing_id = null, selected_owner_ids = null) => 
    API.post(`/invitations/send-email/${id}`, { target_audience, wing_id, selected_owner_ids });
export const sendInvitationWhatsApp = (id, target_audience = 'all', wing_id = null, selected_owner_ids = null) => 
    API.post(`/invitations/send-whatsapp/${id}`, { target_audience, wing_id, selected_owner_ids });
export const sendInvitationNotification = (id, target_audience = 'all', wing_id = null, selected_owner_ids = null) => 
    API.post(`/invitations/send-notification/${id}`, { target_audience, wing_id, selected_owner_ids });
