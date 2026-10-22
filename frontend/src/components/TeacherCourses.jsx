import { useEffect, useState } from "react";
import { teacherCoursesApi } from "../api.js";

export default function TeacherCourses({ onUnauthorized }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    teacherCoursesApi
      .list()
      .then((d) => setCourses(d.courses || []))
      .catch((e) => {
        if (e.status === 401) onUnauthorized?.();
        else setError(e.message);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="glass panel empty">
        <div className="spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass panel empty">
        <div className="big">⚠️</div>
        <h2>Couldn't load courses</h2>
        <p className="muted">{error}</p>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="glass panel empty">
        <div className="big">📚</div>
        <h2>No courses assigned</h2>
        <p className="muted">Courses assigned to you by an admin will appear here.</p>
      </div>
    );
  }

  return (
    <>
      <p className="muted course-count">
        {courses.length} course{courses.length === 1 ? "" : "s"} assigned to you
      </p>
      <div className="course-grid">
        {courses.map((c, i) => (
          <article
            key={c.id}
            id={`teacher-course-${c.id}`}
            className="glass panel course-card"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <span className="pill course-code">{c.course_code}</span>
            <h2>{c.course_name}</h2>
            <p className="muted">{c.description || "No description provided."}</p>
            <div className="course-meta">
              <span>⏱ Duration</span>
              <b>{c.duration || "—"}</b>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
