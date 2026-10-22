import { useState } from "react";
import { adminProfileApi } from "../api.js";

export default function Settings({ username, onUnauthorized }) {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPw.length < 4) {
      setError("New password must be at least 4 characters.");
      return;
    }
    if (newPw !== confirmPw) {
      setError("New passwords do not match.");
      return;
    }

    setSaving(true);
    try {
      const res = await adminProfileApi.changePassword({
        current_password: currentPw,
        new_password: newPw,
      });
      setSuccess(res.message || "Password changed successfully!");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (err) {
      if (err.status === 401) onUnauthorized?.();
      else setError(err.message || "Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid-main" style={{ maxWidth: "640px" }}>
      {/* Admin Info Card */}
      <div className="glass panel">
        <h2>⚙️ System Settings</h2>
        <ul className="info" style={{ marginTop: "1rem" }}>
          <li><span>Logged in as</span><b>{username || "Admin"}</b></li>
          <li><span>Role</span><b>Administrator</b></li>
          <li><span>Session Duration</span><b>1 hour</b></li>
          <li><span>Portal Access</span><b style={{ color: "var(--green)" }}>Full Access</b></li>
        </ul>
        <p className="note" style={{ marginTop: "1rem" }}>
          As an administrator you manage students, teachers, courses, subjects, timetables, and leave approvals.
        </p>
      </div>

      {/* Change Password Card */}
      <div className="glass panel">
        <h2>🔒 Change Admin Password</h2>
        <p className="muted" style={{ fontSize: "0.85rem", marginBottom: "1.2rem" }}>
          Update your administrator account password.
        </p>

        {error && <div className="error" role="alert" style={{ marginBottom: "1rem" }}>{error}</div>}
        {success && (
          <div className="success" role="status" style={{ marginBottom: "1rem" }}>
            ✅ {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-grid" style={{ gridTemplateColumns: "1fr" }}>
            <label>
              Current Password *
              <input
                id="admin-current-password"
                type="password"
                required
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
              />
            </label>
            <label>
              New Password *
              <input
                id="admin-new-password"
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
                id="admin-confirm-password"
                type="password"
                required
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
              />
            </label>
          </div>

          <div style={{ marginTop: "1.2rem" }}>
            <button
              id="admin-change-password-btn"
              type="submit"
              className="btn-primary"
              disabled={saving}
            >
              {saving ? "Changing..." : "Change Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
