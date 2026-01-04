import React, { useState, useEffect } from "react";
import { getWings, getSocieties, updateSociety } from "../services/api";
import { canEdit } from "../utils/ownerFilter";
import "../css/SocietyForm.css";

const SocietyForm = () => {
    const [formData, setFormData] = useState({});
    const [wings, setWings] = useState([]);
    const [isEditMode, setIsEditMode] = useState(false);
    const [originalData, setOriginalData] = useState({});
    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);
    const [qrImageFile, setQrImageFile] = useState(null);
    const [qrImagePreview, setQrImagePreview] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [wingRes, societyRes] = await Promise.all([getWings(), getSocieties()]);
                setWings(wingRes.data);
                if (societyRes.data.length > 0) {
                    const society = societyRes.data[0];
                    setFormData(society);
                    setOriginalData(society);
                    setLogoPreview(society.soc_logo || society.logo_url || null);
                    setQrImagePreview(society.qr_image || society.qr_image_url || null);
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

    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                alert('Please select an image file');
                return;
            }
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert('Image size should be less than 5MB');
                return;
            }
            setLogoFile(file);
            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveLogo = () => {
        setLogoFile(null);
        setLogoPreview(null);
        // Also clear the logo URL from formData if it exists
        setFormData((prev) => ({
            ...prev,
            soc_logo: null,
            logo_url: null,
        }));
    };

    const handleQrImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                alert('Please select an image file');
                return;
            }
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert('Image size should be less than 5MB');
                return;
            }
            setQrImageFile(file);
            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setQrImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveQrImage = () => {
        setQrImageFile(null);
        setQrImagePreview(null);
        // Also clear the QR image URL from formData if it exists
        setFormData((prev) => ({
            ...prev,
            qr_image: null,
            qr_image_url: null,
        }));
    };

    const handleUpdateClick = async () => {
        try {
            await updateSociety(formData.soc_id, formData, logoFile, qrImageFile);
            alert("Society updated successfully!");
            // Refresh society data to get updated logo and QR image URLs
            const societyRes = await getSocieties();
            if (societyRes.data.length > 0) {
                const updatedSociety = societyRes.data[0];
                setFormData(updatedSociety);
                setOriginalData(updatedSociety);
                setLogoPreview(updatedSociety.soc_logo || updatedSociety.logo_url || null);
                setQrImagePreview(updatedSociety.qr_image || updatedSociety.qr_image_url || null);
            }
            setLogoFile(null);
            setQrImageFile(null);
            setIsEditMode(false);
        } catch (err) {
            console.error(err);
            alert("Error updating society. Check console.");
        }
    };

    const handleCancel = () => {
        setFormData(originalData);
        setLogoFile(null);
        setLogoPreview(originalData.soc_logo || originalData.logo_url || null);
        setQrImageFile(null);
        setQrImagePreview(originalData.qr_image || originalData.qr_image_url || null);
        setIsEditMode(false);
    };

    if (!formData || !formData.soc_name) {
        return <p>Loading society data...</p>;
    }

    return (
        <div className="society-form">
            {/* Logo Section */}
            <div className="logo-section">
                <label>Society Logo</label>
                {(logoPreview || formData.soc_logo || formData.logo_url) ? (
                    <div className="logo-display">
                        <img 
                            src={logoPreview || formData.soc_logo || formData.logo_url} 
                            alt={`${formData.soc_name || 'Society'} Logo`}
                            className="society-logo"
                            onError={(e) => {
                                e.target.style.display = 'none';
                                const placeholder = e.target.nextElementSibling;
                                if (placeholder) placeholder.style.display = 'flex';
                            }}
                        />
                        <div className="logo-placeholder" style={{ display: 'none' }}>
                            <span>No Logo Available</span>
                        </div>
                        {isEditMode && (
                            <button 
                                type="button" 
                                className="remove-logo-btn"
                                onClick={handleRemoveLogo}
                                title="Remove logo"
                            >
                                ×
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="logo-placeholder">
                        <span>No Logo Uploaded</span>
                    </div>
                )}
                {isEditMode && (
                    <div className="logo-upload-controls">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoChange}
                            id="logo-upload"
                            style={{ display: 'none' }}
                        />
                        <label htmlFor="logo-upload" className="upload-logo-btn">
                            {logoFile || formData.soc_logo || formData.logo_url ? 'Change Logo' : 'Upload Logo'}
                        </label>
                        {logoFile && (
                            <span className="logo-file-name">{logoFile.name}</span>
                        )}
                    </div>
                )}
            </div>
            
            {/* QR Image Section */}
            <div className="logo-section">
                <label>QR Image</label>
                {(qrImagePreview || formData.qr_image || formData.qr_image_url) ? (
                    <div className="logo-display">
                        <img 
                            src={qrImagePreview || formData.qr_image || formData.qr_image_url} 
                            alt={`${formData.soc_name || 'Society'} QR Code`}
                            className="society-logo"
                            onError={(e) => {
                                e.target.style.display = 'none';
                                const placeholder = e.target.nextElementSibling;
                                if (placeholder) placeholder.style.display = 'flex';
                            }}
                        />
                        <div className="logo-placeholder" style={{ display: 'none' }}>
                            <span>No QR Image Available</span>
                        </div>
                        {isEditMode && (
                            <button 
                                type="button" 
                                className="remove-logo-btn"
                                onClick={handleRemoveQrImage}
                                title="Remove QR image"
                            >
                                ×
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="logo-placeholder">
                        <span>No QR Image Uploaded</span>
                    </div>
                )}
                {isEditMode && (
                    <div className="logo-upload-controls">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleQrImageChange}
                            id="qr-image-upload"
                            style={{ display: 'none' }}
                        />
                        <label htmlFor="qr-image-upload" className="upload-logo-btn">
                            {qrImageFile || formData.qr_image || formData.qr_image_url ? 'Change QR Image' : 'Upload QR Image'}
                        </label>
                        {qrImageFile && (
                            <span className="logo-file-name">{qrImageFile.name}</span>
                        )}
                    </div>
                )}
            </div>
            
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