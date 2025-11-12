import React, { useState, useEffect } from "react";
import { getWings, registerUser } from "../services/api";
import { useNavigate } from "react-router-dom";
import "../css/Register.css";

const Register = () => {
    const navigate = useNavigate();
    const [wings, setWings] = useState([]);
    const [formData, setFormData] = useState({
        user_name: "",
        password: "",
        wing_id: "",
        role_type: "user",
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
            await registerUser(formData);
            alert("User registered successfully!");
            navigate("/login");
        } catch (err) {
            alert("Registration failed!");
            console.error(err);
        }
    };

    return (
        <div className="register-root">
            <div className="form-container">
                <h2>Sign Up</h2>
                <form onSubmit={handleSubmit}>
                    <label>Username</label>
                    <input
                        className="reg-input"
                        type="text"
                        name="user_name"
                        value={formData.user_name}
                        onChange={handleChange}
                        required
                    />

                    <label>Password</label>
                    <input
                        className="reg-input"
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                    />

                    <label>Wing</label>
                    <select
                        className="reg-select"
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

                    <label>Role</label>
                    <select
                        className="reg-select"
                        name="role_type"
                        value={formData.role_type}
                        onChange={handleChange}
                    >
                        <option value="admin">Admin</option>
                        <option value="user">User</option>
                    </select>

                    <button type="submit">Register</button>
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