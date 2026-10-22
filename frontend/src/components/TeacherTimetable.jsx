import { useEffect, useState } from "react";
import { teacherTimetableApi } from "../api.js";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export default function TeacherTimetable({ onUnauthorized }) {
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [day, setDay] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    teacherTimetableApi
      .list(day === "All" ? {} : { day_of_week: day })
      .then((d) => {
        setEntries(d.timetable || []);
        setTotal(d.total_periods || 0);
      })
      .catch((e) => {
        if (e.status === 401) onUnauthorized?.();
        else setError(e.message);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day]);

  const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const visibleDays = day === "All" ? DAYS : [day];

  return (
    <>
      <div className="tt-filters">
        {["All", ...DAYS].map((d) => (
          <button
            key={d}
            id={`tt-filter-${d.toLowerCase()}`}
            className={`tt-chip ${day === d ? "active" : ""} ${d === today ? "today" : ""}`}
            onClick={() => setDay(d)}
          >
            {d === "All" ? "Full week" : d}
          </button>
        ))}
        <span className="muted tt-total">
          {total} period{total === 1 ? "" : "s"}
        </span>
      </div>

      {loading ? (
        <div className="glass panel empty"><div className="spinner" /></div>
      ) : error ? (
        <div className="glass panel empty">
          <div className="big">⚠️</div>
          <h2>Couldn't load timetable</h2>
          <p className="muted">{error}</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="glass panel empty">
          <div className="big">🗓️</div>
          <h2>No scheduled lectures</h2>
          <p className="muted">Lectures assigned to you by an admin will appear here.</p>
        </div>
      ) : (
        <div className="tt-days">
          {visibleDays.map((d) => {
            const list = entries.filter((e) => e.day_of_week === d);
            if (list.length === 0) return null;
            return (
              <section key={d} id={`tt-day-${d.toLowerCase()}`} className="glass panel tt-day">
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
                        <span className="muted">
                          Period {e.period_number}
                          {e.course_code ? ` · ${e.course_code}` : e.standard ? ` · Std ${e.standard}` : ""}
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
