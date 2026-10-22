import { useCallback, useEffect, useMemo, useState } from "react";
import { adminLeavesApi } from "../api.js";
import Portal from "./Portal.jsx";

const STATUS_TABS = ["All", "Pending", "Approved", "Rejected", "On Hold"];

export default function AdminLeaves({ onUnauthorized }) {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusTab, setStatusTab] = useState("All");
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");

  // Review / Decision Modal
  const [activeLeave, setActiveLeave] = useState(null);
  const [decision, setDecision] = useState({
    status: "Approved",
    admin_remarks: "",
  });
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  const handleError = useCallback(
    (e, setter) => {
      if (e.status === 401) onUnauthorized?.();
      setter?.(e.message || "An unexpected error occurred");
    },
    [onUnauthorized]
  );

  const loadLeaves = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await adminLeavesApi.list(statusTab);
      setLeaves(data || []);
    } catch (e) {
      handleError(e, setError);
    } finally {
      setLoading(false);
    }
  }, [handleError, statusTab]);

  useEffect(() => {
    loadLeaves();
  }, [loadLeaves]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const openDecisionModal = (leave) => {
    setActiveLeave(leave);
    setDecision({
      status: leave.status === "Pending" ? "Approved" : leave.status,
      admin_remarks: leave.admin_remarks || "",
    });
    setModalError("");
  };

  const handleDecisionSubmit = async (e) => {
    e.preventDefault();
    if (!activeLeave) return;

    setSaving(true);
    setModalError("");
    try {
      const res = await adminLeavesApi.decide(activeLeave.id, {
        status: decision.status,
        admin_remarks: decision.admin_remarks.trim() || null,
      });
      setToast(res.message || `Leave request ${decision.status.toLowerCase()}!`);
      setActiveLeave(null);
      await loadLeaves();
    } catch (err) {
      handleError(err, setModalError);
    } finally {
      setSaving(false);
    }
  };

  const calculateDays = (start, end) => {
    if (!start || !end) return 1;
    const diff = new Date(end) - new Date(start);
    const days = Math.round(diff / (1000 * 60 * 60 * 24)) + 1;
    return days > 0 ? days : 1;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const statusClass = (status) => {
    switch (status) {
      case "Approved":
        return "status-approved";
      case "Rejected":
        return "status-rejected";
      case "On Hold":
        return "status-on-hold";
      default:
        return "status-pending";
    }
  };

  const filteredLeaves = useMemo(() => {
    return leaves.filter((item) => {
      const q = query.toLowerCase();
      const name = (item.student_name || "").toLowerCase();
      const email = (item.student_email || "").toLowerCase();
      const reason = (item.reason || "").toLowerCase();
      return name.includes(q) || email.includes(q) || reason.includes(q);
    });
  }, [leaves, query]);

  const counts = useMemo(() => {
    const res = { Total: leaves.length, Pending: 0, Approved: 0, Rejected: 0, "On Hold": 0 };
    leaves.forEach((l) => {
      if (res[l.status] !== undefined) res[l.status]++;
    });
    return res;
  }, [leaves]);

  return (
    <div className="glass panel">
      {/* Header */}
      <div className="panel-head" style={{ marginBottom: "1.2rem" }}>
        <div>
          <h2>Leave Request Management</h2>
          <p className="muted">
            Review, approve, or reject student absence and leave applications.
          </p>
        </div>

        <div className="panel-actions">
          <input
            id="leave-search-input"
            className="search"
            placeholder="Search by student or reason..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            className="btn-secondary"
            onClick={loadLeaves}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "↻ Refresh"}
          </button>
        </div>
      </div>

      {/* Summary Pills */}
      <div style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap", marginBottom: "1.2rem" }}>
        <div className="pill">
          <span>📋 Total: <b>{counts.Total}</b></span>
        </div>
        <div className="pill">
          <span style={{ color: "#fbbf24" }}>⏳ Pending: <b>{counts.Pending}</b></span>
        </div>
        <div className="pill">
          <span style={{ color: "var(--green)" }}>✅ Approved: <b>{counts.Approved}</b></span>
        </div>
        <div className="pill">
          <span style={{ color: "#f87171" }}>❌ Rejected: <b>{counts.Rejected}</b></span>
        </div>
      </div>

      {/* Status Filter Chips */}
      <div className="std-chips" style={{ marginBottom: "1.2rem" }}>
        {STATUS_TABS.map((st) => (
          <button
            key={st}
            id={`admin-filter-leave-${st.toLowerCase().replace(" ", "-")}`}
            className={`chip ${statusTab === st ? "active" : ""}`}
            onClick={() => setStatusTab(st)}
          >
            {st}
          </button>
        ))}
      </div>

      {error && <div className="error" role="alert">{error}</div>}

      {/* Leave Requests Table */}
      {loading ? (
        <div className="empty">
          <div className="spinner" />
          <p className="muted" style={{ marginTop: "1rem" }}>Loading leave requests...</p>
        </div>
      ) : filteredLeaves.length === 0 ? (
        <div className="empty">
          <div className="big">🏖️</div>
          <h2>No leave requests found</h2>
          <p className="muted">
            {query
              ? "No leave requests matched your search query."
              : statusTab === "All"
              ? "No students have submitted leave applications yet."
              : `No requests currently marked as "${statusTab}".`}
          </p>
        </div>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Leave Period</th>
                <th>Duration</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Admin Remarks</th>
                <th className="right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeaves.map((item) => {
                const days = calculateDays(item.start_date, item.end_date);
                return (
                  <tr key={item.id}>
                    <td>
                      <div className="cell-user">
                        <div className="avatar sm">
                          {(item.student_name || "S").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <b>{item.student_name || `Student #${item.student_id}`}</b>
                          <small>{item.student_email || "No email"}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <b>{formatDate(item.start_date)}</b>
                      <small className="muted" style={{ display: "block" }}>
                        to {formatDate(item.end_date)}
                      </small>
                    </td>
                    <td>
                      <span className="leave-days-pill">
                        {days} day{days === 1 ? "" : "s"}
                      </span>
                    </td>
                    <td style={{ maxWidth: "260px" }}>
                      <div
                        style={{
                          whiteSpace: "normal",
                          wordBreak: "break-word",
                          fontSize: "0.85rem",
                          lineHeight: 1.4,
                        }}
                      >
                        {item.reason}
                      </div>
                      <small className="muted" style={{ display: "block", marginTop: "4px" }}>
                        Applied on {formatDate(item.created_at)}
                      </small>
                    </td>
                    <td>
                      <span className={`badge ${statusClass(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td style={{ maxWidth: "200px" }}>
                      {item.admin_remarks ? (
                        <small style={{ color: "#ddd6fe" }}>{item.admin_remarks}</small>
                      ) : (
                        <span className="muted" style={{ fontSize: "0.8rem" }}>—</span>
                      )}
                    </td>
                    <td className="right">
                      <button
                        id={`review-leave-btn-${item.id}`}
                        className="btn-secondary"
                        style={{ padding: "0.45rem 0.85rem", fontSize: "0.82rem" }}
                        onClick={() => openDecisionModal(item)}
                      >
                        ✏️ Review
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Review / Decision Modal */}
      {activeLeave && (
        <Portal>
          <div className="modal-backdrop" onClick={() => !saving && setActiveLeave(null)}>
            <form
              className="glass modal"
              onSubmit={handleDecisionSubmit}
              onClick={(e) => e.stopPropagation()}
            >
              <h2>Review Leave Request #{activeLeave.id}</h2>

              {modalError && (
                <div className="error" role="alert" style={{ marginBottom: "1rem" }}>
                  {modalError}
                </div>
              )}

              {/* Student Details Summary */}
              <div
                style={{
                  padding: "1rem",
                  borderRadius: "12px",
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid var(--border)",
                  marginBottom: "1.2rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                  fontSize: "0.9rem",
                }}
              >
                <div>
                  <span className="muted">Student:</span>{" "}
                  <b>{activeLeave.student_name || `Student #${activeLeave.student_id}`}</b>{" "}
                  <span className="muted">({activeLeave.student_email})</span>
                </div>
                <div>
                  <span className="muted">Requested Dates:</span>{" "}
                  <b>{formatDate(activeLeave.start_date)}</b> to <b>{formatDate(activeLeave.end_date)}</b>{" "}
                  <span className="leave-days-pill">
                    {calculateDays(activeLeave.start_date, activeLeave.end_date)} days
                  </span>
                </div>
                <div>
                  <span className="muted">Reason:</span>
                  <p
                    style={{
                      margin: "0.4rem 0 0",
                      padding: "0.6rem 0.8rem",
                      borderRadius: "8px",
                      background: "rgba(0,0,0,0.2)",
                      lineHeight: 1.4,
                    }}
                  >
                    {activeLeave.reason}
                  </p>
                </div>
              </div>

              {/* Decision Input Fields */}
              <div className="form-grid">
                <label className="full">
                  Decision Status *
                  <select
                    id="leave-decision-status"
                    required
                    value={decision.status}
                    onChange={(e) => setDecision({ ...decision, status: e.target.value })}
                  >
                    <option value="Approved">✅ Approved</option>
                    <option value="Rejected">❌ Rejected</option>
                    <option value="On Hold">⏸️ On Hold</option>
                  </select>
                </label>

                <label className="full">
                  Admin Remarks (Optional)
                  <textarea
                    id="leave-admin-remarks"
                    rows={3}
                    maxLength={2000}
                    placeholder="Provide explanatory remarks (e.g. Approved with attendance exemption, medical certificate verified, etc.)..."
                    value={decision.admin_remarks}
                    onChange={(e) => setDecision({ ...decision, admin_remarks: e.target.value })}
                  />
                </label>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={saving}
                  onClick={() => setActiveLeave(null)}
                >
                  Cancel
                </button>
                <button
                  id="save-decision-btn"
                  type="submit"
                  className="btn-primary"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Decision"}
                </button>
              </div>
            </form>
          </div>
        </Portal>
      )}

      {/* Toast */}
      {toast && <div className="toast">✅ {toast}</div>}
    </div>
  );
}
