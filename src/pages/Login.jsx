import React, { useState, useEffect } from "react";
import { getWings, loginUser } from "../services/api";
import { useNavigate } from "react-router-dom";
import "../css/Login.css";
import '@fortawesome/fontawesome-free/css/all.min.css';

const Login = () => {
    const navigate = useNavigate();
    const [wings, setWings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [wingsLoading, setWingsLoading] = useState(true);
    const [error, setError] = useState("");
    const [formData, setFormData] = useState({
        user_name: "",
        password: "",
        wing_id: "",
    });

    // Fetch wings on component mount
    useEffect(() => {
        const fetchWings = async () => {
            try {
                console.log('🔄 [Login] fetchWings - Starting to fetch wings...');
                setWingsLoading(true);
                setError("");

                const res = await getWings();

                console.log('📊 [Login] fetchWings - API Response:', {
                    status: res.status,
                    statusText: res.statusText,
                    data: res.data,
                    dataType: typeof res.data,
                    isArray: Array.isArray(res.data),
                    dataLength: Array.isArray(res.data) ? res.data.length : 'N/A'
                });

                // Ensure we have valid data
                if (!res || !res.data) {
                    console.error('❌ [Login] fetchWings - Invalid response structure:', res);
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
                        console.warn('⚠️ [Login] fetchWings - Response data is not an array:', res.data);
                        wingsData = [];
                    }
                } else {
                    console.warn('⚠️ [Login] fetchWings - Unexpected data type:', typeof res.data);
                    wingsData = [];
                }

                // Final validation
                if (!Array.isArray(wingsData)) {
                    console.error('❌ [Login] fetchWings - wingsData is not an array after processing:', wingsData);
                    throw new Error('Wings data is not in expected format');
                }

                console.log('✅ [Login] fetchWings - Success:', {
                    wingsCount: wingsData.length,
                    wings: wingsData.map(w => ({ id: w.wing_id, name: w.wing_name }))
                });

                setWings(wingsData);
                setWingsLoading(false);
            } catch (err) {
                console.error('❌ [Login] fetchWings - Error:', {
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

    const handleChange = (e) => {
        try {
            const { name, value } = e.target;
            console.log('📝 [Login] handleChange:', { name, value });
            setFormData({ ...formData, [name]: value });
            setError(""); // Clear error on input change
        } catch (err) {
            console.error('❌ [Login] handleChange - Error:', err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            console.log('🔄 [Login] handleSubmit - Starting login process...', {
                user_name: formData.user_name,
                wing_id: formData.wing_id,
                hasPassword: !!formData.password
            });

            setLoading(true);
            setError("");

            // Validation
            if (!formData.user_name || !formData.user_name.trim()) {
                console.error('❌ [Login] handleSubmit - Validation failed: user_name is empty');
                setError("Username is required");
                setLoading(false);
                return;
            }

            if (!formData.password || !formData.password.trim()) {
                console.error('❌ [Login] handleSubmit - Validation failed: password is empty');
                setError("Password is required");
                setLoading(false);
                return;
            }

            if (!formData.wing_id) {
                console.error('❌ [Login] handleSubmit - Validation failed: wing_id is empty');
                setError("Please select a wing");
                setLoading(false);
                return;
            }

            console.log('📡 [Login] handleSubmit - Sending login request...');
            const res = await loginUser(formData);

            console.log('📊 [Login] handleSubmit - Login API Response:', {
                status: res.status,
                statusText: res.statusText,
                data: res.data,
                user: res.data?.user
            });

            // Validate response
            if (!res || !res.data) {
                console.error('❌ [Login] handleSubmit - Invalid response structure:', res);
                throw new Error('Invalid response from server');
            }

            if (!res.data.user) {
                console.error('❌ [Login] handleSubmit - User data not found in response:', res.data);
                throw new Error('User data not found in response');
            }

            // Ensure wing_id is stored in user object (from formData if not in response)
            const userData = {
                ...res.data.user,
                wing_id: res.data.user?.wing_id || formData.wing_id
            };

            console.log('💾 [Login] handleSubmit - Saving user data to localStorage:', {
                user_id: userData.user_id,
                user_name: userData.user_name,
                wing_id: userData.wing_id,
                role: userData.role
            });

            localStorage.setItem("user", JSON.stringify(userData));

            console.log('✅ [Login] handleSubmit - Login successful, navigating to dashboard');
            alert("Login successful!");
            navigate("/dashboard");
        } catch (err) {
            console.error('❌ [Login] handleSubmit - Error:', {
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
            if (err.response?.status === 401) {
                setError("Invalid username or password");
                alert("Invalid credentials! Please check your username and password.");
            } else if (err.response?.status === 400) {
                setError(err.response.data?.message || "Invalid request");
                alert(err.response.data?.message || "Invalid request. Please check your input.");
            } else if (err.response?.status === 500) {
                setError("Server error. Please try again later.");
                alert("Server error occurred. Please try again later.");
            } else if (err.message?.includes('Network Error') || err.code === 'ECONNREFUSED') {
                setError("Cannot connect to server");
                alert("Cannot connect to server. Please check your internet connection.");
            } else {
                const errorMessage = err.response?.data?.message || err.message || "Login failed. Please try again.";
                setError(errorMessage);
                alert(errorMessage);
            }
        }
    };

    return (
        <div className="logincontainer">
            <h2 className="logintitle">Login</h2>
            <form className="loginform" onSubmit={handleSubmit}>
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

                <div className="inputwrapper">
                    <label className="loginlabel" htmlFor="username">Username</label>
                    <input
                        id="username"
                        type="text"
                        name="user_name"
                        className="logininput"
                        placeholder="Enter your username"
                        value={formData.user_name}
                        onChange={handleChange}
                        required
                        disabled={loading}
                    />
                    <i className="inputicon fa-solid fa-user" />
                </div>
                <div className="inputwrapper">
                    <label className="loginlabel" htmlFor="password">Password</label>
                    <input
                        id="password"
                        type="password"
                        name="password"
                        className="logininput"
                        placeholder="Enter your password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        disabled={loading}
                    />
                    <i className="inputicon fa-solid fa-lock" />
                </div>
                <div className="inputwrapper">
                    <label className="loginlabel" htmlFor="wing">Wing</label>
                    <select
                        id="wing"
                        name="wing_id"
                        className="loginselect"
                        value={formData.wing_id}
                        onChange={handleChange}
                        required
                        disabled={loading || wingsLoading}
                    >
                        <option value="">
                            {wingsLoading ? "Loading wings..." : "Select your wing"}
                        </option>
                        {wingsLoading ? (
                            <option value="" disabled>Loading...</option>
                        ) : wings.length === 0 ? (
                            <option value="" disabled>No wings available</option>
                        ) : (
                            wings.map((wing) => {
                                try {
                                    if (!wing || !wing.wing_id) {
                                        console.warn('⚠️ [Login] Invalid wing object:', wing);
                                        return null;
                                    }
                                    return (
                                        <option key={wing.wing_id} value={wing.wing_id}>
                                            {wing.wing_name || `Wing ${wing.wing_id}`}
                                        </option>
                                    );
                                } catch (err) {
                                    console.error('❌ [Login] Error rendering wing option:', err, wing);
                                    return null;
                                }
                            })
                        )}
                    </select>
                    <i className="inputicon fa-solid fa-building" />
                </div>
                <button
                    type="submit"
                    className="loginbtn"
                    disabled={loading || wingsLoading}
                >
                    {loading ? "Logging in..." : "Login"}
                </button>
            </form>

            <div className="loginfooter">
                <p>
                    Don't have an account?{" "}
                    <span className="loginlink" onClick={() => navigate("/register")}>
                        Sign Up
                    </span>
                </p>
                <p
                    className="loginlink"
                    onClick={() => navigate("/forgot-password")}
                    style={{ marginTop: "10px" }}
                >
                    Forgot Password?
                </p>
            </div>
        </div>
    );
};

export default Login;
