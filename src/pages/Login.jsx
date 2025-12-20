import React, { useState, useEffect } from "react";
import { getWings, loginUser } from "../services/api";
import { useNavigate } from "react-router-dom";
import "../css/Login.css";
import '@fortawesome/fontawesome-free/css/all.min.css';

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
            // Ensure wing_id is stored in user object (from formData if not in response)
            const userData = {
                ...res.data.user,
                wing_id: res.data.user?.wing_id || formData.wing_id
            };
            localStorage.setItem("user", JSON.stringify(userData));
            alert("Login successful!");
            navigate("/dashboard");
        } catch (err) {
            alert(err.response?.data?.message || "Invalid credentials!");
            console.error(err);
        }
    };

    return (
        <div className="logincontainer">
            <h2 className="logintitle">Login</h2>
            <form className="loginform" onSubmit={handleSubmit}>
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
                    >
                        <option value="">Select your wing</option>
                        {wings.map((wing) => (
                            <option key={wing.wing_id} value={wing.wing_id}>
                                {wing.wing_name}
                            </option>
                        ))}
                    </select>
                    <i className="inputicon fa-solid fa-building" />
                </div>
                <button type="submit" className="loginbtn">Login</button>
            </form>

            <div className="loginfooter">
                <p>
                    Don’t have an account?{" "}
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