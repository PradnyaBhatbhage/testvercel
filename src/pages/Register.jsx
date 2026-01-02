import React, { useState, useEffect } from "react";
import { getWings, registerUser, getOwners } from "../services/api";
import { useNavigate } from "react-router-dom";
import "../css/Register.css";

const Register = () => {
    const navigate = useNavigate();
    const [wings, setWings] = useState([]);
    const [owners, setOwners] = useState([]);
    const [loading, setLoading] = useState(false);
    const [wingsLoading, setWingsLoading] = useState(true);
    const [ownersLoading, setOwnersLoading] = useState(false);
    const [error, setError] = useState("");
    const [formData, setFormData] = useState({
        user_name: "",
        password: "",
        wing_id: "",
        role_type: "user",
        owner_id: "",
    });

    // Fetch wings on component mount
    useEffect(() => {
        const fetchWings = async () => {
            try {
                console.log('🔄 [Register] fetchWings - Starting to fetch wings...');
                setWingsLoading(true);
                setError("");

                const res = await getWings();

                console.log('📊 [Register] fetchWings - API Response:', {
                    status: res.status,
                    statusText: res.statusText,
                    data: res.data,
                    dataType: typeof res.data,
                    isArray: Array.isArray(res.data),
                    dataLength: Array.isArray(res.data) ? res.data.length : 'N/A'
                });

                // Ensure we have valid data
                if (!res || !res.data) {
                    console.error('❌ [Register] fetchWings - Invalid response structure:', res);
                    throw new Error('Invalid response from server');
                }

                // Handle different response structures
                let wingsData = [];
                if (Array.isArray(res.data)) {
                    wingsData = res.data;
                } else if (res.data && Array.isArray(res.data.data)) {
                    wingsData = res.data.data;
                } else if (res.data && typeof res.data === 'object') {
                    // Try to find array property
                    const arrayKey = Object.keys(res.data).find(key => Array.isArray(res.data[key]));
                    if (arrayKey) {
                        wingsData = res.data[arrayKey];
                    } else {
                        console.warn('⚠️ [Register] fetchWings - Response data is not an array:', res.data);
                        wingsData = [];
                    }
                } else {
                    console.warn('⚠️ [Register] fetchWings - Unexpected data type:', typeof res.data);
                    wingsData = [];
                }

                // Final validation
                if (!Array.isArray(wingsData)) {
                    console.error('❌ [Register] fetchWings - wingsData is not an array after processing:', wingsData);
                    throw new Error('Wings data is not in expected format');
                }

                console.log('✅ [Register] fetchWings - Success:', {
                    wingsCount: wingsData.length,
                    wings: wingsData.map(w => ({ id: w.wing_id, name: w.wing_name }))
                });

                setWings(wingsData);
                setWingsLoading(false);
            } catch (err) {
                console.error('❌ [Register] fetchWings - Error:', {
                    message: err.message,
                    response: err.response?.data,
                    status: err.response?.status,
                    statusText: err.response?.statusText,
                    url: err.config?.url,
                    method: err.config?.method,
                    stack: err.stack
                });

                setError("Failed to load wings. Please refresh the page.");
                setWings([]);
                setWingsLoading(false);

                // Show user-friendly error
                if (err.response?.status === 500) {
                    alert("Server error while loading wings. Please try again later.");
                } else if (err.response?.status === 404) {
                    alert("Wings endpoint not found. Please contact administrator.");
                } else if (err.message?.includes('Network Error') || err.code === 'ECONNREFUSED') {
                    alert("Cannot connect to server. Please check your internet connection.");
                } else {
                    alert("Error loading wings: " + (err.response?.data?.message || err.message || "Unknown error"));
                }
            }
        };

        fetchWings();
    }, []);

    // Fetch owners when role_type changes to "owner"
    useEffect(() => {
        const fetchOwners = async () => {
            if (formData.role_type === "owner") {
                try {
                    console.log('🔄 [Register] fetchOwners - Starting to fetch owners...');
                    setOwnersLoading(true);
                    setError("");

                    const res = await getOwners();

                    console.log('📊 [Register] fetchOwners - API Response:', {
                        status: res.status,
                        statusText: res.statusText,
                        data: res.data,
                        dataType: typeof res.data,
                        isArray: Array.isArray(res.data),
                        dataLength: Array.isArray(res.data) ? res.data.length : 'N/A'
                    });

                    // Ensure we have valid data
                    if (!res || !res.data) {
                        console.error('❌ [Register] fetchOwners - Invalid response structure:', res);
                        throw new Error('Invalid response from server');
                    }

                    // Handle different response structures
                    let ownersData = [];
                    if (Array.isArray(res.data)) {
                        ownersData = res.data;
                    } else if (res.data && Array.isArray(res.data.data)) {
                        ownersData = res.data.data;
                    } else if (res.data && typeof res.data === 'object') {
                        // Try to find array property
                        const arrayKey = Object.keys(res.data).find(key => Array.isArray(res.data[key]));
                        if (arrayKey) {
                            ownersData = res.data[arrayKey];
                        } else {
                            console.warn('⚠️ [Register] fetchOwners - Response data is not an array:', res.data);
                            ownersData = [];
                        }
                    } else {
                        console.warn('⚠️ [Register] fetchOwners - Unexpected data type:', typeof res.data);
                        ownersData = [];
                    }

                    // Final validation
                    if (!Array.isArray(ownersData)) {
                        console.error('❌ [Register] fetchOwners - ownersData is not an array after processing:', ownersData);
                        ownersData = [];
                    }

                    console.log('✅ [Register] fetchOwners - Success:', {
                        ownersCount: ownersData.length,
                        owners: ownersData.map(o => ({ id: o.owner_id, name: o.owner_name }))
                    });

                    setOwners(ownersData);
                    setOwnersLoading(false);
                } catch (err) {
                    console.error('❌ [Register] fetchOwners - Error:', {
                        message: err.message,
                        response: err.response?.data,
                        status: err.response?.status,
                        statusText: err.response?.statusText,
                        url: err.config?.url,
                        method: err.config?.method,
                        stack: err.stack
                    });

                    setError("Failed to load owners. Please try again.");
                    setOwners([]);
                    setOwnersLoading(false);

                    // Show user-friendly error
                    if (err.response?.status === 500) {
                        alert("Server error while loading owners. Please try again later.");
                    } else if (err.response?.status === 404) {
                        alert("Owners endpoint not found. Please contact administrator.");
                    } else if (err.message?.includes('Network Error') || err.code === 'ECONNREFUSED') {
                        alert("Cannot connect to server. Please check your internet connection.");
                    } else {
                        alert("Error loading owners: " + (err.response?.data?.message || err.message || "Unknown error"));
                    }
                }
            } else {
                console.log('ℹ️ [Register] fetchOwners - Role is not owner, clearing owners');
                setOwners([]);
                setOwnersLoading(false);
                // Clear owner_id when role changes away from owner
                setFormData(prev => ({ ...prev, owner_id: "" }));
            }
        };

        fetchOwners();
    }, [formData.role_type]);

    const handleChange = (e) => {
        try {
            const { name, value } = e.target;
            console.log('📝 [Register] handleChange:', { name, value });
            setFormData({ ...formData, [name]: value });
            setError(""); // Clear error on input change
        } catch (err) {
            console.error('❌ [Register] handleChange - Error:', err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            console.log('🔄 [Register] handleSubmit - Starting registration process...', {
                user_name: formData.user_name,
                wing_id: formData.wing_id,
                role_type: formData.role_type,
                owner_id: formData.owner_id,
                hasPassword: !!formData.password
            });

            setLoading(true);
            setError("");

            // Validation
            if (!formData.user_name || !formData.user_name.trim()) {
                console.error('❌ [Register] handleSubmit - Validation failed: user_name is empty');
                setError("Username is required");
                setLoading(false);
                return;
            }

            if (formData.user_name.trim().length < 3) {
                console.error('❌ [Register] handleSubmit - Validation failed: user_name too short');
                setError("Username must be at least 3 characters long");
                setLoading(false);
                return;
            }

            if (!formData.password || !formData.password.trim()) {
                console.error('❌ [Register] handleSubmit - Validation failed: password is empty');
                setError("Password is required");
                setLoading(false);
                return;
            }

            if (formData.password.length < 6) {
                console.error('❌ [Register] handleSubmit - Validation failed: password too short');
                setError("Password must be at least 6 characters long");
                setLoading(false);
                return;
            }

            if (!formData.wing_id) {
                console.error('❌ [Register] handleSubmit - Validation failed: wing_id is empty');
                setError("Please select a wing");
                setLoading(false);
                return;
            }

            if (!formData.role_type) {
                console.error('❌ [Register] handleSubmit - Validation failed: role_type is empty');
                setError("Please select a role");
                setLoading(false);
                return;
            }

            // If role is owner, owner_id should be provided
            if (formData.role_type === "owner" && !formData.owner_id) {
                console.error('❌ [Register] handleSubmit - Validation failed: owner_id required for owner role');
                setError("Please select an owner when role is 'Owner'");
                setLoading(false);
                return;
            }

            console.log('📡 [Register] handleSubmit - Sending registration request...');
            const res = await registerUser(formData);

            console.log('📊 [Register] handleSubmit - Registration API Response:', {
                status: res.status,
                statusText: res.statusText,
                data: res.data
            });

            // Validate response
            if (!res || !res.data) {
                console.error('❌ [Register] handleSubmit - Invalid response structure:', res);
                throw new Error('Invalid response from server');
            }

            console.log('✅ [Register] handleSubmit - Registration successful, navigating to login');
            alert("User registered successfully!");
            navigate("/login");
        } catch (err) {
            console.error('❌ [Register] handleSubmit - Error:', {
                message: err.message,
                response: err.response?.data,
                status: err.response?.status,
                statusText: err.response?.statusText,
                url: err.config?.url,
                method: err.config?.method,
                stack: err.stack
            });

            setLoading(false);

            // Handle different error types
            if (err.response?.status === 409) {
                setError("Username already exists. Please choose another one.");
                alert("Username already exists! Please choose a different username.");
            } else if (err.response?.status === 400) {
                const errorMsg = err.response.data?.message || err.response.data?.error || "Invalid request";
                setError(errorMsg);
                alert(errorMsg);
            } else if (err.response?.status === 500) {
                setError("Server error. Please try again later.");
                alert("Server error occurred. Please try again later.");
            } else if (err.message?.includes('Network Error') || err.code === 'ECONNREFUSED') {
                setError("Cannot connect to server");
                alert("Cannot connect to server. Please check your internet connection.");
            } else {
                const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || "Registration failed. Please try again.";
                setError(errorMessage);
                alert(errorMessage);
            }
        }
    };

    return (
        <div className="register-root">
            <div className="form-container">
                <h2>Sign Up</h2>
                {error && (
                    <div style={{
                        color: 'red',
                        marginBottom: '10px',
                        padding: '10px',
                        backgroundColor: '#ffe6e6',
                        borderRadius: '4px',
                        fontSize: '14px'
                    }}>
                        {error}
                    </div>
                )}
                <form onSubmit={handleSubmit}>
                    <label>Username</label>
                    <input
                        className="reg-input"
                        type="text"
                        name="user_name"
                        value={formData.user_name}
                        onChange={handleChange}
                        required
                        disabled={loading}
                        minLength={3}
                    />

                    <label>Password</label>
                    <input
                        className="reg-input"
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        disabled={loading}
                        minLength={6}
                    />

                    <label>Wing</label>
                    <select
                        className="reg-select"
                        name="wing_id"
                        value={formData.wing_id}
                        onChange={handleChange}
                        required
                        disabled={loading || wingsLoading}
                    >
                        <option value="">
                            {wingsLoading ? "Loading wings..." : "-- Select Wing --"}
                        </option>
                        {wingsLoading ? (
                            <option value="" disabled>Loading...</option>
                        ) : wings.length === 0 ? (
                            <option value="" disabled>No wings available</option>
                        ) : (
                            wings.map((wing) => {
                                try {
                                    if (!wing || !wing.wing_id) {
                                        console.warn('⚠️ [Register] Invalid wing object:', wing);
                                        return null;
                                    }
                                    return (
                                        <option key={wing.wing_id} value={wing.wing_id}>
                                            {wing.wing_name || `Wing ${wing.wing_id}`}
                                        </option>
                                    );
                                } catch (err) {
                                    console.error('❌ [Register] Error rendering wing option:', err, wing);
                                    return null;
                                }
                            })
                        )}
                    </select>

                    <label>Role</label>
                    <select
                        className="reg-select"
                        name="role_type"
                        value={formData.role_type}
                        onChange={handleChange}
                        disabled={loading}
                    >
                        <option value="admin">Admin</option>
                        <option value="user">Committee Members</option>
                        <option value="owner">Owner</option>
                    </select>

                    {formData.role_type === "owner" && (
                        <>
                            <label>Select Owner</label>
                            <select
                                className="reg-select"
                                name="owner_id"
                                value={formData.owner_id}
                                onChange={handleChange}
                                required
                                disabled={loading || ownersLoading}
                            >
                                <option value="">
                                    {ownersLoading ? "Loading owners..." : "-- Select Owner --"}
                                </option>
                                {ownersLoading ? (
                                    <option value="" disabled>Loading...</option>
                                ) : owners.length === 0 ? (
                                    <option value="" disabled>No owners available</option>
                                ) : (
                                    owners.map((owner) => {
                                        try {
                                            if (!owner || !owner.owner_id) {
                                                console.warn('⚠️ [Register] Invalid owner object:', owner);
                                                return null;
                                            }
                                            return (
                                                <option key={owner.owner_id} value={owner.owner_id}>
                                                    {owner.owner_name || "Unknown"} - {owner.flat_no || "N/A"}
                                                </option>
                                            );
                                        } catch (err) {
                                            console.error('❌ [Register] Error rendering owner option:', err, owner);
                                            return null;
                                        }
                                    })
                                )}
                            </select>
                        </>
                    )}

                    <button type="submit" disabled={loading || wingsLoading}>
                        {loading ? "Registering..." : "Register"}
                    </button>
                </form>

                <div className="form-footer">
                    <p>
                        Already have an account?{" "}
                        <span className="link-text" onClick={() => navigate("/login")}>
                            Login
                        </span>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;
