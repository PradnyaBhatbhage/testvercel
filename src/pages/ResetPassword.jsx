import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { verifyResetToken, resetPassword } from "../services/api";
import "../css/Login.css";

const ResetPassword = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [token, setToken] = useState("");
    const [formData, setFormData] = useState({
        new_password: "",
        confirm_password: "",
    });

    useEffect(() => {
        const tokenParam = searchParams.get("token");
        if (!tokenParam) {
            setError("Invalid reset link. Please request a new password reset.");
            setVerifying(false);
            return;
        }

        setToken(tokenParam);
        verifyToken(tokenParam);
    }, [searchParams]);

    const verifyToken = async (tokenValue) => {
        try {
            await verifyResetToken(tokenValue);
            setVerifying(false);
        } catch (err) {
            setError(err.response?.data?.message || "Invalid or expired reset link. Please request a new password reset.");
            setVerifying(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
        setError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            if (!formData.new_password || !formData.new_password.trim()) {
                setError("New password is required");
                setLoading(false);
                return;
            }

            if (formData.new_password.length < 6) {
                setError("Password must be at least 6 characters long");
                setLoading(false);
                return;
            }

            if (formData.new_password !== formData.confirm_password) {
                setError("Passwords do not match");
                setLoading(false);
                return;
            }

            await resetPassword({
                token: token,
                new_password: formData.new_password
            });

            setSuccess(true);
            setTimeout(() => {
                navigate("/login");
            }, 3000);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to reset password. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (verifying) {
        return (
            <div className="logincontainer">
                <h2 className="logintitle">Reset Password</h2>
                <div style={{ textAlign: "center", padding: "20px" }}>
                    <p>Verifying reset link...</p>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="logincontainer">
                <h2 className="logintitle">Password Reset</h2>
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
                        Password has been reset successfully! Redirecting to login...
                    </div>
                    <button
                        className="loginbtn"
                        onClick={() => navigate("/login")}
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="logincontainer">
            <h2 className="logintitle">Reset Password</h2>
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

            <form className="loginform" onSubmit={handleSubmit}>
                <div className="inputwrapper">
                    <label className="loginlabel" htmlFor="new_password">New Password</label>
                    <input
                        id="new_password"
                        type="password"
                        name="new_password"
                        className="logininput"
                        placeholder="Enter new password (min. 6 characters)"
                        value={formData.new_password}
                        onChange={handleChange}
                        required
                        disabled={loading}
                        minLength={6}
                    />
                    <i className="inputicon fa-solid fa-lock" />
                </div>

                <div className="inputwrapper">
                    <label className="loginlabel" htmlFor="confirm_password">Confirm Password</label>
                    <input
                        id="confirm_password"
                        type="password"
                        name="confirm_password"
                        className="logininput"
                        placeholder="Confirm new password"
                        value={formData.confirm_password}
                        onChange={handleChange}
                        required
                        disabled={loading}
                        minLength={6}
                    />
                    <i className="inputicon fa-solid fa-lock" />
                </div>

                <button
                    type="submit"
                    className="loginbtn"
                    disabled={loading}
                >
                    {loading ? "Resetting..." : "Reset Password"}
                </button>
            </form>

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

export default ResetPassword;

