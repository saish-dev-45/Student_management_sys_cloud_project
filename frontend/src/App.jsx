import { useEffect, useState } from "react";
import {
  getDashboard,
  logout,
  getTeacherDashboard,
  teacherLogout,
  getStudentDashboard,
  studentLogout,
} from "./api.js";
import Login from "./components/Login.jsx";
import Dashboard from "./components/Dashboard.jsx";
import TeacherDashboard from "./components/TeacherDashboard.jsx";
import StudentDashboard from "./components/StudentDashboard.jsx";

export default function App() {
  const [status, setStatus] = useState("loading"); // loading | guest | admin | teacher | student
  const [message, setMessage] = useState("");
  const [teacher, setTeacher] = useState(null);
  const [student, setStudent] = useState(null);

  const loadAdmin = async () => {
    const d = await getDashboard();
    setMessage(d.message);
    setStatus("admin");
  };

  const loadTeacher = async () => {
    const d = await getTeacherDashboard();
    setMessage(d.message);
    setTeacher(d.teacher);
    setStatus("teacher");
  };

  const loadStudent = async () => {
    const d = await getStudentDashboard();
    setMessage(d.message);
    setStudent(d.student);
    setStatus("student");
  };

  // Restore session on refresh: session holds admin_id, teacher_id, or student_id
  useEffect(() => {
    loadAdmin()
      .catch(() => loadTeacher())
      .catch(() => loadStudent())
      .catch(() => setStatus("guest"));
  }, []);

  const handleLoggedIn = (role) => {
    if (role === "student") return loadStudent();
    if (role === "teacher") return loadTeacher();
    return loadAdmin();
  };

  const handleLogout = async () => {
    try {
      if (status === "student") await studentLogout();
      else if (status === "teacher") await teacherLogout();
      else await logout();
    } finally {
      setTeacher(null);
      setStudent(null);
      setStatus("guest");
    }
  };

  if (status === "loading") {
    return (
      <div className="splash">
        <div className="spinner" />
      </div>
    );
  }

  if (status === "admin") return <Dashboard message={message} onLogout={handleLogout} />;
  if (status === "teacher")
    return <TeacherDashboard teacher={teacher} message={message} onLogout={handleLogout} />;
  if (status === "student")
    return <StudentDashboard student={student} message={message} onLogout={handleLogout} />;
  return <Login onSuccess={handleLoggedIn} />;
}

