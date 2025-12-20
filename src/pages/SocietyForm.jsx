import React, { useState, useEffect } from "react";
import { getWings, getSocieties, updateSociety } from "../services/api";
import { canEdit } from "../utils/ownerFilter";
import "../css/SocietyForm.css";

const SocietyForm = () => {
    const [formData, setFormData] = useState({});
    const [wings, setWings] = useState([]);
    const [isEditMode, setIsEditMode] = useState(false);
    const [originalData, setOriginalData] = useState({});

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [wingRes, societyRes] = await Promise.all([getWings(), getSocieties()]);
                setWings(wingRes.data);
                if (societyRes.data.length > 0) {
                    setFormData(societyRes.data[0]);
                    setOriginalData(societyRes.data[0]);
                }
            } catch (err) {
                console.error("Error fetching data:", err);
            }
        };
        fetchData();
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handleUpdateClick = async () => {
        try {
            await updateSociety(formData.soc_id, formData);
            alert("Society updated successfully!");
            setOriginalData(formData);
            setIsEditMode(false);
        } catch (err) {
            console.error(err);
            alert("Error updating society. Check console.");
        }
    };

    const handleCancel = () => {
        setFormData(originalData);
        setIsEditMode(false);
    };

    if (!formData || !formData.soc_name) {
        return <p>Loading society data...</p>;
    }

    return (
        <div className="society-form">
            <select
                value={formData.wing_id || ""}
                onChange={handleChange}
                name="wing_id"
                disabled={!isEditMode}
            >
                <option value="">Select Wing</option>
                {wings.map((wing) => (
                    <option key={wing.wing_id} value={wing.wing_id}>
                        {wing.wing_name}
                    </option>
                ))}
            </select>
            <div>
                <label>Society Name</label>
                <input type="text" name="soc_name" placeholder="Society Name" value={formData.soc_name || ""} onChange={handleChange} disabled={!isEditMode} />
            </div>
            <div>
                <label>Register No.</label>
                <input type="text" name="register_no" placeholder="Register No" value={formData.register_no || ""} onChange={handleChange} disabled={!isEditMode} />
            </div>
            <div>
                <label>Address</label>
                <input type="text" name="soc_address" placeholder="Address" value={formData.soc_address || ""} onChange={handleChange} disabled={!isEditMode} />
            </div>
            <div>
                <label>City</label>
                <input type="text" name="city" placeholder="City" value={formData.city || ""} onChange={handleChange} disabled={!isEditMode} />
            </div>
            <div>
                <label>State</label>
                <input type="text" name="state" placeholder="State" value={formData.state || ""} onChange={handleChange} disabled={!isEditMode} />
            </div>
            <div>
                <label>Pin Code</label>
                <input type="text" name="pincode" placeholder="Pincode" value={formData.pincode || ""} onChange={handleChange} disabled={!isEditMode} />
            </div>
            <div>
                <label>Contact No.</label>
                <input type="text" name="soc_contact" placeholder="Contact" value={formData.soc_contact || ""} onChange={handleChange} disabled={!isEditMode} />
            </div>
            <div>
                <label>Alternate Contact No.</label>
                <input type="text" name="soc_altercontact_no" placeholder="Alternate Contact" value={formData.soc_altercontact_no || ""} onChange={handleChange} disabled={!isEditMode} />
            </div>
            <div>
                <label>Email</label>
                <input type="email" name="soc_email" placeholder="Email" value={formData.soc_email || ""} onChange={handleChange} disabled={!isEditMode} />
            </div>
            <div>
                <label>Bank Name</label>
                <input type="text" name="soc_bankname" placeholder="Bank Name" value={formData.soc_bankname || ""} onChange={handleChange} disabled={!isEditMode} />
            </div>
            <div>
                <label>Account No.</label>
                <input type="text" name="soc_bankaccno" placeholder="Bank Account No" value={formData.soc_bankaccno || ""} onChange={handleChange} disabled={!isEditMode} />
            </div>
            <div>
                <label>IFSC Code</label>
                <input type="text" name="soc_bankifsc" placeholder="IFSC Code" value={formData.soc_bankifsc || ""} onChange={handleChange} disabled={!isEditMode} />
            </div>
            <div className="checkbox-group">
                <label>
                    <input type="checkbox" name="lift" checked={!!formData.lift} onChange={handleChange} disabled={!isEditMode} /> Lift
                </label>
                <label>
                    <input type="checkbox" name="powerbackup" checked={!!formData.powerbackup} onChange={handleChange} disabled={!isEditMode} /> Power Backup
                </label>
            </div>

            {canEdit() && (
                <div className="button-group">
                    {!isEditMode ? (
                        <button type="button" className="edit-btn-society" onClick={() => setIsEditMode(true)}>Edit</button>
                    ) : (
                        <>
                            <button type="button" className="update-btn-society" onClick={handleUpdateClick}>Update</button>
                            <button type="button" className="cancel-btn-society" onClick={handleCancel}>Cancel</button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default SocietyForm;