import React, { useState, useEffect } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import SocietyForm from "../pages/SocietyForm";
import "../css/Dashboard.css";
import FlatOwner from "../pages/FlatOwner";
import RentalDetail from "../pages/RentalDetail";
import Category from "../pages/Category";
import Meeting from "../pages/Meeting";
import Activity from "../pages/Activity";
import ActivityPayment from "../pages/ActivityPayment";
import ActivityExpense from "../pages/ActivityExpense";
import ExpenseEntry from "../pages/ExpenseEntry";
import MaintenanceComponent from "../pages/MaintenanceComponent";
import MaintenanceRate from "../pages/MaintenanceRate";
import MaintenanceDetail from "../pages/MaintenanceDetail";
//import MaintenancePayment from "../pages/MaintenancePayment";
import ComplaintBox from "../pages/ComplaintBox";
import ParkingDetails from "../pages/ParkingDetails";
import RoleAssignment from "../pages/RoleAssignment";
import DashboardContent from "./DashboardContent";
import Settings from "../pages/Settings";
import Reports from "../pages/Reports";
import OwnerReport from "../pages/OwnerReport";
import MaintenanceReport from "../pages/MaintenanceReport";
import Announcements from "../pages/Announcements";
import { initializeReminderService } from "../utils/monthlyReminderService";
import { sendMonthlyReminders, getMyDelegations } from "../services/api";
import { hasModuleAccess, getModuleIdFromMenuLabel, canManageDelegations } from "../utils/permissionChecker";
import { checkCurrentUserSubscription, shouldLockApp } from "../utils/subscriptionCheck";
import SubscriptionLock from "./SubscriptionLock";

const Dashboard = () => {
    // Memoize user to prevent infinite re-renders
    const [user, setUser] = useState(() => {
        const userStr = localStorage.getItem("user");
        return userStr ? JSON.parse(userStr) : null;
    });
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [activeMenu, setActiveMenu] = useState("Home"); // track which menu is active
    const [activeDelegations, setActiveDelegations] = useState([]);
    const [isLocked, setIsLocked] = useState(false);
    const [subscriptionData, setSubscriptionData] = useState(null);
    const [subscriptionLoading, setSubscriptionLoading] = useState(true);
    const [subscriptionChecked, setSubscriptionChecked] = useState(false);

    // Initialize monthly reminder service
    useEffect(() => {
        const cleanup = initializeReminderService(async () => {
            try {
                await sendMonthlyReminders();
            } catch (error) {
                console.error("Error sending monthly reminders:", error);
            }
        });
        return cleanup;
    }, []);

    // Check subscription status on component mount (only once)
    useEffect(() => {
        let isMounted = true; // Flag to prevent state updates if component unmounts

        const checkSubscription = async () => {
            try {
                if (!isMounted) return;
                setSubscriptionLoading(true);

                const subscription = await checkCurrentUserSubscription();
                
                if (!isMounted) return; // Check again after async call
                
                // Debug logging
                console.log('Subscription Check Result:', subscription);
                console.log('Should Lock App:', shouldLockApp(subscription));
                
                if (shouldLockApp(subscription)) {
                    console.log('🔒 Locking app - subscription expired');
                    setIsLocked(true);
                    setSubscriptionData(subscription);
                } else {
                    console.log('✅ Subscription active - allowing access');
                    setIsLocked(false);
                    setSubscriptionData(subscription);
                }
                setSubscriptionChecked(true);
            } catch (error) {
                console.error("Error checking subscription:", error);
                if (!isMounted) return;
                // On error, don't lock (fail open) - you might want to change this
                setIsLocked(false);
                setSubscriptionChecked(true);
            } finally {
                if (isMounted) {
                    setSubscriptionLoading(false);
                }
            }
        };

        // Only check if user is logged in and has wing_id
        const wingId = user?.wing_id;
        if (wingId) {
            checkSubscription();
        } else {
            setSubscriptionLoading(false);
            setSubscriptionChecked(true);
        }

        // Cleanup function
        return () => {
            isMounted = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run once on mount

    // Fetch active delegations for current user
    useEffect(() => {
        const fetchDelegations = async () => {
            try {
                const res = await getMyDelegations();
                const delegationsData = res.data?.data || res.data || [];
                setActiveDelegations(Array.isArray(delegationsData) ? delegationsData : []);
            } catch (err) {
                console.error("Error fetching delegations:", err);
                setActiveDelegations([]);
            }
        };
        fetchDelegations();
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("user");
        window.location.href = "/login";
    };

    const handleSubscriptionRefresh = async () => {
        try {
            const subscription = await checkCurrentUserSubscription();

            if (shouldLockApp(subscription)) {
                setIsLocked(true);
                setSubscriptionData(subscription);
            } else {
                setIsLocked(false);
                setSubscriptionData(subscription);
            }
        } catch (error) {
            console.error("Error refreshing subscription:", error);
        }
    };

    const renderContent = () => {
        // Check if user has access to the requested module
        const moduleId = getModuleIdFromMenuLabel(activeMenu);

        // Home and Role Assignment are special cases
        if (activeMenu === "Home") {
            return <DashboardContent user={user} />;
        }

        if (activeMenu === "Role Assignment") {
            if (canManageDelegations()) {
                return <RoleAssignment />;
            } else {
                return <div style={{ padding: "20px" }}><p>Access Denied: You do not have permission to access Role Assignment.</p></div>;
            }
        }

        // For other modules, check permissions (owners have read-only access to all modules)
        if (moduleId && !hasModuleAccess(moduleId, activeDelegations)) {
            return <div style={{ padding: "20px" }}><p>Access Denied: You do not have permission to access {activeMenu}.</p></div>;
        }

        switch (activeMenu) {
            case "Society":
                return <SocietyForm />;
            case "Flat Owner":
                return <FlatOwner />;
            case "Rental Detail":
                return <RentalDetail />;
            case "Category":
                return <Category />;
            case "Meetings":
                return <Meeting />;
            case "Activity Details":
                return <Activity />;
            case "Activity Payment":
                return <ActivityPayment />;
            case "Activity Expenses":
                return <ActivityExpense />;
            case "Expenses":
                return <ExpenseEntry />;
            case "Maintenance Component":
                return <MaintenanceComponent />;
            case "Maintenance Rate":
                return <MaintenanceRate />;
            case "Maintenance Detail":
                return <MaintenanceDetail />;
            case "Complaint Box":
                return <ComplaintBox />;
            case "Parking Details":
                return <ParkingDetails />;
            case "Settings":
                return <Settings />;
            // case "Maintenance Payment":
            //     return <MaintenancePayment />;
            case "Owner Report":
                return <OwnerReport />;
            case "Maintenance Report":
                return <MaintenanceReport />;
            case "Expense Report":
                return <Reports key="expense" reportType="Expense Report" />;
            case "Rental Report":
                return <Reports key="rental" reportType="Rental Report" />;
            case "Meeting Report":
                return <Reports key="meeting" reportType="Meeting Report" />;
            case "Complete Report":
                return <Reports key="complete" reportType="Complete Report" />;
            case "Announcements":
                return <Announcements />;
            default:
                return <p>Module "{activeMenu}" is under construction.</p>;
        }
    };

    // Show loading state while checking subscription (only show if not checked yet)
    if (subscriptionLoading && !subscriptionChecked) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                fontSize: '18px',
                color: '#666'
            }}>
                Loading...
            </div>
        );
    }

    // Show lock screen if subscription is expired
    if (isLocked && subscriptionChecked) {
        return <SubscriptionLock subscriptionData={subscriptionData} onRefresh={handleSubscriptionRefresh} />;
    }

    return (
        <div className="dashboard-container">
            <Navbar
                user={user}
                onLogout={handleLogout}
                toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            />
            <div className="main-section">
                <Sidebar
                    isOpen={sidebarOpen}
                    user={user}
                    onMenuClick={setActiveMenu}
                    activeDelegations={activeDelegations}
                />
                <div className={`content-section ${sidebarOpen ? "sidebar-open" : ""}`}>
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
