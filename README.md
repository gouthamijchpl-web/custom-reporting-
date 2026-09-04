# Custom Reporting

A reporting workspace built as a Java / Spring Boot API and a TypeScript single page
application.

This is the **foundation phase**. It delivers authentication, the application shell, and the
Teams, Entities and Settings modules in full. Workspace, Data Upload and Reports are deliberately empty
placeholders â€” the routes, navigation, security and layout around them are finished, so
each can be built out later without restructuring anything.

---

## Technology

| Layer     | Technology                                                        |
| --------- | ----------------------------------------------------------------- |
| Backend   | Java 21, Spring Boot 3.5 (Web, Security, Data JPA, Validation)     |
| Database  | H2 file-backed for development, PostgreSQL for deployments         |
| Auth      | JWT access tokens + rotating opaque refresh tokens, BCrypt hashing |
| Frontend  | TypeScript, React 19, React Router, Vite                           |
| Styling   | Hand-written CSS with a design-token system (no UI framework)      |

No other backend language is used anywhere in the project. Node.js appears only as the
build toolchain for the TypeScript frontend; it serves no application code.

---

## Running it

Requires **JDK 21+** and **Node.js 20+**. Maven is not needed â€” the repository ships the
Maven wrapper.

### 1. Backend â€” <http://localhost:8080>

```bash
cd backend
./mvnw spring-boot:run          # Windows: mvnw.cmd spring-boot:run
```

Starts on the `dev` profile with a file-backed H2 database at `backend/data/`, so there is
nothing to install or migrate and **your accounts survive a restart**. Delete that folder
to start from a clean slate.

- API docs: <http://localhost:8080/swagger-ui.html>
- H2 console: <http://localhost:8080/h2-console> (JDBC URL `jdbc:h2:file:./data/customreporting`, user `sa`, no password)

The `dev` profile also sets `app.security.detailed-authentication-errors: true`, so a
failed sign-in says whether the **email** was unknown or the **password** was wrong. That
is a development aid only â€” it is off in every other profile, because otherwise the login
form becomes a way of discovering which addresses hold accounts. The application logs a
warning at startup whenever it is enabled.

### 2. Frontend â€” <http://localhost:5173>

```bash
cd frontend
npm install
npm run dev
```

The dev server proxies `/api` to the backend, so the browser sees a single origin and the
httpOnly refresh cookie behaves exactly as it does in production.

Open <http://localhost:5173>, choose **Sign Up**, create an account, then sign in.

### Checks

```bash
cd backend  && ./mvnw test      # auth, teams, entities and settings
cd frontend && npm run typecheck && npm run lint && npm run build
```

---

## Application flow

```
Login  â‡„  Sign Up
  â”‚
  â””â”€ authenticated â”€â–º Main layout
                        â”œâ”€ Workspace     (empty placeholder)
                        â”œâ”€ Data Upload   (empty placeholder)
                        â”œâ”€ Reports       (empty placeholder)
                        â””â”€ Settings      (account Â· teams Â· security)
```

The sidebar keeps Workspace, Data Upload and Reports at the top and pins Settings, the
profile block and Logout to the bottom. It is identical on every authenticated screen: a
full rail on desktop, an icon rail on tablet, and a slide-over drawer on mobile.

A header bar runs across the top of every authenticated screen with the **entity switcher**
pinned to its right corner:

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ LOGO     â”‚                     [ ACME  Entity â–¾ ] PNâ”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ Workspaceâ”‚                                          â”‚
â”‚ Data Upl.â”‚   Workspace                              â”‚
â”‚ Reports  â”‚   â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”   â”‚
â”‚          â”‚   â”‚        Nothing here yet          â”‚   â”‚
â”‚ Settings â”‚   â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜   â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

The switcher lists the businesses the account reports on, and lets the user search them,
switch between them, and add or edit one. The choice is stored server-side, so it survives
a reload and follows the user to another device.

---

## Project structure

```
backend/src/main/java/com/customreporting/
â”œâ”€â”€ auth/                    Registration, sign-in, sessions, password recovery
â”‚   â”œâ”€â”€ controller/          HTTP boundary only
â”‚   â”œâ”€â”€ service/             All authentication business logic
â”‚   â”œâ”€â”€ dto/                 Request and response records with validation constraints
â”‚   â”œâ”€â”€ model/               RefreshToken, PasswordResetToken
â”‚   â”œâ”€â”€ repository/          Spring Data repositories
â”œâ”€â”€ team/                    Team membership, roles and application access
â”‚   â”œâ”€â”€ service/             Permission rules and admin protections
â”‚   â”œâ”€â”€ dto/                 Request and response records
â”‚   â””â”€â”€ controller/          Admin-only REST resource at /api/v1/team/users
â”œâ”€â”€ entity/                  Businesses the account reports on, and the active selection
â”‚   â”œâ”€â”€ model/               ReportingEntity, EntitySelection
â”‚   â”œâ”€â”€ repository/          Owner-scoped queries
â”‚   â”œâ”€â”€ service/             Uniqueness, selection and deletion rules
â”‚   â”œâ”€â”€ dto/                 Request and response records
â”‚   â””â”€â”€ controller/          REST resource at /api/v1/entities
â”œâ”€â”€ settings/                Account profile and password change for the signed-in user
â”œâ”€â”€ user/                    User entity, Role, AccessStatus, repository
â”œâ”€â”€ security/                JWT, filter, principal, cookie handling, policy
â”œâ”€â”€ config/                  Typed configuration properties, CORS, JPA, OpenAPI
â”œâ”€â”€ exception/               Error codes, exception types, global handler
â”œâ”€â”€ common/                  Shared records, auditing, validation constraints
â””â”€â”€ modules/                 Reserved namespaces for the empty feature modules

frontend/src/
â”œâ”€â”€ api/                     HTTP client, typed endpoint modules, token store
â”œâ”€â”€ app/                     Root component, route table, navigation model
â”œâ”€â”€ components/ui/           Button, TextInput, PasswordInput, Select, Alert, Card, â€¦
â”œâ”€â”€ components/icons/        Inline SVG icon set
â”œâ”€â”€ context/                 Authentication, entity, theme and toast providers
â”œâ”€â”€ features/entities/       Entity switcher and the add/edit dialog
â”œâ”€â”€ features/team/           Teams roster, member dialog and row actions
â”œâ”€â”€ features/settings/       Account and Security sections
â”œâ”€â”€ hooks/                   useAuth, useEntities, useForm, useTheme, useToast
â”œâ”€â”€ layouts/                 AuthLayout, AppLayout, AppHeader, Sidebar
â”œâ”€â”€ pages/                   One component per route
â”œâ”€â”€ routes/                  Route paths and the guard components
â”œâ”€â”€ styles/                  Design tokens and global styles
â”œâ”€â”€ types/                   Shared interfaces mirroring the API contracts
â””â”€â”€ utils/                   Validation, formatting, class names
```

Controllers translate HTTP to service calls and nothing more; business rules live in the
service layer, and persistence stays behind repositories.

---

## API

Base path `/api/v1`. Every endpoint except the public ones below requires
`Authorization: Bearer <access token>`.

### Authentication

| Method | Path                    | Auth   | Purpose                                     |
| ------ | ----------------------- | ------ | ------------------------------------------- |
| POST   | `/auth/signup`          | Public | Register an account                         |
| POST   | `/auth/login`           | Public | Sign in; sets the refresh cookie            |
| POST   | `/auth/refresh`         | Cookie | Exchange the refresh cookie for a new token |
| POST   | `/auth/logout`          | Cookie | End the session and clear the cookie        |
| GET    | `/auth/me`              | Bearer | The signed-in account                       |
| POST   | `/auth/forgot-password` | Public | Create a new application password           |

### Teams

**Admin only.** `@PreAuthorize("hasRole('ADMIN')")` is declared on the controller class, so
every endpoint â€” present and future â€” refuses an ordinary user with `403`, whatever the
interface chooses to show them.

| Method | Path                          | Purpose                                    |
| ------ | ----------------------------- | ------------------------------------------ |
| GET    | `/team/users`                 | List members; `?search=&role=&status=`     |
| GET    | `/team/users/{id}`            | Read one member                            |
| POST   | `/team/users`                 | Add someone to the team                    |
| PUT    | `/team/users/{id}`            | Update name, role and access status        |
| PATCH  | `/team/users/{id}/status`     | Activate or deactivate                     |
| DELETE | `/team/users/{id}`            | Remove access, keeping the record          |

### Entities

Every operation is scoped to the signed-in account, so an identifier belonging to someone
else resolves to `404` rather than exposing that it exists.

| Method | Path                   | Purpose                                       |
| ------ | ---------------------- | --------------------------------------------- |
| GET    | `/entities`            | List the account's entities and the selection |
| POST   | `/entities`            | Create an entity                              |
| PUT    | `/entities/{id}`       | Update name, code, description, active flag   |
| DELETE | `/entities/{id}`       | Delete an entity                              |
| PUT    | `/entities/selection`  | Set the active entity                         |

### Settings

| Method | Path                    | Purpose                                    |
| ------ | ----------------------- | ------------------------------------------ |
| GET    | `/settings/account`     | Read the profile                           |
| PUT    | `/settings/account`     | Update name and email                      |
| PUT    | `/settings/password`    | Change the password                        |

### Feature modules (placeholders)

`GET /workspace`, `GET /uploads`, `GET /reports` return a `NOT_IMPLEMENTED` status
document. They exist to reserve the URL space; the frontend does not call them.

### Errors

Every failure returns the same shape, so the client handles them in one place:

```json
{
  "timestamp": "2026-08-21T06:42:13.456Z",
  "status": 409,
  "error": "Conflict",
  "code": "EMAIL_ALREADY_REGISTERED",
  "message": "An account with this email address already exists.",
  "path": "/api/v1/auth/signup",
  "fieldErrors": { "email": ["Enter a valid email address."] }
}
```

`code` is stable and safe to branch on; `message` is safe to show to the user;
`fieldErrors` is present only for validation failures.

---

## Teams and application access

Having an account is not the same as being allowed in. Four things are tracked separately,
and all four must line up before someone reaches the workspace:

| | Meaning |
| --- | --- |
| **Account exists** | A row in `users` |
| **Registered** | The person has set a password of their own |
| **Role** | `ADMIN` manages the team; `USER` cannot |
| **Access status** | `ACTIVE` in, `INACTIVE` withheld, `PENDING` not yet granted |

**Who becomes what**

- The **first account to register** becomes an active **Admin** â€” otherwise nobody could
  ever grant access to anyone, including themselves.
- Anyone **self-registering afterwards** is left **Pending**, and told so at sign-in. An
  account existing must not by itself confer access.
- Someone an **admin adds** is Pending until they sign up with that address, at which point
  the invitation is claimed: they set a password, keep the role the admin assigned, and
  become Active. One account, not two.

**When access is withdrawn**, the change is immediate rather than at token expiry: their
refresh tokens are revoked and their live access token stops working on its next request.
They are then told exactly why:

> Your access to this application is currently disabled. Please contact the administrator.

**Protections against locking everyone out** â€” enforced in the service layer, so they hold
however the API is called:

- You cannot deactivate or remove your own account.
- The last active administrator cannot be removed, deactivated, or demoted to User.
- An invitation cannot be marked Active before the person has registered.

**Removal is a soft delete.** The row survives with `deleted_at` set, so uploads and
reports attributed to that person stay attributable once the modules that create them
exist. Re-adding the same address restores the original record rather than creating a
second one.

---

## Security

- **Passwords** are stored only as BCrypt hashes (work factor 12). Plain text is never
  written or logged.
- **Access tokens** are short-lived (15 minutes) HS256 JWTs sent in the `Authorization`
  header and held only in memory by the browser, never in `localStorage`.
- **Refresh tokens** are opaque random values delivered in an httpOnly, SameSite cookie
  scoped to `/api/v1/auth`. Only their SHA-256 digest is stored. They rotate on every
  refresh, and replaying a rotated token revokes every session for that account.
- **Password changes** stamp the account so tokens issued earlier stop working
  immediately, rather than staying valid until they expire.
- **Brute force** is blunted by locking an account for 15 minutes after 5 failed attempts.
- **Account enumeration** is avoided: wrong password and unknown address return the same
  message, and password recovery answers identically either way.
- **Validation** is enforced server-side on every request. The browser repeats the rules
  for fast feedback, but the backend decides.
- **Protected routes** in the frontend are a usability guard only â€” the API rejects
  unauthenticated requests independently.

### Production configuration

Run with `SPRING_PROFILES_ACTIVE=prod` and supply:

| Variable                   | Purpose                                        |
| -------------------------- | ---------------------------------------------- |
| `APP_JWT_SECRET`           | HMAC signing key, **32+ characters**, required |
| `DATABASE_URL`             | PostgreSQL JDBC URL                            |
| `DATABASE_USERNAME`        | Database user                                  |
| `DATABASE_PASSWORD`        | Database password                              |
| `APP_CORS_ALLOWED_ORIGINS` | Frontend origin(s), comma separated            |

The `prod` profile switches the refresh cookie to `Secure` + `SameSite=Strict`, sets
Hibernate to `validate` (schema changes belong to a migration tool), and turns off the API
documentation endpoints.

Password recovery runs entirely inside the authentication UI and requires no mail or
external service. This direct flow is intended only for a controlled prototype;
production should add an internal recovery code or administrator approval.

---

## Notes for the next phase

- Workspace, Data Upload and Reports contain **no** business logic, data loading or
  widgets. Each is a page component wrapping a shared placeholder scaffold â€” replace the
  scaffold with real content and routing, navigation and layout stay untouched.
- The multipart size limits in `application.yml` are already set for the upload module.
- The active entity from the header switcher is what the Reports module will scope to.
- Application Preferences was removed at both layers; the theme now simply follows the
  operating system. The `user_preferences` table may still exist in a development database
  created earlier â€” it is unused and harmless, and disappears if you delete `backend/data/`.
- Loading, error, empty, disabled and confirmation states all have shared components
  (`LoadingState`, `Alert`, `EmptyState`, `Button`, `ConfirmDialog`) ready to use.

---

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `502 Bad Gateway` on `/api/...` | The backend is not running; the Vite proxy cannot reach port 8080 | Start the backend and wait for `Started CustomReportingApplication` |
| `401` on `/auth/refresh` at page load | Normal â€” you are simply not signed in yet | Nothing to fix |
| "No account exists for â€¦" | The email address does not match any account | Check the address, or sign up |
| "That account exists, but the password is incorrect" | The address is right, the password is not | Use **Forgot password?** to create a new application password |\r\n| `423` with "Too many failed sign-in attempts" | Five consecutive failures locked the account | Wait 15 minutes, or clear `failed_login_attempts` in the H2 console |
| Sign-in fails right after a backend restart | Only affects databases configured in-memory | The `dev` profile is file-backed; confirm `backend/data/` exists |

---

## In-application password recovery

Choose **Forgot password?** on the Login screen, enter the account email, a new password,
and its confirmation, then choose **Create**. The backend validates and hashes the new
password, revokes existing sessions and any legacy reset tokens, and returns the user to
Login. No Gmail, SMTP, email notification, OTP, or external reset service is used.

The endpoint limits repeated attempts per normalized email. Because knowledge of an email
address is the only recovery factor, this workflow is deliberately restricted to a
controlled internal prototype and should not be exposed to production users without an
additional in-application verification factor.

