import React, { useState, useEffect } from "react";
import { getWings, loginUser } from "../services/api";
import { useNavigate } from "react-router-dom";

const Login = () => {
    const navigate = useNavigate();
    const [wings, setWings] = useState([]);
    const [formData, setFormData] = useState({
        user_name: "",
        password: "",
        wing_id: "",
    });

    useEffect(() => {
        const fetchWings = async () => {
            try {
                const res = await getWings();
                setWings(res.data);
            } catch (err) {
                console.error("Error fetching wings:", err);
            }
        };
        fetchWings();
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await loginUser(formData);
            localStorage.setItem("user", JSON.stringify(res.data.user));
            alert("Login successful!");
            navigate("/dashboard");
        } catch (err) {
            alert(err.response?.data?.message || "Invalid credentials!");
            console.error(err);
        }
    };

    return (
        <div className="form-container">
            <h2>Login</h2>
            <form onSubmit={handleSubmit}>
                <label>Username</label>
                <input
                    type="text"
                    name="user_name"
                    value={formData.user_name}
                    onChange={handleChange}
                    required
                />

                <label>Password</label>
                <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                />

                <label>Wing</label>
                <select
                    name="wing_id"
                    value={formData.wing_id}
                    onChange={handleChange}
                    required
                >
                    <option value="">-- Select Wing --</option>
                    {wings.map((wing) => (
                        <option key={wing.wing_id} value={wing.wing_id}>
                            {wing.wing_name}
                        </option>
                    ))}
                </select>

                <button type="submit">Login</button>
            </form>

            <div className="form-footer">
                <p>
                    Don’t have an account?{" "}
                    <span className="link-text" onClick={() => navigate("/register")}>
                        Sign Up
                    </span>
                </p>
                <p
                    className="link-text"
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