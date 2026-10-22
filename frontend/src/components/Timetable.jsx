import { useCallback, useEffect, useState } from "react";
import {
  timetableApi,
  teachersApi,
  coursesApi,
  courseSubjectsApi,
  subjectsApi,
} from "../api.js";
import Portal from "./Portal.jsx";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const PERIODS = [
  [1, "09:00", "10:00"],
  [2, "10:00", "11:00"],
  [3, "11:15", "12:15"],
  [4, "12:15", "13:15"],
  [5, "14:00", "15:00"],
  [6, "15:00", "16:00"],
];

export default function Timetable({ onUnauthorized }) {
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [courseSubjects, setCourseSubjects] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [entries, setEntries] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState(null); // { day, period, entry? }
  const [form, setForm] = useState({ subject: "", subject_id: "", teacher_id: "", room: "" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const handleError = useCallback(
    (e, setter) => {
      if (e.status === 401) onUnauthorized?.();
      setter?.(e.message || "An unexpected error occurred");
    },
    [onUnauthorized]
  );

  // Load teachers, degree courses, and all subjects
  useEffect(() => {
    Promise.all([
      teachersApi.list().catch(() => []),
      coursesApi.list().catch(() => []),
      subjectsApi.list().catch(() => []),
    ]).then(([tList, cList, sList]) => {
      setTeachers(tList || []);
      setCourses(cList || []);
      setAllSubjects(sList || []);
      if (cList && cList.length > 0 && !selectedCourseId) {
        setSelectedCourseId(String(cList[0].id));
      }
    });
  }, [selectedCourseId]);

  // Load subjects assigned to the selected degree course
  useEffect(() => {
    if (selectedCourseId) {
      courseSubjectsApi
        .list(selectedCourseId)
        .then((res) => setCourseSubjects(res.subjects || []))
        .catch(() => setCourseSubjects([]));
    }
  }, [selectedCourseId]);

  // Load Timetable Entries for the active degree course
  const loadTimetable = useCallback(async () => {
    if (!selectedCourseId) {
      setEntries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await timetableApi.list({ course_id: selectedCourseId });
      setEntries(res.timetable || []);
    } catch (e) {
      handleError(e, setError);
    } finally {
      setLoading(false);
    }
  }, [selectedCourseId, handleError]);

  useEffect(() => {
    loadTimetable();
  }, [loadTimetable]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const teacherName = (id) => teachers.find((t) => t.id === id)?.full_name || `Teacher #${id}`;
  const findEntry = (day, period) =>
    entries.find((e) => e.day_of_week === day && e.period_number === period);

  const selectedCourse = courses.find((c) => String(c.id) === String(selectedCourseId));

  const openCell = (day, period) => {
    if (!editMode) return;
    const entry = findEntry(day, period);
    setForm({
      subject: entry?.subject ?? "",
      subject_id: entry?.subject_id ? String(entry.subject_id) : "",
      teacher_id: entry?.teacher_id ? String(entry.teacher_id) : "",
      room: entry?.room ?? "",
    });
    setFormError("");
    setModal({ day, period, entry });
  };

  const handleSubjectSelect = (subId) => {
    if (!subId) {
      setForm((prev) => ({ ...prev, subject_id: "", subject: "" }));
      return;
    }
    const pool = courseSubjects.length > 0 ? courseSubjects : allSubjects;
    const found = pool.find((s) => String(s.id) === String(subId));
    setForm((prev) => ({
      ...prev,
      subject_id: subId,
      subject: found ? found.subject_name : prev.subject,
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!selectedCourseId) return;
    setSaving(true);
    setFormError("");

    const body = {
      course_id: Number(selectedCourseId),
      day_of_week: modal.day,
      period_number: modal.period,
      subject: form.subject.trim(),
      teacher_id: Number(form.teacher_id),
      room: form.room.trim() || null,
      subject_id: form.subject_id ? Number(form.subject_id) : null,
    };

    try {
      if (modal.entry) {
        await timetableApi.update(modal.entry.id, body);
        setToast("Period updated successfully");
      } else {
        await timetableApi.create(body);
        setToast("Period added successfully");
      }
      setModal(null);
      await loadTimetable();
    } catch (err) {
      handleError(err, setFormError);
    } finally {
      setSaving(false);
    }
  };

  const removeEntry = async () => {
    if (!modal?.entry) return;
    setSaving(true);
    try {
      await timetableApi.remove(modal.entry.id);
      setToast("Period removed");
      setModal(null);
      await loadTimetable();
    } catch (err) {
      handleError(err, setFormError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="glass panel">
      {/* Header with Title and View/Edit Mode */}
      <div className="panel-head" style={{ marginBottom: "1.2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2>
            {selectedCourse ? `${selectedCourse.course_name} (${selectedCourse.course_code})` : "Degree Programme"}{" "}
            <span className="muted" style={{ fontSize: "0.9rem" }}>({entries.length} scheduled periods)</span>
          </h2>
          <p className="muted" style={{ fontSize: "0.85rem" }}>
            Schedule weekly lectures for degree programmes with assigned curriculum subjects and teachers.
          </p>
        </div>

        <div className="panel-actions" style={{ display: "flex", gap: "0.8rem", alignItems: "center" }}>
          {/* View / Edit Mode Toggle */}
          <div className="seg">
            <button
              id="timetable-view-btn"
              className={!editMode ? "active" : ""}
              onClick={() => setEditMode(false)}
            >
              👁 View
            </button>
            <button
              id="timetable-edit-btn"
              className={editMode ? "active" : ""}
              onClick={() => setEditMode(true)}
            >
              ✏️ Edit
            </button>
          </div>
        </div>
      </div>

      {/* Degree Course Chips Selector */}
      {courses.length === 0 ? (
        <div className="empty" style={{ padding: "1.5rem" }}>
          <p className="muted">No degree courses created yet. Please create a course first in the Courses tab (e.g. MCA, MBA).</p>
        </div>
      ) : (
        <div className="std-chips">
          {courses.map((c) => (
            <button
              key={c.id}
              id={`timetable-course-${c.id}`}
              className={`chip ${String(selectedCourseId) === String(c.id) ? "active" : ""}`}
              title={c.course_name}
              onClick={() => setSelectedCourseId(String(c.id))}
            >
              🎓 {c.course_code} · {c.course_name}
            </button>
          ))}
        </div>
      )}

      {!editMode && !loading && entries.length === 0 && !error && (
        <p className="muted" style={{ margin: "1rem 0" }}>
          No lectures scheduled for {selectedCourse?.course_code || "this course"} yet.
          Switch to <b>✏️ Edit</b> mode to add lecture periods.
        </p>
      )}

      {error && <div className="error" role="alert" style={{ marginBottom: "1rem" }}>{error}</div>}

      {/* Timetable Weekly Matrix Table */}
      <div className="table-scroll">
        <table className="tt-table">
          <thead>
            <tr>
              <th style={{ width: "120px" }}>Period</th>
              {DAYS.map((d) => (
                <th key={d}>{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERIODS.map(([p, start, end]) => (
              <tr key={p}>
                <td className="tt-period">
                  <b>P{p}</b>
                  <small>{start} – {end}</small>
                </td>
                {DAYS.map((d) => {
                  const entry = findEntry(d, p);
                  return (
                    <td key={d} className="tt-cell-td">
                      <button
                        id={`tt-${d}-${p}`}
                        className={`tt-cell ${entry ? "filled" : ""} ${editMode ? "" : "readonly"}`}
                        onClick={() => openCell(d, p)}
                        disabled={loading}
                      >
                        {entry ? (
                          <>
                            <b>{entry.subject}</b>
                            <small>👨‍🏫 {teacherName(entry.teacher_id)}</small>
                            {entry.room && <small>🚪 Room {entry.room}</small>}
                          </>
                        ) : (
                          <span className="tt-add">{editMode ? "＋" : "—"}</span>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Period Create / Edit Modal */}
      {modal && (
        <Portal>
          <div className="modal-backdrop" onClick={() => !saving && setModal(null)}>
            <form className="glass modal" onSubmit={submit} onClick={(e) => e.stopPropagation()}>
              <h2>
                {modal.entry ? "Edit" : "Schedule"} Lecture · {modal.day} P{modal.period}
              </h2>
              <p className="muted" style={{ marginBottom: "1.2rem" }}>
                {selectedCourse ? `${selectedCourse.course_name} (${selectedCourse.course_code})` : "Degree Programme"}
              </p>

              <div className="form-grid">
                {/* Subject Selection */}
                <label className="full">
                  Curriculum Subject *
                  {courseSubjects.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <select
                        id="timetable-subject-select"
                        value={form.subject_id}
                        onChange={(e) => handleSubjectSelect(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "0.75rem",
                          borderRadius: "10px",
                          background: "rgba(255,255,255,0.06)",
                          border: "1px solid var(--border)",
                          color: "inherit",
                          font: "inherit",
                        }}
                      >
                        <option value="" style={{ background: "#15123a" }}>-- Select Assigned Subject --</option>
                        {courseSubjects.map((s) => (
                          <option key={s.id} value={s.id} style={{ background: "#15123a" }}>
                            {s.subject_name} ({s.subject_code})
                          </option>
                        ))}
                      </select>
                      <input
                        id="timetable-subject-name"
                        required
                        maxLength={100}
                        placeholder="Subject name"
                        value={form.subject}
                        onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      />
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <input
                        id="timetable-subject"
                        required
                        maxLength={100}
                        placeholder="e.g. Data Structures and Algorithm"
                        value={form.subject}
                        onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      />
                      <small className="muted" style={{ fontSize: "0.78rem" }}>
                        Tip: You can assign subjects to {selectedCourse?.course_code || "this course"} in the 📖 Subjects tab.
                      </small>
                    </div>
                  )}
                </label>

                {/* Teacher Selection */}
                <label>
                  Teacher *
                  <select
                    id="timetable-teacher"
                    required
                    value={form.teacher_id}
                    onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      borderRadius: "10px",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid var(--border)",
                      color: "inherit",
                      font: "inherit",
                    }}
                  >
                    <option value="" style={{ background: "#15123a" }}>Select teacher…</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id} style={{ background: "#15123a" }}>
                        {t.full_name} ({t.subject})
                      </option>
                    ))}
                  </select>
                </label>

                {/* Room */}
                <label>
                  Room / Lab
                  <input
                    id="timetable-room"
                    maxLength={50}
                    placeholder="e.g. Room 302, Lab 2"
                    value={form.room}
                    onChange={(e) => setForm({ ...form, room: e.target.value })}
                  />
                </label>
              </div>

              {formError && <div className="error" role="alert" style={{ marginTop: "1rem" }}>{formError}</div>}

              <div className="modal-actions" style={{ display: "flex", justifyContent: "flex-end", gap: "0.8rem", marginTop: "1.4rem" }}>
                {modal.entry && (
                  <button type="button" className="btn-ghost" style={{ color: "#ff9aa8", marginRight: "auto" }} onClick={removeEntry} disabled={saving}>
                    ✕ Delete
                  </button>
                )}
                <button type="button" className="btn-ghost" onClick={() => setModal(null)} disabled={saving}>
                  Cancel
                </button>
                <button id="save-timetable-btn" type="submit" className="btn-primary" style={{ marginTop: 0 }} disabled={saving}>
                  {saving ? "Saving…" : modal.entry ? "Update Period" : "Save Period"}
                </button>
              </div>
            </form>
          </div>
        </Portal>
      )}

      {toast && (
        <Portal>
          <div className="toast" style={{ position: "fixed", bottom: "1.5rem", right: "1.5rem", background: "rgba(16, 185, 129, 0.9)", color: "#fff", padding: "0.8rem 1.4rem", borderRadius: "12px", zIndex: 1000, boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }}>
            ✅ {toast}
          </div>
        </Portal>
      )}
    </div>
  );
}
