import { useEffect, useState } from "react";
import { getApiRoot, studentProfileApi } from "../api.js";
import StudentCourses from "./StudentCourses.jsx";
import StudentTimetable from "./StudentTimetable.jsx";
import StudentLeaves from "./StudentLeaves.jsx";
import EditProfileModal from "./EditProfileModal.jsx";

export default function StudentDashboard({ student: initialStudent, message, onLogout }) {
  const [api, setApi] = useState("checking");
  const [tab, setTab] = useState("profile");
  const [student, setStudent] = useState(initialStudent);
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

  const profileRows = [
    ["Full Name", student.full_name],
    ["Username", student.username],
    ["Roll Number", student.roll_number],
    ["Class / Grade", student.class_name],
    ["Email Address", student.email],
    ["Contact Phone", student.phone || "Not provided"],
    ["Residential Address", student.address || "Not provided"],
  ];

  const handleUpdateProfile = async (phone, address) => {
    const res = await studentProfileApi.update({ phone, address });
    setStudent((prev) => ({ ...prev, ...res.student }));
    setToast("Contact information updated!");
  };

  const handleChangePassword = async (currentPw, newPw) => {
    await studentProfileApi.changePassword({
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
            id="nav-student-profile"
            className={`nav-item ${tab === "profile" ? "active" : ""}`}
            onClick={() => setTab("profile")}
          >
            <span>🎒</span> My Profile
          </button>
          <button
            id="nav-student-courses"
            className={`nav-item ${tab === "courses" ? "active" : ""}`}
            onClick={() => setTab("courses")}
          >
            <span>📚</span> My Courses
          </button>
          <button
            id="nav-student-timetable"
            className={`nav-item ${tab === "timetable" ? "active" : ""}`}
            onClick={() => setTab("timetable")}
          >
            <span>🗓️</span> My Timetable
          </button>
          <button
            id="nav-student-leaves"
            className={`nav-item ${tab === "leaves" ? "active" : ""}`}
            onClick={() => setTab("leaves")}
          >
            <span>🏖️</span> Leave Requests
          </button>
        </nav>
        <button id="student-logout-btn" className="btn-ghost" onClick={onLogout}>
          ⎋ Log out
        </button>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <h1>Student Portal</h1>
            <p className="muted">{message || `Welcome back, ${student.full_name}!`}</p>
          </div>
          <div className="topbar-right">
            <span className={`pill api-${api}`}><i /> API {api}</span>
            <div className="avatar" title={student.full_name}>
              {student.full_name?.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {tab === "courses" && <StudentCourses onUnauthorized={onLogout} />}
        {tab === "timetable" && (
          <StudentTimetable
            onUnauthorized={onLogout}
            onNavigateToCourses={() => setTab("courses")}
          />
        )}
        {tab === "leaves" && <StudentLeaves onUnauthorized={onLogout} />}

        {tab === "profile" && (
          <>
            <div className="grid-stats">
              <div className="glass stat tone-violet">
                <div className="stat-icon">🎒</div>
                <div>
                  <p className="muted">Class</p>
                  <div className="stat-value" style={{ fontSize: "1.4rem" }}>{student.class_name || "—"}</div>
                </div>
              </div>
              <div className="glass stat tone-cyan">
                <div className="stat-icon">🔢</div>
                <div>
                  <p className="muted">Roll Number</p>
                  <div className="stat-value" style={{ fontSize: "1.4rem" }}>{student.roll_number || "—"}</div>
                </div>
              </div>
              <div className="glass stat tone-green">
                <div className="stat-icon">✨</div>
                <div>
                  <p className="muted">Status</p>
                  <div className="stat-value" style={{ fontSize: "1.4rem" }}>Active</div>
                </div>
              </div>
              <div className="glass stat tone-pink">
                <div className="stat-icon">🆔</div>
                <div>
                  <p className="muted">Student ID</p>
                  <div className="stat-value" style={{ fontSize: "1.4rem" }}>#{student.id}</div>
                </div>
              </div>
            </div>

            <div className="grid-main">
              <div className="glass panel">
                <div className="panel-head">
                  <h2>Student Profile Details</h2>
                  <button
                    id="edit-student-profile-btn"
                    className="btn-secondary"
                    style={{ padding: "0.4rem 0.9rem", fontSize: "0.85rem" }}
                    onClick={() => setShowEdit(true)}
                  >
                    ✏️ Edit Profile
                  </button>
                </div>
                <ul className="info">
                  {profileRows.map(([k, v]) => (
                    <li key={k}>
                      <span>{k}</span>
                      <b>{v || "—"}</b>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="glass panel">
                <h2>Session &amp; Security</h2>
                <ul className="info">
                  <li><span>Account Role</span><b>student</b></li>
                  <li><span>Session Duration</span><b>1 hour</b></li>
                  <li><span>Portal Access</span><b style={{ color: "var(--green)" }}>Granted</b></li>
                </ul>
                <p className="note">
                  Welcome to your student portal. Browse courses, view your timetable, and manage leave requests.
                </p>
              </div>
            </div>
          </>
        )}
      </section>

      {showEdit && (
        <EditProfileModal
          currentPhone={student.phone || ""}
          currentAddress={student.address || ""}
          onUpdateProfile={handleUpdateProfile}
          onChangePassword={handleChangePassword}
          onClose={() => setShowEdit(false)}
        />
      )}

      {toast && <div className="toast">✅ {toast}</div>}
    </div>
  );
}
