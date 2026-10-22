import { useState } from "react";
import Portal from "./Portal.jsx";

/**
 * Reusable modal for editing contact info and changing password.
 * Props:
 *   onClose()
 *   onUpdateProfile(phone, address) -> Promise
 *   onChangePassword(currentPw, newPw) -> Promise
 *   currentPhone, currentAddress
 */
export default function EditProfileModal({
  onClose,
  onUpdateProfile,
  onChangePassword,
  currentPhone = "",
  currentAddress = "",
}) {
  const [tab, setTab] = useState("contact"); // "contact" | "password"

  // Contact form
  const [phone, setPhone] = useState(currentPhone || "");
  const [address, setAddress] = useState(currentAddress || "");
  const [contactSaving, setContactSaving] = useState(false);
  const [contactError, setContactError] = useState("");
  const [contactSuccess, setContactSuccess] = useState("");

  // Password form
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");

  const handleContactSave = async (e) => {
    e.preventDefault();
    setContactError("");
    setContactSuccess("");
    setContactSaving(true);
    try {
      await onUpdateProfile(phone.trim(), address.trim());
      setContactSuccess("Contact information updated successfully!");
    } catch (err) {
      setContactError(err.message || "Failed to update profile");
    } finally {
      setContactSaving(false);
    }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    setPwError("");
    setPwSuccess("");

    if (newPw.length < 4) {
      setPwError("New password must be at least 4 characters.");
      return;
    }
    if (newPw !== confirmPw) {
      setPwError("New passwords do not match.");
      return;
    }

    setPwSaving(true);
    try {
      await onChangePassword(currentPw, newPw);
      setPwSuccess("Password changed successfully!");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (err) {
      setPwError(err.message || "Failed to change password");
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <Portal>
      <div className="modal-backdrop" onClick={onClose}>
        <div className="glass modal" style={{ maxWidth: "440px" }} onClick={(e) => e.stopPropagation()}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2>Edit Profile</h2>
            <button className="btn-ghost" style={{ padding: "0.3rem 0.7rem" }} onClick={onClose}>✕</button>
          </div>

          {/* Tab switcher */}
          <div className="std-chips" style={{ marginBottom: "1.2rem" }}>
            <button
              id="edit-profile-tab-contact"
              className={`chip ${tab === "contact" ? "active" : ""}`}
              onClick={() => setTab("contact")}
            >
              📞 Contact Info
            </button>
            <button
              id="edit-profile-tab-password"
              className={`chip ${tab === "password" ? "active" : ""}`}
              onClick={() => setTab("password")}
            >
              🔒 Change Password
            </button>
          </div>

          {tab === "contact" && (
            <form onSubmit={handleContactSave}>
              {contactError && <div className="error" style={{ marginBottom: "1rem" }}>{contactError}</div>}
              {contactSuccess && <div className="success" style={{ marginBottom: "1rem" }}>✅ {contactSuccess}</div>}

              <div className="form-grid" style={{ gridTemplateColumns: "1fr" }}>
                <label>
                  Phone Number
                  <input
                    id="edit-phone"
                    type="tel"
                    placeholder="e.g. +91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </label>
                <label>
                  Address
                  <textarea
                    id="edit-address"
                    rows={3}
                    placeholder="Your residential address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </label>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
                <button id="save-contact-btn" type="submit" className="btn-primary" disabled={contactSaving}>
                  {contactSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          )}

          {tab === "password" && (
            <form onSubmit={handlePasswordSave}>
              {pwError && <div className="error" style={{ marginBottom: "1rem" }}>{pwError}</div>}
              {pwSuccess && <div className="success" style={{ marginBottom: "1rem" }}>✅ {pwSuccess}</div>}

              <div className="form-grid" style={{ gridTemplateColumns: "1fr" }}>
                <label>
                  Current Password *
                  <input
                    id="current-password"
                    type="password"
                    required
                    value={currentPw}
                    onChange={(e) => setCurrentPw(e.target.value)}
                  />
                </label>
                <label>
                  New Password *
                  <input
                    id="new-password"
                    type="password"
                    required
                    minLength={4}
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                  />
                </label>
                <label>
                  Confirm New Password *
                  <input
                    id="confirm-password"
                    type="password"
                    required
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                  />
                </label>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
                <button id="save-password-btn" type="submit" className="btn-primary" disabled={pwSaving}>
                  {pwSaving ? "Changing..." : "Change Password"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </Portal>
  );
}
