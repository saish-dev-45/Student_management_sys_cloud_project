import { useCallback, useEffect, useMemo, useState } from "react";
import { teacherLeavesApi } from "../api.js";
import Portal from "./Portal.jsx";

const STATUS_OPTIONS = ["All", "Pending", "Approved", "Rejected", "On Hold"];

export default function TeacherLeaves({ onUnauthorized }) {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [openModal, setOpenModal] = useState(false);
  const [form, setForm] = useState({ start_date: "", end_date: "", reason: "" });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [toast, setToast] = useState("");

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
      const data = await teacherLeavesApi.list();
      setLeaves(data || []);
    } catch (e) {
      handleError(e, setError);
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  useEffect(() => { loadLeaves(); }, [loadLeaves]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!form.start_date || !form.end_date) {
      setFormError("Please select both start and end dates.");
      return;
    }
    if (form.end_date < form.start_date) {
      setFormError("End date cannot be earlier than start date.");
      return;
    }
    if (!form.reason.trim()) {
      setFormError("Please provide a reason for your leave request.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await teacherLeavesApi.apply({
        start_date: form.start_date,
        end_date: form.end_date,
        reason: form.reason.trim(),
      });
      setToast(res.message || "Leave request submitted successfully!");
      setOpenModal(false);
      setForm({ start_date: "", end_date: "", reason: "" });
      await loadLeaves();
    } catch (e) {
      handleError(e, setFormError);
    } finally {
      setSubmitting(false);
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
      return new Date(dateStr).toLocaleDateString(undefined, {
        month: "short", day: "numeric", year: "numeric",
      });
    } catch { return dateStr; }
  };

  const statusClass = (status) => {
    switch (status) {
      case "Approved": return "status-approved";
      case "Rejected": return "status-rejected";
      case "On Hold": return "status-on-hold";
      default: return "status-pending";
    }
  };

  const filteredLeaves = useMemo(() => {
    if (statusFilter === "All") return leaves;
    return leaves.filter((l) => l.status === statusFilter);
  }, [leaves, statusFilter]);

  const counts = useMemo(() => {
    const res = { Total: leaves.length, Pending: 0, Approved: 0, Rejected: 0 };
    leaves.forEach((l) => { if (res[l.status] !== undefined) res[l.status]++; });
    return res;
  }, [leaves]);

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="glass panel">
      <div className="panel-head" style={{ marginBottom: "1.2rem" }}>
        <div>
          <h2>My Leave Applications</h2>
          <p className="muted">Submit leave requests and monitor administrative approval status.</p>
        </div>
        <button
          id="apply-teacher-leave-btn"
          className="btn-primary"
          style={{ marginTop: 0 }}
          onClick={() => { setFormError(""); setOpenModal(true); }}
        >
          ＋ Apply for Leave
        </button>
      </div>

      {/* Summary chips */}
      <div style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap", marginBottom: "1.2rem" }}>
        <div className="pill"><span>📋 Total: <b>{counts.Total}</b></span></div>
        <div className="pill"><span style={{ color: "#fbbf24" }}>⏳ Pending: <b>{counts.Pending}</b></span></div>
        <div className="pill"><span style={{ color: "var(--green)" }}>✅ Approved: <b>{counts.Approved}</b></span></div>
        <div className="pill"><span style={{ color: "#f87171" }}>❌ Rejected: <b>{counts.Rejected}</b></span></div>
      </div>

      {/* Status filter chips */}
      <div className="std-chips" style={{ marginBottom: "1rem" }}>
        {STATUS_OPTIONS.map((st) => (
          <button
            key={st}
            id={`filter-teacher-leave-${st.toLowerCase().replace(" ", "-")}`}
            className={`chip ${statusFilter === st ? "active" : ""}`}
            onClick={() => setStatusFilter(st)}
          >
            {st}
          </button>
        ))}
      </div>

      {error && <div className="error" role="alert">{error}</div>}

      {loading ? (
        <div className="empty">
          <div className="spinner" />
          <p className="muted" style={{ marginTop: "1rem" }}>Loading leave requests...</p>
        </div>
      ) : filteredLeaves.length === 0 ? (
        <div className="empty">
          <div className="big">🏖️</div>
          <h2>No leave applications found</h2>
          <p className="muted">
            {statusFilter === "All"
              ? "You haven't submitted any leave requests yet."
              : `No leave applications with status "${statusFilter}".`}
          </p>
          {statusFilter === "All" && (
            <button className="btn-primary" style={{ marginTop: "1rem" }} onClick={() => setOpenModal(true)}>
              ＋ Apply Now
            </button>
          )}
        </div>
      ) : (
        <div className="leave-grid">
          {filteredLeaves.map((item) => {
            const days = calculateDays(item.start_date, item.end_date);
            return (
              <div key={item.id} className="leave-card">
                <div className="leave-head">
                  <div className="leave-dates">
                    <span>🗓️ {formatDate(item.start_date)} – {formatDate(item.end_date)}</span>
                    <span className="leave-days-pill">{days} day{days === 1 ? "" : "s"}</span>
                  </div>
                  <span className={`badge ${statusClass(item.status)}`}>{item.status}</span>
                </div>
                <div className="leave-reason"><p style={{ margin: 0 }}>{item.reason}</p></div>
                {item.admin_remarks && (
                  <div className="remarks-callout">
                    <b>👨‍💼 Admin Remarks:</b> {item.admin_remarks}
                  </div>
                )}
                <div className="leave-footer">
                  <span>Applied on {formatDate(item.created_at)}</span>
                  <span>ID #{item.id}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Apply Modal */}
      {openModal && (
        <Portal>
          <div className="modal-backdrop" onClick={() => !submitting && setOpenModal(false)}>
            <form className="glass modal" onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()}>
              <h2>Apply for Leave</h2>
              <p className="muted" style={{ marginBottom: "1.2rem", fontSize: "0.85rem" }}>
                Submit a leave application for approval by institution administration.
              </p>

              {formError && <div className="error" role="alert" style={{ marginBottom: "1rem" }}>{formError}</div>}

              <div className="form-grid">
                <label>
                  Start Date *
                  <input
                    id="teacher-leave-start-date"
                    type="date"
                    required
                    min={todayStr}
                    value={form.start_date}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      setForm((prev) => ({
                        ...prev,
                        start_date: newStart,
                        end_date: prev.end_date && prev.end_date < newStart ? newStart : prev.end_date,
                      }));
                    }}
                  />
                </label>

                <label>
                  End Date *
                  <input
                    id="teacher-leave-end-date"
                    type="date"
                    required
                    min={form.start_date || todayStr}
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  />
                </label>

                <label className="full">
                  Reason for Leave *
                  <textarea
                    id="teacher-leave-reason"
                    required
                    rows={4}
                    maxLength={2000}
                    placeholder="Describe the reason for your absence..."
                    value={form.reason}
                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  />
                  <small className="muted" style={{ alignSelf: "flex-end" }}>{form.reason.length} / 2000</small>
                </label>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" disabled={submitting} onClick={() => setOpenModal(false)}>
                  Cancel
                </button>
                <button id="submit-teacher-leave-btn" type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit Application"}
                </button>
              </div>
            </form>
          </div>
        </Portal>
      )}

      {toast && <div className="toast">✅ {toast}</div>}
    </div>
  );
}
