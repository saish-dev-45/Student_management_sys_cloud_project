# Student Management System

A full-stack Student Management System built with **FastAPI**, **SQLAlchemy**, **PostgreSQL**, **React**, and **Vite**. The application provides separate portals for administrators, teachers, and students to manage academic records, courses, timetables, and leave requests.

> **Project status:** The application has working modules for the core academic and leave-management workflows. Dockerization, automated tests, and cloud CI/CD deployment are planned next. Exact behavior depends on the code currently in the repository.

## Contents

- [Overview](#overview)
- [Features](#features)
- [Technology stack](#technology-stack)
- [Application architecture](#application-architecture)
- [Project structure](#project-structure)
- [Database overview](#database-overview)
- [Roles and permissions](#roles-and-permissions)
- [Getting started](#getting-started)
- [Environment configuration](#environment-configuration)
- [Running the backend](#running-the-backend)
- [Running the frontend](#running-the-frontend)
- [API documentation](#api-documentation)
- [Typical workflows](#typical-workflows)
- [Security considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

## Overview

The Student Management System centralizes common academic administration tasks in one web application. Users sign in through role-specific flows and work with the functionality available to their role.

The three primary roles are:

- **Admin:** Manages accounts, student and teacher records, courses/programmes, subjects, timetable entries, and student/teacher leave requests. The admin dashboard also includes summary statistics.
- **Teacher:** Accesses assigned courses and timetable information and manages teacher leave requests.
- **Student:** Views enrolled courses and their timetable and submits and tracks leave requests.

The backend exposes REST-style HTTP endpoints through FastAPI. SQLAlchemy models represent database entities stored in PostgreSQL. The React frontend communicates with the backend through a shared API module.

## Features

### Administration

- Admin session-based login.
- Account management.
- Student record management.
- Teacher record management.
- Course/programme management.
- Subject management.
- Mapping subjects to courses/programmes.
- Timetable management.
- Student leave request review and decisions.
- Teacher leave request review.
- Dashboard summary statistics.

### Teacher portal

- Teacher authentication.
- View courses associated with the teacher.
- View the teacher's timetable.
- Submit and track teacher leave requests.

### Student portal

- Student authentication.
- Browse and view courses/programmes.
- Enroll in courses, where supported by the configured workflow.
- View enrolled courses.
- View programme timetable information.
- Apply for leave and track request status.

### Leave management

The application includes student and teacher leave-management modules. The student leave workflow is designed to let students submit requests and let administrators review them. Supported decisions in the student leave workflow include:

- `Pending`
- `Approved`
- `Rejected`
- `On Hold`

Refer to the current route implementation for the exact endpoint paths and validation rules.

## Technology stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React | Component-based user interface |
| Frontend tooling | Vite | Development server and production build tooling |
| Backend | FastAPI | HTTP API and application routing |
| ORM | SQLAlchemy | Database models and queries |
| Database | PostgreSQL | Persistent relational storage |
| Authentication/session | Starlette session middleware | Session-cookie handling for portal authentication |
| API documentation | OpenAPI / Swagger UI through FastAPI | Interactive API exploration during development |
| Version control | Git and GitHub | Source control and collaboration |

Docker, Docker Compose, GitHub Actions, and a cloud hosting provider are intended for the deployment phase and should be documented as configured only after they have actually been added and tested.

## Application architecture

```text
Browser
  |
  v
React + Vite frontend
  |
  | HTTP requests / session cookies
  v
FastAPI backend
  |
  | SQLAlchemy
  v
PostgreSQL database
```

The frontend contains role-specific pages and shared components. The backend contains route modules for each feature and SQLAlchemy models for persistent entities.

### Session handling

The backend uses session-cookie middleware. A production deployment must use a strong secret supplied through environment configuration, HTTPS, and cookie settings appropriate to the deployment environment. Do not deploy with a development fallback secret.

## Project structure

The following is the expected high-level structure based on the project layout. Names may vary slightly in the current working tree.

```text
student-management-system/
├── backend/
│   └── app/
│       ├── main.py
│       ├── database.py
│       ├── config.py
│       ├── models/
│       │   ├── users.py
│       │   ├── student.py
│       │   ├── teacher.py
│       │   ├── course.py
│       │   ├── subject.py
│       │   ├── course_subject.py
│       │   ├── enrollment.py
│       │   ├── timetable.py
│       │   ├── leave_request.py
│       │   └── teacher_leave_request.py
│       └── routes/
│           ├── auth and account routes
│           ├── student routes
│           ├── teacher routes
│           ├── course and subject routes
│           ├── timetable routes
│           ├── leave-management routes
│           └── dashboard routes
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js
│   │   ├── shared components and pages
│   │   ├── admin/
│   │   ├── teacher/
│   │   └── student/
│   ├── package.json
│   └── vite.config.js
├── .gitignore
└── README.md
```

Use the actual file tree in your repository as the source of truth. Do not create placeholder route files just to match this illustrative structure.

## Database overview

The application uses PostgreSQL and SQLAlchemy. The current schema includes these principal entities:

| Table / entity | Purpose |
|---|---|
| `users` | Login accounts and role information |
| `students` | Student profile and academic identifiers |
| `teachers` | Teacher profile and employment identifiers |
| `courses` | Courses or degree programmes |
| `subjects` | Subject catalogue |
| `course_subjects` | Junction table associating courses/programmes with subjects |
| `enrollments` or `course_enrollments` | Student-to-course enrollment records; confirm the exact table name in the current model |
| `timetables` | Scheduled periods, days, teachers, rooms, and class/programme references |
| `leave_requests` | Student leave applications and their decisions |
| `teacher_leave_requests` | Teacher leave applications |

### Data relationships (conceptual)

- A user account may be linked to a student or teacher profile.
- Students can enroll in courses/programmes through an enrollment table.
- Courses/programmes and subjects have a many-to-many relationship through `course_subjects`.
- Timetable records refer to a school standard or a college programme, depending on the timetable entry.
- Leave requests belong to the relevant student or teacher profile.

The exact foreign keys, constraints, nullability, and table names should be verified against the current SQLAlchemy models and deployed database schema before production migration.

### Schema changes

For local development, the application may create missing tables at startup using SQLAlchemy metadata. `Base.metadata.create_all()` creates tables that do not exist; it does **not** automatically migrate existing tables when columns or constraints change. For production, use a migration tool such as Alembic, review migrations carefully, and back up the database before applying schema changes.

## Roles and permissions

The application has three role-specific areas:

| Role | Typical capabilities |
|---|---|
| Admin | Manage accounts, academic records, subjects, timetables, dashboard data, and leave decisions |
| Teacher | View assigned courses and timetable; manage personal leave requests |
| Student | View enrolled courses and timetable; submit and track personal leave requests |

Every protected backend endpoint must enforce authorization server-side. Hiding a page or button in the frontend is not sufficient access control. Student endpoints should scope data to the authenticated student; admin-only endpoints should use the project's central admin authentication/authorization dependency.

## Getting started

### Prerequisites

Install the following tools:

- Python version compatible with the backend dependencies.
- Node.js and npm compatible with the frontend dependencies.
- PostgreSQL.
- Git.

Optional for the later deployment phase:

- Docker Desktop or Docker Engine.
- Docker Compose.
- A GitHub account and repository.

### 1. Clone the repository

After pushing this project to GitHub, clone it with:

```bash
git clone https://github.com/<YOUR_USERNAME>/<YOUR_REPOSITORY>.git
cd <YOUR_REPOSITORY>
```

Replace the placeholders with the real repository owner and name.

### 2. Create a PostgreSQL database

Create a local PostgreSQL database for the application. For example, the database might be named:

```text
student_management_sys
```

Use your own database username and password. Do not commit those credentials to Git.

### 3. Configure environment variables

Create a local `.env` file in the location read by the backend configuration. The example below is illustrative; align the names with the actual variables read by `database.py`, `config.py`, and `main.py`.

```dotenv
DATABASE_URL=postgresql+psycopg://<DB_USER>:<DB_PASSWORD>@localhost:5432/student_management_sys
SESSION_SECRET=<GENERATE_A_LONG_RANDOM_SECRET>
```

If the current backend expects separate PostgreSQL variables or uses a different environment-variable name, keep the code's actual naming convention. Do not paste real credentials into this README or into `.env.example`.

Generate a strong secret locally, for example with Python:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Keep `.env` ignored by Git. A committed `.env.example` may contain placeholder values only.

### 4. Install backend dependencies

From the backend directory, activate a virtual environment and install the project's dependencies.

**Windows PowerShell:**

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

**macOS / Linux:**

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

If `requirements.txt` is stored somewhere else in the repository, run the command from its actual location.

### 5. Start the backend

The current backend uses imports such as `from database import ...`, so the application may need to be started with `backend/app` as the working directory and on the Python import path.

From the repository root, one compatible development command is:

```bash
cd backend/app
python -m uvicorn main:app --reload
```

If your installed dependencies or environment require a different import path, use the command that matches your actual project setup. Do not run a second application instance simply to work around an import error.

When the server starts, open:

- API root or configured health endpoint, if implemented.
- Swagger UI: `http://127.0.0.1:8000/docs`
- OpenAPI JSON: `http://127.0.0.1:8000/openapi.json`

The Swagger endpoints are normally provided by FastAPI unless disabled or reconfigured.

### 6. Install frontend dependencies

Open a second terminal:

```bash
cd frontend
npm install
```

Start the Vite development server:

```bash
npm run dev
```

Vite prints the local frontend URL in the terminal, commonly `http://localhost:5173`. Use the URL shown by your terminal.

### 7. Configure the frontend API URL

Check `frontend/src/api.js` and the Vite environment configuration to see how the frontend selects the backend URL. Configure it to point to the locally running FastAPI server.

For Vite, client-side environment variables commonly use a `VITE_` prefix. Values exposed to the browser must never contain database credentials, session secrets, or other server-side secrets.

## Environment configuration

Keep secrets outside source control and configure them separately for local development, testing, and production.

| Setting | Purpose | Example / guidance |
|---|---|---|
| Database URL | PostgreSQL connection string | Use a local URL for development and the cloud provider's URL in production |
| Session secret | Signs or protects session data | Generate a unique, high-entropy value for each environment |
| Frontend API base URL | Tells the frontend where the backend API is located | Local URL for development; public HTTPS API URL in production |
| Cookie settings | Control session-cookie security | Enable secure cookies in HTTPS production and configure SameSite/CORS deliberately |

This table describes common settings, not a guarantee that every variable is currently implemented. Check the source code for the exact variable names.

## API documentation

FastAPI generates interactive API documentation from registered routes. While the backend is running locally, visit:

```text
http://127.0.0.1:8000/docs
```

Use Swagger UI to inspect endpoint paths, methods, request schemas, and responses. Authenticate using the application's login flow before testing protected endpoints, because session-based authentication depends on the session cookie being present.

### Main API areas

Exact paths are defined by the route modules in the repository. The application includes endpoints for:

- Authentication and account management.
- Student and teacher records.
- Courses/programmes and subjects.
- Course-subject assignments.
- Student enrollment and course access.
- Timetable management and timetable views.
- Student leave requests.
- Teacher leave requests.
- Admin dashboard statistics.

Avoid documenting endpoint URLs as fixed until they have been checked against the actual routers and `app.include_router(...)` calls.

## Typical workflows

### Admin workflow

1. Sign in through the admin portal.
2. Create or manage student and teacher records and accounts.
3. Create courses/programmes and subjects.
4. Associate subjects with courses/programmes.
5. Create and maintain timetable entries.
6. Review student and teacher leave requests.
7. Approve, reject, or hold requests where supported.
8. Review dashboard statistics.

### Student workflow

1. Sign in with a student account.
2. Browse available courses/programmes.
3. Enroll in a programme if enrollment is enabled for the account.
4. View enrolled courses and the relevant timetable.
5. Submit a leave request with dates and a reason.
6. Check the request's status and any admin remarks.

### Teacher workflow

1. Sign in through the teacher portal.
2. View assigned courses and timetable entries.
3. Submit a teacher leave request.
4. Track the status of leave requests.

## Security considerations

This project is intended for development and learning until its production security configuration has been reviewed.

Before deploying publicly:

- **Do not commit secrets.** Keep `.env`, database credentials, and generated secrets out of Git.
- **Replace development session secrets.** The fallback value `dev-secret-change-me` must not be used in production. Configure a strong `SESSION_SECRET` or the exact equivalent used by the code, and fail startup in production if it is missing.
- **Hash passwords.** If the current implementation stores or compares plaintext passwords, migrate to a well-established password-hashing library such as Argon2id or bcrypt before production.
- **Use HTTPS.** Configure secure session cookies when deployed behind HTTPS.
- **Review CORS and cookie settings.** Configure allowed frontend origins and credentials explicitly; avoid permissive wildcard settings with credentialed requests.
- **Enforce authorization on the server.** Check roles and ownership on every protected route.
- **Validate inputs.** Validate dates, identifiers, statuses, and other user-controlled fields.
- **Protect database access.** Use a dedicated database user with least-privilege permissions and a managed secret store when available.
- **Use migrations.** Apply schema changes through reviewed migration scripts, not manual production edits or startup table creation alone.
- **Back up production data.** Establish a backup and restore procedure before real users rely on the application.
- **Add tests and logging.** Avoid logging passwords, session secrets, or sensitive personal data.

## Troubleshooting

### `ModuleNotFoundError` for `database`, `models`, or `routes`

The backend uses top-level imports. Run Uvicorn from the expected application directory or configure the Python import path to match the current structure. Avoid arbitrarily changing every import without first standardizing the launch method.

### Database connection fails

- Confirm PostgreSQL is running.
- Confirm the database exists.
- Verify the configured host, port, database name, username, and password.
- Check that the required PostgreSQL driver is installed.
- Confirm that the backend reads the expected environment file and variable names.

### Tables or columns are missing

- Confirm all models are imported before any `Base.metadata.create_all(...)` call.
- Remember that `create_all()` does not update existing tables.
- Use a reviewed migration for new columns, constraints, or altered relationships.

### Frontend cannot reach the API

- Confirm FastAPI is running and the API URL is correct.
- Inspect the browser console and network panel.
- Check CORS configuration.
- For session-based authentication, verify that the frontend sends credentials where required and that cookie settings match the frontend/backend origins.

### Login works locally but not in production

Check the session secret, HTTPS and secure-cookie settings, allowed origins, credentialed requests, and proxy configuration. Never solve this by disabling authentication or using a known default secret.

## Roadmap

Potential improvements and deployment work include:

- [ ] Add automated backend tests and frontend tests.
- [ ] Add Alembic migrations for schema versioning.
- [ ] Add consistent request/response schemas and API error handling.
- [ ] Review password hashing, session configuration, authorization, and CORS.
- [ ] Add pagination and filtering to large administrative lists.
- [ ] Add notifications for leave decisions and other important events.
- [ ] Consider attendance, examinations/grades, and fee management if required.
- [ ] Add backend and frontend Dockerfiles.
- [ ] Add Docker Compose for local multi-service development.
- [ ] Set up GitHub Actions for testing and image builds.
- [ ] Deploy the application and PostgreSQL to a cloud provider.
- [ ] Add production monitoring, backups, and health checks.

Items should be marked complete only after they have been implemented and tested in the repository.

## Contributing

1. Create a branch for your change.
2. Make a focused change and test it locally.
3. Keep secrets and local environment files out of commits.
4. Review `git diff` and `git status` before committing.
5. Open a pull request describing the change and its testing.

Example:

```bash
git checkout -b feature/your-feature
git status
git diff
git add <specific-files>
git commit -m "Describe the change"
git push -u origin feature/your-feature
```

## License

No license has been specified yet. Add a `LICENSE` file before distributing or accepting external contributions. If the repository is private or academic, confirm the intended reuse terms before selecting a license.
#   S t u d e n t _ m a n a g e m e n t _ s y s _ c l o u d _ p r o j e c t  
 