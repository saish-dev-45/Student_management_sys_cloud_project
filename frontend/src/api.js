// Thin client for the FastAPI backend (see backend/app/routes/auth.py)
async function request(url, options = {}) {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* no body */
  }
  if (!res.ok) {
    const err = new Error(data?.detail || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const login = (username, password) =>
  request("/admin/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

export const getDashboard = () => request("/admin/dashboard");
export const logout = () => request("/admin/logout", { method: "POST" });
export const getApiRoot = () => request("/api-root");

// Teacher auth (backend/app/routes/teacher_auth.py)
export const teacherLogin = (username, password) =>
  request("/teacher/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
export const getTeacherDashboard = () => request("/teacher/dashboard");
export const teacherLogout = () => request("/teacher/logout", { method: "POST" });

// Student auth (backend/app/routes/student_auth.py)
export const studentLogin = (username, password) =>
  request("/student/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
export const getStudentDashboard = () => request("/student/dashboard");
export const studentLogout = () => request("/student/logout", { method: "POST" });

// Student courses & enrollment (backend/app/routes/student_courses.py)
export const studentCoursesApi = {
  available: () => request("/student/courses/available"),
  myCourses: () => request("/student/courses/my-courses"),
  enroll: (courseId) =>
    request(`/student/courses/${courseId}/enroll`, { method: "POST" }),
};

// Courses assigned to the logged-in teacher (backend/app/routes/teacher_courses.py)
export const teacherCoursesApi = {
  list: () => request("/teacher/courses/"),
  get: (id) => request(`/teacher/courses/${id}`),
};

// Lectures scheduled for the logged-in teacher (backend/app/routes/teacher_timetable.py)
export const teacherTimetableApi = {
  list: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== "" && v != null)
    ).toString();
    return request(`/teacher/timetable/${qs ? `?${qs}` : ""}`);
  },
};

// Admin timetable (backend/app/routes/timetable.py)
export const timetableApi = {
  list: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== "" && v != null)
    ).toString();
    return request(`/admin/timetable/${qs ? `?${qs}` : ""}`);
  },
  create: (body) =>
    request("/admin/timetable/", { method: "POST", body: JSON.stringify(body) }),
  update: (id, body) =>
    request(`/admin/timetable/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  remove: (id) => request(`/admin/timetable/${id}`, { method: "DELETE" }),
};

// CRUD for /admin/students and /admin/teachers (see backend/app/routes)
export const resourceApi = (name) => ({
  list: () => request(`/admin/${name}/`),
  create: (body) =>
    request(`/admin/${name}/`, { method: "POST", body: JSON.stringify(body) }),
  update: (id, body) =>
    request(`/admin/${name}/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  remove: (id) => request(`/admin/${name}/${id}`, { method: "DELETE" }),
});

export const studentsApi = resourceApi("students");
export const teachersApi = resourceApi("teachers");

// Courses use PATCH for updates (backend/app/routes/courses.py)
export const coursesApi = {
  ...resourceApi("courses"),
  update: (id, body) =>
    request(`/admin/courses/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
};

// Login accounts + matching profile (backend/app/routes/accounts.py)
export const accountsApi = {
  list: () => request("/admin/accounts/"),
  create: (body) =>
    request("/admin/accounts/", { method: "POST", body: JSON.stringify(body) }),
};

// Admin subjects CRUD (backend/app/routes/admin_subjects.py)
export const subjectsApi = {
  list: () => request("/admin/subjects/"),
  get: (id) => request(`/admin/subjects/${id}`),
  create: (body) =>
    request("/admin/subjects/", { method: "POST", body: JSON.stringify(body) }),
  update: (id, body) =>
    request(`/admin/subjects/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  remove: (id) => request(`/admin/subjects/${id}`, { method: "DELETE" }),
};

// Admin course subjects mapping (backend/app/routes/admin_course_subjects.py)
export const courseSubjectsApi = {
  list: (courseId) => request(`/admin/courses/${courseId}/subjects`),
  assign: (courseId, subjectId) =>
    request(`/admin/courses/${courseId}/subjects/${subjectId}`, { method: "POST" }),
  remove: (courseId, subjectId) =>
    request(`/admin/courses/${courseId}/subjects/${subjectId}`, { method: "DELETE" }),
};

// Student programme timetable (backend/app/routes/student_timetable.py)
export const studentProgrammeTimetableApi = {
  programmes: () => request("/student/timetable/programmes"),
  get: (courseId) => request(`/student/timetable/${courseId}`),
};

// Admin overview statistics & live database metrics (backend/app/routes/admin_stats.py)
export const adminStatsApi = {
  get: () => request("/admin/stats/"),
};

// Student Leaves (backend/app/routes/leaves.py)
export const studentLeavesApi = {
  list: () => request("/student/leaves/"),
  apply: (body) =>
    request("/student/leaves/", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

// Admin Leaves (backend/app/routes/leaves.py)
export const adminLeavesApi = {
  list: (status) => {
    const qs = status && status !== "All" ? `?status=${encodeURIComponent(status)}` : "";
    return request(`/admin/leaves/${qs}`);
  },
  decide: (id, body) =>
    request(`/admin/leaves/${id}/decision`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
};


// Teacher Leaves (backend/app/routes/teacher_leaves.py)
export const teacherLeavesApi = {
  list: () => request("/teacher/leaves/"),
  apply: (body) =>
    request("/teacher/leaves/", { method: "POST", body: JSON.stringify(body) }),
};

// Admin Teacher Leaves (backend/app/routes/teacher_leaves.py)
export const adminTeacherLeavesApi = {
  list: (status) => {
    const qs = status && status !== "All" ? `?status=${encodeURIComponent(status)}` : "";
    return request(`/admin/teacher-leaves/${qs}`);
  },
  decide: (id, body) =>
    request(`/admin/teacher-leaves/${id}/decision`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
};

// Student profile update & password change
export const studentProfileApi = {
  update: (body) =>
    request("/student/profile", { method: "PATCH", body: JSON.stringify(body) }),
  changePassword: (body) =>
    request("/student/change-password", { method: "POST", body: JSON.stringify(body) }),
};

// Teacher profile update & password change
export const teacherProfileApi = {
  update: (body) =>
    request("/teacher/profile", { method: "PATCH", body: JSON.stringify(body) }),
  changePassword: (body) =>
    request("/teacher/change-password", { method: "POST", body: JSON.stringify(body) }),
};
// Admin change password
export const adminProfileApi = {
  changePassword: (body) =>
    request("/admin/change-password", { method: "POST", body: JSON.stringify(body) }),
};