import { useCallback, useEffect, useMemo, useState } from "react";
import { studentsApi, teachersApi, coursesApi } from "../api.js";
import Portal from "./Portal.jsx";

const CONFIGS = {
  students: {
    api: studentsApi,
    singular: "student",
    plural: "Students",
    idField: "roll_number",
    idLabel: "Roll number",
    extraField: "class_name",
    extraLabel: "Class",
    fields: [
      { name: "full_name", label: "Full name", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "phone", label: "Phone" },
      { name: "roll_number", label: "Roll number", required: true },
      { name: "class_name", label: "Class", required: true },
      { name: "address", label: "Address" },
    ],
  },
  teachers: {
    api: teachersApi,
    singular: "teacher",
    plural: "Teachers",
    idField: "employee_id",
    idLabel: "Employee ID",
    extraField: "subject",
    extraLabel: "Subject",
    fields: [
      { name: "full_name", label: "Full name", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "phone", label: "Phone" },
      { name: "employee_id", label: "Employee ID", required: true },
      { name: "subject", label: "Subject", required: true },
      { name: "address", label: "Address" },
    ],
  },
  courses: {
    api: coursesApi,
    singular: "course",
    plural: "Courses",
    nameField: "course_name",
    subField: "course_code",
    idField: "course_code",
    idLabel: "Course code",
    extraField: "duration",
    extraLabel: "Duration",
    thirdField: "teacher_id",
    thirdLabel: "Teacher ID",
    fields: [
      { name: "course_name", label: "Course name", required: true },
      { name: "course_code", label: "Course code", required: true },
      { name: "duration", label: "Duration" },
      { name: "teacher_id", label: "Teacher ID", type: "number", numeric: true },
      { name: "description", label: "Description" },
    ],
  },
};

function blankForm(cfg) {
  return Object.fromEntries(cfg.fields.map((f) => [f.name, ""]));
}

export default function ManageRecords({ kind, onUnauthorized }) {
  const cfg = CONFIGS[kind];
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(null); // null | { mode: "add" | "edit", id? }
  const [form, setForm] = useState(blankForm(cfg));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [toDelete, setToDelete] = useState(null);

  const handleError = useCallback(
    (e, setter) => {
      if (e.status === 401) onUnauthorized?.();
      setter(e.message);
    },
    [onUnauthorized]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setRows(await cfg.api.list());
    } catch (e) {
      handleError(e, setError);
    } finally {
      setLoading(false);
    }
  }, [cfg, handleError]);

  useEffect(() => {
    setQuery("");
    setModal(null);
    load();
  }, [kind, load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const filtered = useMemo(
    () =>
      rows.filter((r) =>
        Object.values(r).join(" ").toLowerCase().includes(query.toLowerCase())
      ),
    [rows, query]
  );

  const openAdd = () => {
    setForm(blankForm(cfg));
    setFormError("");
    setModal({ mode: "add" });
  };

  const openEdit = (row) => {
    setForm(Object.fromEntries(cfg.fields.map((f) => [f.name, row[f.name] ?? ""])));
    setFormError("");
    setModal({ mode: "edit", id: row.id });
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    // Send optional empty fields as null so they clear correctly
    const body = Object.fromEntries(
      cfg.fields.map((f) => {
        const v = String(form[f.name]).trim();
        if (v === "" && !f.required) return [f.name, null];
        return [f.name, f.numeric ? Number(v) : v];
      })
    );
    try {
      if (modal.mode === "add") {
        await cfg.api.create(body);
        setToast(`${cfg.singular} added`);
      } else {
        await cfg.api.update(modal.id, body);
        setToast(`${cfg.singular} updated`);
      }
      setModal(null);
      await load();
    } catch (err) {
      handleError(err, setFormError);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    try {
      await cfg.api.remove(toDelete.id);
      setToast(`${cfg.singular} deleted`);
      setToDelete(null);
      await load();
    } catch (err) {
      setToDelete(null);
      handleError(err, setError);
    }
  };

  return (
    <div className="glass panel">
      <div className="panel-head">
        <h2>All {cfg.plural.toLowerCase()} ({rows.length})</h2>
        <div className="panel-actions">
          <input
            id={`${kind}-search`}
            className="search"
            placeholder={`🔍 Search ${cfg.plural.toLowerCase()}…`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button id={`add-${cfg.singular}-btn`} className="btn-primary btn-add" onClick={openAdd}>
            ＋ Add {cfg.singular}
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>{cfg.singular[0].toUpperCase() + cfg.singular.slice(1)}</th>
              <th>{cfg.idLabel}</th>
              <th>{cfg.extraLabel}</th>
              <th>{cfg.thirdLabel || "Phone"}</th>
              <th className="right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan="5" className="muted center">Loading…</td></tr>
            )}
            {!loading &&
              filtered.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className="cell-user">
                      <div className="avatar sm">{r[cfg.nameField || "full_name"]?.[0]?.toUpperCase()}</div>
                      <div><b>{r[cfg.nameField || "full_name"]}</b><small>{r[cfg.subField || "email"]}</small></div>
                    </div>
                  </td>
                  <td>{r[cfg.idField]}</td>
                  <td><span className="badge active">{r[cfg.extraField] || "—"}</span></td>
                  <td>{r[cfg.thirdField || "phone"] ?? "—"}</td>
                  <td className="right">
                    <button id={`edit-${cfg.singular}-${r.id}`} className="icon-btn" title="Edit" onClick={() => openEdit(r)}>✏️</button>
                    <button id={`delete-${cfg.singular}-${r.id}`} className="icon-btn danger" title="Delete" onClick={() => setToDelete(r)}>🗑️</button>
                  </td>
                </tr>
              ))}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan="5" className="muted center">
                  {rows.length === 0 ? `No ${cfg.plural.toLowerCase()} yet. Add the first one!` : "No matches for your search."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <Portal><div className="modal-backdrop" onClick={() => !saving && setModal(null)}>
          <form className="glass modal" onSubmit={submit} onClick={(e) => e.stopPropagation()}>
            <h2>{modal.mode === "add" ? "Add" : "Edit"} {cfg.singular}</h2>
            <div className="form-grid">
              {cfg.fields.map((f) => (
                <label key={f.name} className={f.name === "address" ? "full" : ""}>
                  {f.label}{f.required && " *"}
                  <input
                    id={`${cfg.singular}-${f.name}`}
                    type={f.type || "text"}
                    required={f.required}
                    value={form[f.name]}
                    onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                  />
                </label>
              ))}
            </div>
            {formError && <div className="error">{formError}</div>}
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setModal(null)} disabled={saving}>Cancel</button>
              <button id={`save-${cfg.singular}-btn`} type="submit" className="btn-primary" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </div></Portal>
      )}

      {toDelete && (
        <Portal><div className="modal-backdrop" onClick={() => setToDelete(null)}>
          <div className="glass modal small" onClick={(e) => e.stopPropagation()}>
            <h2>Delete {cfg.singular}?</h2>
            <p className="muted">
              <b>{toDelete[cfg.nameField || "full_name"]}</b> will be permanently removed. This can't be undone.
            </p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setToDelete(null)}>Cancel</button>
              <button id="confirm-delete-btn" className="btn-danger" onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div></Portal>
      )}

      {toast && <Portal><div className="toast">✅ {toast}</div></Portal>}
    </div>
  );
}
