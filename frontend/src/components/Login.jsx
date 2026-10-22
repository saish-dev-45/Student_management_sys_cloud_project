import { useState } from "react";
import { login, teacherLogin, studentLogin } from "../api.js";

export default function Login({ onSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      // Automatically detect the role based on backend authentication:
      // Try admin -> teacher -> student
      let role = "admin";
      try {
        await login(username, password);
      } catch (err) {
        if (err.status !== 401) throw err;
        role = "teacher";
        try {
          await teacherLogin(username, password);
        } catch (err2) {
          if (err2.status !== 401) throw err2;
          role = "student";
          try {
            await studentLogin(username, password);
          } catch (err3) {
            if (err3.status === 401) throw new Error("Invalid username or password");
            throw err3;
          }
        }
      }
      await onSuccess(role);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="login-page">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />
      <form className="glass login-card" onSubmit={submit}>
        <div className="logo">🎓</div>
        <h1>Welcome back</h1>
        <p className="muted">Sign in to the Student Management portal</p>

        <label htmlFor="username">Username</label>
        <input
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter your username"
          autoComplete="username"
          required
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />

        {error && <div className="error" role="alert">{error}</div>}

        <button id="login-btn" className="btn-primary" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}


