import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getWings, requestPasswordReset } from "../services/api";
import "../css/Login.css";

const ForgotPassword = () => {
    const navigate = useNavigate();
    const [wings, setWings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [wingsLoading, setWingsLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [formData, setFormData] = useState({
        user_name: "",
        wing_id: "",
    });

    React.useEffect(() => {
        const fetchWings = async () => {
            try {
                const res = await getWings();
                const wingsData = Array.isArray(res.data) ? res.data : (res.data?.data || []);
                setWings(wingsData);
            } catch (err) {
                console.error("Error fetching wings:", err);
            } finally {
                setWingsLoading(false);
            }
        };
        fetchWings();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
        setError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setSuccess(false);

        try {
            if (!formData.user_name || !formData.user_name.trim()) {
                setError("Username is required");
                setLoading(false);
                return;
            }

            if (!formData.wing_id) {
                setError("Please select a wing");
                setLoading(false);
                return;
            }

            await requestPasswordReset(formData);
            setSuccess(true);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to send reset email. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="logincontainer">
            <h2 className="logintitle">Forgot Password</h2>
            {success ? (
                <div style={{ textAlign: "center", padding: "20px" }}>
                    <div style={{
                        color: "#28a745",
                        marginBottom: "20px",
                        padding: "15px",
                        backgroundColor: "#d4edda",
                        borderRadius: "8px",
                        fontSize: "14px"
                    }}>
                        <i className="fa-solid fa-check-circle" style={{ marginRight: "8px" }}></i>
                        If an account with that username exists, a password reset email has been sent.
                        Please check your email and follow the instructions.
                    </div>
                    <button
                        className="loginbtn"
                        onClick={() => navigate("/login")}
                        style={{ marginTop: "10px" }}
                    >
                        Back to Login
                    </button>
                </div>
            ) : (
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

                    <p style={{ color: "#666", marginBottom: "20px", fontSize: "14px" }}>
                        Enter your username and wing to receive a password reset link via email.
                    </p>

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
                            {wings.map((wing) => (
                                <option key={wing.wing_id} value={wing.wing_id}>
                                    {wing.wing_name || `Wing ${wing.wing_id}`}
                                </option>
                            ))}
                        </select>
                        <i className="inputicon fa-solid fa-building" />
                    </div>

                    <button
                        type="submit"
                        className="loginbtn"
                        disabled={loading || wingsLoading}
                    >
                        {loading ? "Sending..." : "Send Reset Link"}
                    </button>
                </form>
            )}

            <div className="loginfooter">
                <p
                    className="loginlink"
                    onClick={() => navigate("/login")}
                    style={{ cursor: "pointer", marginTop: "10px" }}
                >
                    Back to Login
                </p>
            </div>
        </div>
    );
};

export default ForgotPassword;
