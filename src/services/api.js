import axios from "axios";

const API = axios.create({
    baseURL: "http://localhost:5000/api", // your Node.js backend base URL
});

// ================= Wings =================
// Fetch wings
export const getWings = () => API.get("/wings");

// ================= Users =================
// Register user
export const registerUser = (userData) => API.post("/users", userData);

// Login user
export const loginUser = (credentials) => API.post("/auth/login", credentials);

// ================= Society =================
export const createSociety = (data) => API.post("/societies", data);
export const updateSociety = (id, data) => API.put(`/societies/${id}`, data);
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
export const getOwners = () => API.get("/owners");
export const addOwner = (data) => API.post("/owners/add", data);
export const updateOwner = (id, data) => API.put(`/owners/update/${id}`, data);
export const deleteOwner = (id, reason) => API.put(`/owners/delete/${id}`, { reason });
export const restoreOwner = (id) => API.put(`/owners/restore/${id}`);

///================= Rental =================
// Create rental
export const addRental = (data) => API.post(`/rental/add`, data);

// Get all rentals
export const getRentals = () => API.get(`/rental`);

// Update rental
export const updateRental = (id, data) => API.put(`/rental/update/${id}`, data);

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
export const createMeeting = (data) => API.post("/meetings", data);
export const updateMeeting = (id, data) => API.put(`/meetings/${id}`, data);
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

// ================= Activity Payments =================
export const getAllPayments = () => API.get("/activity-payments");
export const getPaymentById = (id) => API.get(`/activity-payments/${id}`);
export const createPayment = (data) => API.post("/activity-payments", data);
export const updatePayment = (id, data) => API.put(`/activity-payments/${id}`, data);
export const deletePayment = (id, reason) =>
    API.delete(`/activity-payments/${id}`, { data: { reason } });
export const restorePayment = (id) => API.put(`/activity-payments/restore/${id}`);

// ================= ACTIVITY EXPENSE =================
export const getAllActivityExpenses = () => API.get("/activity-expenses");
export const createActivityExpense = (data) => API.post("/activity-expenses", data);
export const updateActivityExpense = (id, data) => API.put(`/activity-expenses/${id}`, data);
export const deleteActivityExpense = (id, reason) =>
    API.delete(`/activity-expenses/${id}`, { data: { reason } });
export const restoreActivityExpense = (id) => API.put(`/activity-expenses/restore/${id}`);

// ================= EXPENSES =================

// Get all expenses
export const getExpenses = () => API.get("/expenses");

// Get expense by ID
export const getExpenseById = (id) => API.get(`/expenses/${id}`);

// Create a new expense
export const createExpense = (data) => API.post("/expenses", data);

// Update an existing expense
export const updateExpense = (id, data) => API.put(`/expenses/${id}`, data);

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
