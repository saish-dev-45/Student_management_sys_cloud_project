import { useCallback, useEffect, useState } from "react";
import { subjectsApi, coursesApi, courseSubjectsApi } from "../api.js";
import Portal from "./Portal.jsx";

export default function Subjects({ onUnauthorized }) {
  const [subTab, setSubTab] = useState("subjects"); // "subjects" | "mapping"
  const [subjects, setSubjects] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [query, setQuery] = useState("");

  // Modal states for Subject CRUD
  const [modal, setModal] = useState(null); // null | { mode: 'add' | 'edit', id?: number }
  const [form, setForm] = useState({ subject_name: "", subject_code: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [toDelete, setToDelete] = useState(null);

  // Mapping state
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [assignedSubjects, setAssignedSubjects] = useState([]);
  const [mappingLoading, setMappingLoading] = useState(false);
  const [assignSubjectId, setAssignSubjectId] = useState("");
  const [mappingActionBusy, setMappingActionBusy] = useState(false);
  const [mappingFeedback, setMappingFeedback] = useState(null);

  const handleError = useCallback(
    (e, setter) => {
      if (e.status === 401) onUnauthorized?.();
      setter?.(e.message || "An unexpected error occurred");
    },
    [onUnauthorized]
  );

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [subRes, courseRes] = await Promise.all([
        subjectsApi.list(),
        coursesApi.list(),
      ]);
      setSubjects(subRes || []);
      setCourses(courseRes || []);
      if (courseRes && courseRes.length > 0 && !selectedCourseId) {
        setSelectedCourseId(String(courseRes[0].id));
      }
    } catch (e) {
      handleError(e, setError);
    } finally {
      setLoading(false);
    }
  }, [handleError, selectedCourseId]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Load assigned subjects when selectedCourseId changes
  const loadCourseSubjects = useCallback(async (cId) => {
    if (!cId) return;
    setMappingLoading(true);
    setMappingFeedback(null);
    try {
      const res = await courseSubjectsApi.list(cId);
      setAssignedSubjects(res.subjects || []);
    } catch (e) {
      handleError(e, (msg) => setMappingFeedback({ type: "error", message: msg }));
    } finally {
      setMappingLoading(false);
    }
  }, [handleError]);

  useEffect(() => {
    if (selectedCourseId) {
      loadCourseSubjects(selectedCourseId);
    }
  }, [selectedCourseId, loadCourseSubjects]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // Subject CRUD Handlers
  const openAdd = () => {
    setForm({ subject_name: "", subject_code: "", description: "" });
    setFormError("");
    setModal({ mode: "add" });
  };

  const openEdit = (sub) => {
    setForm({
      subject_name: sub.subject_name || "",
      subject_code: sub.subject_code || "",
      description: sub.description || "",
    });
    setFormError("");
    setModal({ mode: "edit", id: sub.id });
  };

  const submitSubjectForm = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    const body = {
      subject_name: form.subject_name.trim(),
      subject_code: form.subject_code.trim(),
      description: form.description?.trim() || null,
    };
    try {
      if (modal.mode === "add") {
        await subjectsApi.create(body);
        setToast("Subject created successfully");
      } else {
        await subjectsApi.update(modal.id, body);
        setToast("Subject updated successfully");
      }
      setModal(null);
      await loadInitialData();
      if (selectedCourseId) await loadCourseSubjects(selectedCourseId);
    } catch (err) {
      handleError(err, setFormError);
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteSubject = async () => {
    try {
      await subjectsApi.remove(toDelete.id);
      setToast("Subject deleted successfully");
      setToDelete(null);
      await loadInitialData();
      if (selectedCourseId) await loadCourseSubjects(selectedCourseId);
    } catch (err) {
      handleError(err, setError);
    }
  };

  // Course-Subject Mapping Handlers
  const handleAssignSubject = async (e) => {
    e.preventDefault();
    if (!selectedCourseId || !assignSubjectId) return;
    setMappingActionBusy(true);
    setMappingFeedback(null);
    try {
      await courseSubjectsApi.assign(selectedCourseId, assignSubjectId);
      setMappingFeedback({ type: "success", message: "Subject assigned to course successfully" });
      setAssignSubjectId("");
      await loadCourseSubjects(selectedCourseId);
    } catch (err) {
      handleError(err, (msg) => setMappingFeedback({ type: "error", message: msg }));
    } finally {
      setMappingActionBusy(false);
    }
  };

  const handleRemoveSubject = async (subjectId) => {
    if (!selectedCourseId) return;
    setMappingActionBusy(true);
    setMappingFeedback(null);
    try {
      await courseSubjectsApi.remove(selectedCourseId, subjectId);
      setMappingFeedback({ type: "success", message: "Subject removed from course" });
      await loadCourseSubjects(selectedCourseId);
    } catch (err) {
      handleError(err, (msg) => setMappingFeedback({ type: "error", message: msg }));
    } finally {
      setMappingActionBusy(false);
    }
  };

  const filteredSubjects = subjects.filter((s) =>
    `${s.subject_name} ${s.subject_code} ${s.description || ""}`
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  const selectedCourse = courses.find((c) => String(c.id) === String(selectedCourseId));
  const assignedSubjectIds = new Set(assignedSubjects.map((s) => s.id));
  const availableToAssign = subjects.filter((s) => !assignedSubjectIds.has(s.id));

  return (
    <div className="manage-page">
      {/* View Switcher Chips */}
      <div className="tt-filters" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            id="subtab-subjects-list"
            className={`tt-chip ${subTab === "subjects" ? "active" : ""}`}
            onClick={() => setSubTab("subjects")}
          >
            📖 All Subjects ({subjects.length})
          </button>
          <button
            id="subtab-course-mapping"
            className={`tt-chip ${subTab === "mapping" ? "active" : ""}`}
            onClick={() => setSubTab("mapping")}
          >
            🔗 Course-Subject Mapping
          </button>
        </div>

        {subTab === "subjects" && (
          <div style={{ display: "flex", gap: "0.8rem", alignItems: "center" }}>
            <input
              id="search-subjects-input"
              className="search"
              placeholder="Search subjects…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ width: "220px", padding: "0.5rem 0.9rem" }}
            />
            <button id="add-subject-btn" className="btn-primary" style={{ marginTop: 0 }} onClick={openAdd}>
              + Add Subject
            </button>
          </div>
        )}
      </div>

      {toast && <div className="pill" style={{ background: "rgba(34,197,94,0.18)", borderColor: "rgba(34,197,94,0.4)", color: "#86efac", marginBottom: "1rem" }}>{toast}</div>}
      {error && <div className="error" role="alert" style={{ marginBottom: "1rem" }}>{error}</div>}

      {loading ? (
        <div className="glass panel empty"><div className="spinner" /></div>
      ) : subTab === "subjects" ? (
        /* ALL SUBJECTS LIST */
        filteredSubjects.length === 0 ? (
          <div className="glass panel empty">
            <div className="big">📖</div>
            <h2>{subjects.length === 0 ? "No subjects yet" : "No matching subjects"}</h2>
            <p className="muted">
              {subjects.length === 0
                ? "Create your first subject to assign to courses and timetables."
                : "Try a different search term."}
            </p>
            {subjects.length === 0 && (
              <button className="btn-primary" style={{ marginTop: "1rem" }} onClick={openAdd}>
                + Add Subject
              </button>
            )}
          </div>
        ) : (
          <div className="glass panel" style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Subject Code</th>
                  <th>Subject Name</th>
                  <th>Description</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubjects.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <span className="pill course-code" style={{ fontSize: "0.8rem" }}>{s.subject_code}</span>
                    </td>
                    <td><b>{s.subject_name}</b></td>
                    <td className="muted">{s.description || "—"}</td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <button
                        className="btn-ghost"
                        style={{ padding: "0.3rem 0.6rem", display: "inline-block" }}
                        onClick={() => openEdit(s)}
                      >
                        ✎ Edit
                      </button>
                      <button
                        className="btn-ghost"
                        style={{ padding: "0.3rem 0.6rem", display: "inline-block", color: "#ff9aa8" }}
                        onClick={() => setToDelete(s)}
                      >
                        ✕ Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        /* COURSE-SUBJECT MAPPING VIEW */
        <div className="grid-main" style={{ gridTemplateColumns: "1.8fr 1fr" }}>
          <div className="glass panel">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2rem", flexWrap: "wrap", gap: "0.8rem" }}>
              <div>
                <h2>Assigned Subjects</h2>
                <p className="muted">
                  {selectedCourse ? `Viewing subjects for ${selectedCourse.course_name} (${selectedCourse.course_code})` : "Select a course"}
                </p>
              </div>

              {/* Course Selector */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span className="muted" style={{ fontSize: "0.85rem" }}>Programme:</span>
                <select
                  id="mapping-course-select"
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  style={{
                    padding: "0.5rem 0.8rem",
                    borderRadius: "10px",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid var(--border)",
                    color: "inherit",
                    font: "inherit",
                  }}
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id} style={{ background: "#15123a" }}>
                      {c.course_name} ({c.course_code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {mappingFeedback && (
              <div
                className={mappingFeedback.type === "success" ? "pill" : "error"}
                style={
                  mappingFeedback.type === "success"
                    ? { background: "rgba(34,197,94,0.18)", borderColor: "rgba(34,197,94,0.4)", color: "#86efac", marginBottom: "1rem", display: "flex", justifyContent: "space-between" }
                    : { marginBottom: "1rem" }
                }
              >
                <span>{mappingFeedback.message}</span>
                <button className="btn-ghost" style={{ padding: "0 0.4rem" }} onClick={() => setMappingFeedback(null)}>✕</button>
              </div>
            )}

            {mappingLoading ? (
              <div className="empty"><div className="spinner" /></div>
            ) : assignedSubjects.length === 0 ? (
              <div className="empty" style={{ padding: "2.5rem 1rem" }}>
                <div className="big">🔗</div>
                <h3>No subjects assigned</h3>
                <p className="muted">Assign subjects from the right panel to build this programme's curriculum.</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Subject Name</th>
                    <th>Description</th>
                    <th style={{ textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {assignedSubjects.map((s) => (
                    <tr key={s.id}>
                      <td><span className="pill course-code">{s.subject_code}</span></td>
                      <td><b>{s.subject_name}</b></td>
                      <td className="muted">{s.description || "—"}</td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          className="btn-ghost"
                          disabled={mappingActionBusy}
                          style={{ padding: "0.3rem 0.6rem", color: "#ff9aa8" }}
                          onClick={() => handleRemoveSubject(s.id)}
                        >
                          ✕ Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Quick Assign Panel */}
          <div className="glass panel">
            <h2>Assign New Subject</h2>
            <p className="muted" style={{ marginBottom: "1.2rem", fontSize: "0.85rem" }}>
              Link an existing subject to {selectedCourse ? selectedCourse.course_name : "this course"}.
            </p>

            <form onSubmit={handleAssignSubject} style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
              <label htmlFor="assign-subject-select" className="muted" style={{ fontSize: "0.85rem" }}>
                Choose Subject:
              </label>
              <select
                id="assign-subject-select"
                value={assignSubjectId}
                onChange={(e) => setAssignSubjectId(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "0.7rem",
                  borderRadius: "10px",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid var(--border)",
                  color: "inherit",
                  font: "inherit",
                }}
              >
                <option value="" style={{ background: "#15123a" }}>-- Select a subject --</option>
                {availableToAssign.map((s) => (
                  <option key={s.id} value={s.id} style={{ background: "#15123a" }}>
                    {s.subject_name} ({s.subject_code})
                  </option>
                ))}
              </select>

              {availableToAssign.length === 0 && subjects.length > 0 && (
                <p className="note">All existing subjects are already assigned to this course.</p>
              )}

              <button
                type="submit"
                className="btn-primary"
                disabled={mappingActionBusy || !assignSubjectId || !selectedCourseId}
                style={{ marginTop: "0.6rem" }}
              >
                {mappingActionBusy ? "Assigning…" : "+ Assign to Course"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Subject Modal */}
      {modal && (
        <Portal>
          <div className="modal-backdrop" onClick={() => setModal(null)}>
            <div className="glass modal-card" onClick={(e) => e.stopPropagation()}>
              <h2>{modal.mode === "add" ? "Add New Subject" : "Edit Subject"}</h2>
              <p className="muted">Enter curriculum subject code and name.</p>

              <form onSubmit={submitSubjectForm} style={{ display: "flex", flexDirection: "column", gap: "0.8rem", marginTop: "1rem" }}>
                <div>
                  <label htmlFor="subject_code" className="muted" style={{ fontSize: "0.85rem", display: "block", marginBottom: "0.3rem" }}>
                    Subject Code *
                  </label>
                  <input
                    id="subject_code"
                    value={form.subject_code}
                    onChange={(e) => setForm({ ...form, subject_code: e.target.value })}
                    placeholder="e.g. CS201, MAT102"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="subject_name" className="muted" style={{ fontSize: "0.85rem", display: "block", marginBottom: "0.3rem" }}>
                    Subject Name *
                  </label>
                  <input
                    id="subject_name"
                    value={form.subject_name}
                    onChange={(e) => setForm({ ...form, subject_name: e.target.value })}
                    placeholder="e.g. Object Oriented Programming"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="subject_desc" className="muted" style={{ fontSize: "0.85rem", display: "block", marginBottom: "0.3rem" }}>
                    Description
                  </label>
                  <input
                    id="subject_desc"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Optional syllabus summary or topics"
                  />
                </div>

                {formError && <div className="error" role="alert">{formError}</div>}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.8rem", marginTop: "1rem" }}>
                  <button type="button" className="btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                  <button type="submit" className="btn-primary" style={{ marginTop: 0 }} disabled={saving}>
                    {saving ? "Saving…" : modal.mode === "add" ? "Create Subject" : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}

      {/* Delete Subject Confirmation Modal */}
      {toDelete && (
        <Portal>
          <div className="modal-backdrop" onClick={() => setToDelete(null)}>
            <div className="glass modal-card" onClick={(e) => e.stopPropagation()}>
              <h2>Delete Subject?</h2>
              <p className="muted" style={{ marginTop: "0.5rem" }}>
                Are you sure you want to delete <b>{toDelete.subject_name}</b> ({toDelete.subject_code})? Any course mappings for this subject will also be removed.
              </p>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.8rem", marginTop: "1.4rem" }}>
                <button className="btn-ghost" onClick={() => setToDelete(null)}>Cancel</button>
                <button
                  className="btn-primary"
                  style={{ background: "linear-gradient(135deg, #ef4444, #f43f5e)", marginTop: 0 }}
                  onClick={confirmDeleteSubject}
                >
                  Delete Subject
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
