import { useCallback, useEffect, useState } from "react";
import { accountsApi } from "../api.js";
import Portal from "./Portal.jsx";

const BLANK = {
  role: "student",
  username: "",
  email: "",
  password: "",
  full_name: "",
  phone: "",
  address: "",
  roll_number: "",
  class_name: "",
  employee_id: "",
  subject: "",
};

const ROLE_TABS = [
  { id: "student", label: "🧑‍🎓 Students", singular: "student" },
  { id: "teacher", label: "👩‍🏫 Teachers", singular: "teacher" },
];

export default function Accounts({ onUnauthorized }) {
  const [roleTab, setRoleTab] = useState("student");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const fail = useCallback(
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
      setRows(await accountsApi.list());
    } catch (e) {
      fail(e, setError);
    } finally {
      setLoading(false);
    }
  }, [fail]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const set = (name) => (e) => setForm({ ...form, [name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    const body = {
      username: form.username.trim(),
      email: form.email.trim(),
      password: form.password,
      role: form.role,
      full_name: form.full_name.trim(),
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
    };
    if (form.role === "student") {
      body.roll_number = form.roll_number.trim();
      body.class_name = form.class_name.trim();
    } else {
      body.employee_id = form.employee_id.trim();
      body.subject = form.subject.trim();
    }
    try {
      await accountsApi.create(body);
      setToast(`${form.role} account created`);
      setOpen(false);
      await load();
    } catch (err) {
      // FastAPI validation errors come back as an array; fall back to a message
      fail(err, setFormError);
    } finally {
      setSaving(false);
    }
  };

  const isStudent = form.role === "student";
  const counts = {
    student: rows.filter((r) => r.role === "student").length,
    teacher: rows.filter((r) => r.role === "teacher").length,
  };
  const visible = rows.filter((r) => r.role === roleTab);

  return (
    <div className="glass panel">
      <div className="panel-head">
        <h2>{roleTab === "student" ? "Student" : "Teacher"} accounts ({visible.length})</h2>
        <div className="panel-actions">
          <button
            id="add-account-btn"
            className="btn-primary btn-add"
            onClick={() => {
              setForm({ ...BLANK, role: roleTab });
              setFormError("");
              setOpen(true);
            }}
          >
            ＋ Create account
          </button>
        </div>
      </div>

      <div className="std-chips">
        {ROLE_TABS.map((t) => (
          <button
            key={t.id}
            id={`accounts-tab-${t.id}`}
            className={`chip ${roleTab === t.id ? "active" : ""}`}
            onClick={() => setRoleTab(t.id)}
          >
            {t.label} ({counts[t.id]})
          </button>
        ))}
      </div>

      {error && <div className="error">{error}</div>}

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Username</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan="3" className="muted center">Loading…</td></tr>
            )}
            {!loading &&
              visible.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className="cell-user">
                      <div className="avatar sm">{r.username?.[0]?.toUpperCase()}</div>
                      <div><b>{r.email}</b></div>
                    </div>
                  </td>
                  <td>{r.username}</td>
                  <td><span className="badge active">{r.role}</span></td>
                </tr>
              ))}
            {!loading && visible.length === 0 && (
              <tr><td colSpan="3" className="muted center">No {roleTab} accounts yet. Create the first one!</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <Portal><div className="modal-backdrop" onClick={() => !saving && setOpen(false)}>
          <form className="glass modal" onSubmit={submit} onClick={(e) => e.stopPropagation()}>
            <h2>Create account</h2>
            <div className="form-grid">
              <label className="full">
                Role *
                <select id="account-role" value={form.role} onChange={set("role")}>
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                </select>
              </label>
              <label>
                Username *
                <input id="account-username" required minLength={3} maxLength={50} value={form.username} onChange={set("username")} />
              </label>
              <label>
                Password *
                <input id="account-password" type="password" required value={form.password} onChange={set("password")} />
              </label>
              <label>
                Email *
                <input id="account-email" type="email" required minLength={5} value={form.email} onChange={set("email")} />
              </label>
              <label>
                Full name *
                <input id="account-full_name" required value={form.full_name} onChange={set("full_name")} />
              </label>
              <label>
                Phone
                <input id="account-phone" value={form.phone} onChange={set("phone")} />
              </label>
              {isStudent ? (
                <>
                  <label>
                    Roll number *
                    <input id="account-roll_number" required value={form.roll_number} onChange={set("roll_number")} />
                  </label>
                  <label>
                    Class *
                    <input id="account-class_name" required value={form.class_name} onChange={set("class_name")} />
                  </label>
                </>
              ) : (
                <>
                  <label>
                    Employee ID *
                    <input id="account-employee_id" required value={form.employee_id} onChange={set("employee_id")} />
                  </label>
                  <label>
                    Subject *
                    <input id="account-subject" required value={form.subject} onChange={set("subject")} />
                  </label>
                </>
              )}
              <label className="full">
                Address
                <input id="account-address" value={form.address} onChange={set("address")} />
              </label>
            </div>
            {formError && <div className="error">{formError}</div>}
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setOpen(false)} disabled={saving}>Cancel</button>
              <button id="save-account-btn" type="submit" className="btn-primary" disabled={saving}>
                {saving ? "Saving…" : "Create"}
              </button>
            </div>
          </form>
        </div></Portal>
      )}

      {toast && <Portal><div className="toast">✅ {toast}</div></Portal>}
    </div>
  );
}
