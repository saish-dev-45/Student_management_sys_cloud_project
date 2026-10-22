import { useEffect, useState } from "react";
import { getApiRoot, teacherProfileApi } from "../api.js";
import TeacherCourses from "./TeacherCourses.jsx";
import TeacherTimetable from "./TeacherTimetable.jsx";
import TeacherLeaves from "./TeacherLeaves.jsx";
import EditProfileModal from "./EditProfileModal.jsx";

export default function TeacherDashboard({ teacher: initialTeacher, message, onLogout }) {
  const [api, setApi] = useState("checking");
  const [tab, setTab] = useState("profile");
  const [teacher, setTeacher] = useState(initialTeacher);
  const [showEdit, setShowEdit] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    getApiRoot().then(() => setApi("online")).catch(() => setApi("offline"));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const rows = [
    ["Full name", teacher.full_name],
    ["Username", teacher.username],
    ["Email", teacher.email],
    ["Employee ID", teacher.employee_id],
    ["Subject", teacher.subject],
    ["Phone", teacher.phone || "Not provided"],
    ["Address", teacher.address || "Not provided"],
  ];

  const handleUpdateProfile = async (phone, address) => {
    const res = await teacherProfileApi.update({ phone, address });
    setTeacher((prev) => ({ ...prev, ...res.teacher }));
    setToast("Contact information updated!");
  };

  const handleChangePassword = async (currentPw, newPw) => {
    await teacherProfileApi.changePassword({
      current_password: currentPw,
      new_password: newPw,
    });
  };

  return (
    <div className="shell">
      <aside className="glass sidebar open-static">
        <div className="brand"><span>🎓</span> EduDesk</div>
        <nav>
          <button
            id="nav-profile"
            className={`nav-item ${tab === "profile" ? "active" : ""}`}
            onClick={() => setTab("profile")}
          >
            <span>👩‍🏫</span> My Profile
          </button>
          <button
            id="nav-courses"
            className={`nav-item ${tab === "courses" ? "active" : ""}`}
            onClick={() => setTab("courses")}
          >
            <span>📚</span> My Courses
          </button>
          <button
            id="nav-timetable"
            className={`nav-item ${tab === "timetable" ? "active" : ""}`}
            onClick={() => setTab("timetable")}
          >
            <span>🗓️</span> My Timetable
          </button>
          <button
            id="nav-teacher-leaves"
            className={`nav-item ${tab === "leaves" ? "active" : ""}`}
            onClick={() => setTab("leaves")}
          >
            <span>🏖️</span> Leave Requests
          </button>
        </nav>
        <button id="teacher-logout-btn" className="btn-ghost" onClick={onLogout}>⎋ Log out</button>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <h1>Teacher Portal</h1>
            <p className="muted">{message}</p>
          </div>
          <div className="topbar-right">
            <span className={`pill api-${api}`}><i /> API {api}</span>
            <div className="avatar" title={teacher.full_name}>
              {teacher.full_name?.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {tab === "courses" && <TeacherCourses onUnauthorized={onLogout} />}
        {tab === "timetable" && <TeacherTimetable onUnauthorized={onLogout} />}
        {tab === "leaves" && <TeacherLeaves onUnauthorized={onLogout} />}

        {tab === "profile" && (
          <div className="grid-main">
            <div className="glass panel">
              <div className="panel-head">
                <h2>Profile Details</h2>
                <button
                  id="edit-teacher-profile-btn"
                  className="btn-secondary"
                  style={{ padding: "0.4rem 0.9rem", fontSize: "0.85rem" }}
                  onClick={() => setShowEdit(true)}
                >
                  ✏️ Edit Profile
                </button>
              </div>
              <ul className="info">
                {rows.map(([k, v]) => (
                  <li key={k}><span>{k}</span><b>{v || "—"}</b></li>
                ))}
              </ul>
            </div>
            <div className="glass panel">
              <h2>Session</h2>
              <ul className="info">
                <li><span>Role</span><b>teacher</b></li>
                <li><span>Session length</span><b>1 hour</b></li>
                <li><span>Portal Access</span><b style={{ color: "var(--green)" }}>Granted</b></li>
              </ul>
              <p className="note">Use the sidebar to access courses, timetable, and leave management.</p>
            </div>
          </div>
        )}
      </section>

      {showEdit && (
        <EditProfileModal
          currentPhone={teacher.phone || ""}
          currentAddress={teacher.address || ""}
          onUpdateProfile={handleUpdateProfile}
          onChangePassword={handleChangePassword}
          onClose={() => setShowEdit(false)}
        />
      )}

      {toast && <div className="toast">✅ {toast}</div>}
    </div>
  );
}
