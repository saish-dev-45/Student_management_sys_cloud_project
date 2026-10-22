import { useCallback, useEffect, useState } from "react";
import { studentProgrammeTimetableApi } from "../api.js";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const WEEKDAY_ORDER = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
};

export default function StudentTimetable({ onUnauthorized, onNavigateToCourses }) {
  const [programmes, setProgrammes] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [timetableData, setTimetableData] = useState(null);
  const [day, setDay] = useState("All");
  const [loading, setLoading] = useState(true);
  const [ttLoading, setTtLoading] = useState(false);
  const [error, setError] = useState("");

  const loadProgrammes = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await studentProgrammeTimetableApi.programmes();
      const list = res.programmes || [];
      setProgrammes(list);
      if (list.length > 0) {
        setSelectedCourseId(list[0].course_id);
      }
    } catch (e) {
      if (e.status === 401) onUnauthorized?.();
      else setError(e.message || "Failed to load enrolled programmes");
    } finally {
      setLoading(false);
    }
  }, [onUnauthorized]);

  useEffect(() => {
    loadProgrammes();
  }, [loadProgrammes]);

  const loadTimetable = useCallback(async (courseId) => {
    if (!courseId) return;
    setTtLoading(true);
    setError("");
    try {
      const res = await studentProgrammeTimetableApi.get(courseId);
      setTimetableData(res);
    } catch (e) {
      if (e.status === 401) onUnauthorized?.();
      else setError(e.message || "Failed to load timetable");
    } finally {
      setTtLoading(false);
    }
  }, [onUnauthorized]);

  useEffect(() => {
    if (selectedCourseId) {
      loadTimetable(selectedCourseId);
    }
  }, [selectedCourseId, loadTimetable]);

  const today = new Date().toLocaleDateString("en-US", { weekday: "long" });

  if (loading) {
    return (
      <div className="glass panel empty">
        <div className="spinner" />
      </div>
    );
  }

  if (programmes.length === 0) {
    return (
      <div className="glass panel empty">
        <div className="big">🗓️</div>
        <h2>No enrolled programmes</h2>
        <p className="muted">
          You need to be enrolled in a course or programme to view its lecture timetable.
        </p>
        {onNavigateToCourses && (
          <button
            className="btn-primary"
            style={{ marginTop: "1.2rem", alignSelf: "center" }}
            onClick={onNavigateToCourses}
          >
            Browse Available Courses
          </button>
        )}
      </div>
    );
  }

  const rawEntries = timetableData?.timetable || [];
  // Sort entries chronologically: Monday -> Friday, then by period_number
  const sortedEntries = [...rawEntries].sort((a, b) => {
    const dayDiff = (WEEKDAY_ORDER[a.day_of_week] || 6) - (WEEKDAY_ORDER[b.day_of_week] || 6);
    if (dayDiff !== 0) return dayDiff;
    return a.period_number - b.period_number;
  });

  const visibleDays = day === "All" ? DAYS : [day];

  return (
    <>
      {/* Programme Switcher */}
      <div className="glass panel" style={{ padding: "1rem 1.4rem", marginBottom: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.8rem" }}>
          <div>
            <span className="muted" style={{ fontSize: "0.85rem" }}>Select Programme / Course:</span>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.4rem" }}>
              {programmes.map((p) => (
                <button
                  key={p.course_id}
                  id={`programme-tab-${p.course_id}`}
                  className={`tt-chip ${selectedCourseId === p.course_id ? "active" : ""}`}
                  onClick={() => setSelectedCourseId(p.course_id)}
                >
                  🎓 {p.course_name} ({p.course_code})
                </button>
              ))}
            </div>
          </div>

          {timetableData && (
            <div style={{ textAlign: "right" }}>
              <span className="pill course-code">{timetableData.course_code}</span>
              <p className="muted" style={{ fontSize: "0.8rem", marginTop: "0.3rem" }}>
                {rawEntries.length} scheduled period{rawEntries.length === 1 ? "" : "s"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Day Filter Chips */}
      <div className="tt-filters">
        {["All", ...DAYS].map((d) => (
          <button
            key={d}
            id={`tt-filter-${d.toLowerCase()}`}
            className={`tt-chip ${day === d ? "active" : ""} ${d === today ? "today" : ""}`}
            onClick={() => setDay(d)}
          >
            {d === "All" ? "Full Week" : d}
          </button>
        ))}
      </div>

      {error && (
        <div className="error" role="alert" style={{ marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      {ttLoading ? (
        <div className="glass panel empty"><div className="spinner" /></div>
      ) : sortedEntries.length === 0 ? (
        <div className="glass panel empty">
          <div className="big">🗓️</div>
          <h2>No lectures scheduled</h2>
          <p className="muted">
            The timetable for {timetableData?.course_name || "this programme"} has not been published yet.
          </p>
        </div>
      ) : (
        <div className="tt-days">
          {visibleDays.map((d) => {
            const list = sortedEntries.filter((e) => e.day_of_week === d);
            if (list.length === 0) return null;
            return (
              <section key={d} id={`student-tt-day-${d.toLowerCase()}`} className="glass panel tt-day">
                <h2>
                  {d} {d === today && <span className="pill">Today</span>}
                </h2>
                <ul className="tt-list">
                  {list.map((e, i) => (
                    <li key={e.id} className="tt-item" style={{ animationDelay: `${i * 60}ms` }}>
                      <div className="tt-time">
                        <b>{e.start_time}</b>
                        <span>{e.end_time}</span>
                      </div>
                      <div className="tt-body">
                        <b>{e.subject}</b>
                        <span className="muted" style={{ fontSize: "0.85rem" }}>
                          Period {e.period_number} · 👨‍🏫 {e.teacher || "Instructor unassigned"}
                        </span>
                      </div>
                      <span className="pill">{e.room ? `Room ${e.room}` : "No room"}</span>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
