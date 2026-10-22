import { useEffect, useState } from "react";
import { studentCoursesApi } from "../api.js";

export default function StudentCourses({ onUnauthorized }) {
  const [tab, setTab] = useState("my"); // "my" | "available"
  const [myCourses, setMyCourses] = useState([]);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [enrollingId, setEnrollingId] = useState(null);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: string }
  const [search, setSearch] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [myRes, availRes] = await Promise.all([
        studentCoursesApi.myCourses(),
        studentCoursesApi.available(),
      ]);
      setMyCourses(myRes.courses || []);
      setAvailableCourses(availRes.courses || []);
    } catch (err) {
      if (err.status === 401) {
        onUnauthorized?.();
      } else {
        setError(err.message || "Failed to load courses");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEnroll = async (course) => {
    setEnrollingId(course.id);
    setFeedback(null);
    try {
      const res = await studentCoursesApi.enroll(course.id);
      setFeedback({
        type: "success",
        message: res.message || `Successfully enrolled in ${course.course_name}!`,
      });

      // Update state immediately
      setAvailableCourses((prev) =>
        prev.map((c) => (c.id === course.id ? { ...c, is_enrolled: true } : c))
      );

      // Refresh enrolled list
      const refreshedMy = await studentCoursesApi.myCourses();
      setMyCourses(refreshedMy.courses || []);
    } catch (err) {
      if (err.status === 401) {
        onUnauthorized?.();
      } else {
        setFeedback({
          type: "error",
          message: err.message || "Enrollment failed. Please try again.",
        });
      }
    } finally {
      setEnrollingId(null);
    }
  };

  const filterCourses = (list) => {
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (c) =>
        c.course_name?.toLowerCase().includes(q) ||
        c.course_code?.toLowerCase().includes(q) ||
        c.teacher_name?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q)
    );
  };

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
        <button className="btn-primary" style={{ marginTop: "1rem" }} onClick={loadData}>
          Retry
        </button>
      </div>
    );
  }

  const filteredMy = filterCourses(myCourses);
  const filteredAvailable = filterCourses(availableCourses);

  return (
    <>
      {/* Subtab selection & search header */}
      <div className="tt-filters" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            id="tab-my-courses"
            className={`tt-chip ${tab === "my" ? "active" : ""}`}
            onClick={() => setTab("my")}
          >
            📚 My Enrolled Courses ({myCourses.length})
          </button>
          <button
            id="tab-available-courses"
            className={`tt-chip ${tab === "available" ? "active" : ""}`}
            onClick={() => setTab("available")}
          >
            ✨ Browse & Enroll ({availableCourses.length})
          </button>
        </div>

        <input
          id="course-search-input"
          className="search"
          placeholder="Search courses or teachers…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "240px", padding: "0.5rem 0.9rem" }}
        />
      </div>

      {feedback && (
        <div
          className={feedback.type === "success" ? "panel" : "error"}
          style={
            feedback.type === "success"
              ? {
                  background: "rgba(34, 197, 94, 0.15)",
                  border: "1px solid rgba(34, 197, 94, 0.4)",
                  color: "#86efac",
                  padding: "0.8rem 1.2rem",
                  borderRadius: "14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }
              : { margin: "0.5rem 0 1rem" }
          }
        >
          <span>{feedback.message}</span>
          <button
            className="btn-ghost"
            style={{ padding: "0.2rem 0.6rem", fontSize: "0.85rem" }}
            onClick={() => setFeedback(null)}
          >
            ✕
          </button>
        </div>
      )}

      {tab === "my" ? (
        filteredMy.length === 0 ? (
          <div className="glass panel empty">
            <div className="big">📚</div>
            <h2>{myCourses.length === 0 ? "No courses enrolled yet" : "No matching courses found"}</h2>
            <p className="muted">
              {myCourses.length === 0
                ? "You haven't enrolled in any courses yet. Browse available courses to start learning!"
                : "Try a different search query."}
            </p>
            {myCourses.length === 0 && (
              <button
                id="browse-courses-cta"
                className="btn-primary"
                style={{ marginTop: "1rem", alignSelf: "center" }}
                onClick={() => setTab("available")}
              >
                Browse Available Courses
              </button>
            )}
          </div>
        ) : (
          <div className="course-grid">
            {filteredMy.map((c, i) => (
              <article
                key={c.enrollment_id || c.course_id}
                id={`my-course-${c.course_id}`}
                className="glass panel course-card"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="pill course-code">{c.course_code}</span>
                  <span className="pill" style={{ color: "var(--green)", borderColor: "rgba(34,197,94,0.4)" }}>
                    ✓ Enrolled
                  </span>
                </div>
                <h2>{c.course_name}</h2>
                <p className="muted">{c.description || "No description provided."}</p>
                <div className="course-meta">
                  <span>⏱ Duration</span>
                  <b>{c.duration || "—"}</b>
                </div>
                <div className="course-meta">
                  <span>👨‍🏫 Instructor</span>
                  <b>{c.teacher_name || "Unassigned"}</b>
                </div>
                {c.enrolled_at && (
                  <div className="course-meta" style={{ fontSize: "0.8rem", opacity: 0.8 }}>
                    <span>Enrolled</span>
                    <span>{new Date(c.enrolled_at).toLocaleDateString()}</span>
                  </div>
                )}
              </article>
            ))}
          </div>
        )
      ) : (
        /* Available Courses tab */
        filteredAvailable.length === 0 ? (
          <div className="glass panel empty">
            <div className="big">🔍</div>
            <h2>No courses found</h2>
            <p className="muted">
              {availableCourses.length === 0
                ? "There are currently no courses published by the administration."
                : "No available courses matched your search."}
            </p>
          </div>
        ) : (
          <div className="course-grid">
            {filteredAvailable.map((c, i) => (
              <article
                key={c.id}
                id={`avail-course-${c.id}`}
                className="glass panel course-card"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="pill course-code">{c.course_code}</span>
                  {c.is_enrolled && (
                    <span className="pill" style={{ color: "var(--green)", borderColor: "rgba(34,197,94,0.4)" }}>
                      ✓ Enrolled
                    </span>
                  )}
                </div>
                <h2>{c.course_name}</h2>
                <p className="muted">{c.description || "No description provided."}</p>
                <div className="course-meta">
                  <span>⏱ Duration</span>
                  <b>{c.duration || "—"}</b>
                </div>
                <div className="course-meta">
                  <span>👨‍🏫 Instructor</span>
                  <b>{c.teacher_name || "Unassigned"}</b>
                </div>
                <div style={{ marginTop: "auto", paddingTop: "0.8rem" }}>
                  {c.is_enrolled ? (
                    <button
                      className="btn-ghost"
                      disabled
                      style={{
                        width: "100%",
                        justifyContent: "center",
                        cursor: "default",
                        color: "var(--green)",
                        borderColor: "rgba(34,197,94,0.3)",
                        background: "rgba(34,197,94,0.08)",
                      }}
                    >
                      ✓ Already Enrolled
                    </button>
                  ) : (
                    <button
                      id={`enroll-btn-${c.id}`}
                      className="btn-primary"
                      disabled={enrollingId === c.id}
                      style={{ width: "100%", padding: "0.65rem 1rem", marginTop: 0 }}
                      onClick={() => handleEnroll(c)}
                    >
                      {enrollingId === c.id ? "Enrolling…" : "+ Enroll in Course"}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )
      )}
    </>
  );
}
