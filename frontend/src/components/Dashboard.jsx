import { useCallback, useEffect, useState } from "react";
import { getApiRoot, adminStatsApi } from "../api.js";
import ManageRecords from "./ManageRecords.jsx";
import Accounts from "./Accounts.jsx";
import Timetable from "./Timetable.jsx";
import Subjects from "./Subjects.jsx";
import AdminLeaves from "./AdminLeaves.jsx";
import Settings from "./Settings.jsx";

const NAV = [
  { id: "overview", icon: "📊", label: "Overview" },
  { id: "students", icon: "🧑‍🎓", label: "Students" },
  { id: "teachers", icon: "👩‍🏫", label: "Teachers" },
  { id: "courses", icon: "📚", label: "Courses" },
  { id: "subjects", icon: "📖", label: "Subjects" },
  { id: "accounts", icon: "🔑", label: "Accounts" },
  { id: "timetable", icon: "🗓️", label: "Timetable" },
  { id: "leave", icon: "🏖️", label: "Leave" },
  { id: "settings", icon: "⚙️", label: "Settings" },
];

function useCountUp(target) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf;
    const start = performance.now();
    const tick = (t) => {
      const p = Math.min((t - start) / 900, 1);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return v;
}

function StatCard({ icon, label, value, suffix = "", tone, onClick }) {
  const n = useCountUp(value || 0);
  return (
    <div
      className={`glass stat tone-${tone}`}
      style={{ cursor: onClick ? "pointer" : "default" }}
      onClick={onClick}
      title={onClick ? `Click to view ${label}` : undefined}
    >
      <div className="stat-icon">{icon}</div>
      <div>
        <div className="stat-value">
          {n}
          {suffix}
        </div>
        <div className="muted">{label}</div>
      </div>
    </div>
  );
}

export default function Dashboard({ message, onLogout }) {
  const [tab, setTab] = useState("overview");
  const [api, setApi] = useState("checking");
  const [sidebar, setSidebar] = useState(false);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState("");

  useEffect(() => {
    getApiRoot().then(() => setApi("online")).catch(() => setApi("offline"));
  }, []);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError("");
    try {
      const data = await adminStatsApi.get();
      setStats(data);
    } catch (err) {
      if (err.status === 401) onLogout?.();
      else setStatsError(err.message || "Failed to load overview data");
    } finally {
      setStatsLoading(false);
    }
  }, [onLogout]);

  useEffect(() => {
    if (tab === "overview") {
      loadStats();
    }
  }, [tab, loadStats]);

  const username = message.replace("Welcome, ", "").replace("!", "");
  const courseDist = stats?.course_distribution || [];
  const maxEnrollment = Math.max(1, ...courseDist.map((c) => c.count));

  const formatTimeAgo = (iso) => {
    if (!iso) return "recently";
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "recently";
    }
  };

  return (
    <div className="shell">
      <aside className={`glass sidebar ${sidebar ? "open" : ""}`}>
        <div className="brand">
          <span>🎓</span> EduDesk
        </div>
        <nav>
          {NAV.map((n) => (
            <button
              key={n.id}
              id={`nav-${n.id}`}
              className={`nav-item ${tab === n.id ? "active" : ""}`}
              onClick={() => {
                setTab(n.id);
                setSidebar(false);
              }}
            >
              <span>{n.icon}</span> {n.label}
            </button>
          ))}
        </nav>
        <button id="logout-btn" className="btn-ghost" onClick={onLogout}>
          ⎋ Log out
        </button>
      </aside>

      <section className="content">
        <header className="topbar">
          <button
            className="burger"
            onClick={() => setSidebar(!sidebar)}
            aria-label="Toggle menu"
          >
            ☰
          </button>
          <div>
            <h1>{NAV.find((n) => n.id === tab).label}</h1>
            <p className="muted">{message}</p>
          </div>
          <div className="topbar-right">
            <span className={`pill api-${api}`}>
              <i /> API {api}
            </span>
            <div className="avatar" title={username}>
              {username.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {tab === "overview" && (
          <>
            {statsError && (
              <div className="error">
                Failed to load overview metrics: {statsError}
              </div>
            )}

            <div className="grid-stats">
              <StatCard
                icon="🧑‍🎓"
                label="Total Students"
                value={stats?.counts?.students ?? 0}
                tone="violet"
                onClick={() => setTab("students")}
              />
              <StatCard
                icon="👩‍🏫"
                label="Faculty Teachers"
                value={stats?.counts?.teachers ?? 0}
                tone="cyan"
                onClick={() => setTab("teachers")}
              />
              <StatCard
                icon="📚"
                label="Degree Courses"
                value={stats?.counts?.courses ?? 0}
                tone="green"
                onClick={() => setTab("courses")}
              />
              <StatCard
                icon="📖"
                label="Course Subjects"
                value={stats?.counts?.subjects ?? 0}
                tone="pink"
                onClick={() => setTab("subjects")}
              />
              <StatCard
                icon="📝"
                label="Total Enrollments"
                value={stats?.counts?.enrollments ?? 0}
                tone="violet"
              />
              <StatCard
                icon="🗓️"
                label="Scheduled Classes"
                value={stats?.counts?.timetable_slots ?? 0}
                tone="cyan"
                onClick={() => setTab("timetable")}
              />
            </div>

            <div className="grid-main single">
              <div className="glass panel">
                <div className="panel-head">
                  <h2>Course Enrollment Distribution</h2>
                  <button
                    className="btn-secondary"
                    style={{ padding: "0.4rem 0.8rem", fontSize: "0.82rem" }}
                    onClick={loadStats}
                    disabled={statsLoading}
                  >
                    {statsLoading ? "Refreshing..." : "↻ Refresh"}
                  </button>
                </div>

                {courseDist.length === 0 ? (
                  <div className="chart-empty">
                    <span style={{ fontSize: "2rem" }}>📚</span>
                    <p>No courses registered yet.</p>
                    <button
                      className="btn-primary"
                      style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}
                      onClick={() => setTab("courses")}
                    >
                      + Add Course
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="chart">
                      {courseDist.map((c, i) => {
                        const pct = Math.max(
                          12,
                          Math.round((c.count / maxEnrollment) * 100)
                        );
                        return (
                          <div className="bar-wrap" key={c.course_id}>
                            <div
                              className="bar"
                              style={{
                                height: `${pct}%`,
                                animationDelay: `${i * 70}ms`,
                              }}
                              title={`${c.course_name} (${c.course_code}): ${c.count} students`}
                            >
                              <span>{c.count}</span>
                            </div>
                            <small
                              className="chart-course-title"
                              title={c.course_name}
                            >
                              {c.course_code || c.course_name}
                            </small>
                          </div>
                        );
                      })}
                    </div>
                    <p className="note">
                      Bar heights represent enrolled student counts across
                      programmes.
                    </p>
                  </>
                )}

                <div style={{ marginTop: "2rem" }}>
                  <h2>Recent Student Enrollments</h2>
                  {!stats?.recent_enrollments ||
                  stats.recent_enrollments.length === 0 ? (
                    <p className="muted">
                      No student enrollment records logged yet.
                    </p>
                  ) : (
                    <ul className="recent-list">
                      {stats.recent_enrollments.map((enr) => (
                        <li key={enr.id} className="recent-item">
                          <div className="recent-left">
                            <span style={{ fontSize: "1.3rem" }}>🧑‍🎓</span>
                            <div>
                              <div className="recent-title">
                                {enr.student_name}{" "}
                                <span
                                  className="muted"
                                  style={{ fontWeight: 400 }}
                                >
                                  ({enr.student_roll})
                                </span>
                              </div>
                              <div className="recent-sub">
                                Enrolled in {enr.course_name}
                              </div>
                            </div>
                          </div>
                          <span className="recent-badge">
                            {formatTimeAgo(enr.enrolled_at)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {(tab === "students" || tab === "teachers" || tab === "courses") && (
          <ManageRecords kind={tab} onUnauthorized={onLogout} />
        )}

        {tab === "accounts" && <Accounts onUnauthorized={onLogout} />}

        {tab === "subjects" && <Subjects onUnauthorized={onLogout} />}

        {tab === "timetable" && <Timetable onUnauthorized={onLogout} />}

        {tab === "leave" && <AdminLeaves onUnauthorized={onLogout} />}

        {tab === "settings" && (
          <Settings username={username} onUnauthorized={onLogout} />
        )}
      </section>
    </div>
  );
}
