import React from "react";

const ForgotPassword = () => {
    return (
        <div className="form-container">
            <h2>Forgot Password</h2>
            <p>Feature coming soon!</p>
            <p style={{ cursor: "pointer", color: "#007bff" }}
                onClick={() => window.location.href = "/login"}>
                Back to Login
            </p>
        </div>
    );
};

export default ForgotPassword;