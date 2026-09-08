# Automatic deployment

The production branch is `main`. The repository is a monorepo with an independently
deployed Spring Boot backend and Vite frontend:

```text
git push origin main
  -> Render builds backend/
  -> Vercel builds frontend/
```

Render and Vercel native Git integrations are the deployment triggers. No GitHub Actions
workflow or manual deploy is required for an ordinary production update.

## Render: `custom-reporting-backend`

In **Settings -> Build & Deploy**, verify:

| Setting | Value |
| --- | --- |
| Repository | `gouthamijchpl-web/custom-reporting-` |
| Branch | `main` |
| Root Directory | `backend` |
| Runtime | Docker |
| Dockerfile Path | `./Dockerfile` (relative to `backend`) |
| Docker Build Context | `.` (relative to `backend`) |
| Auto-Deploy | On Commit |
| Health Check Path | `/api/v1/health` |

With `backend` configured as the root directory, Render automatically ignores commits
that do not affect that directory. If the existing service has no root directory, use an
included build-filter path of `backend/**` instead. Do not configure both unless the
current service requires it.

Set these Render environment variables. Mark secret values as secret and never commit
their values:

| Variable | Value/purpose |
| --- | --- |
| `SPRING_PROFILES_ACTIVE` | `prod` |
| `SPRING_DATASOURCE_URL` | Supabase Shared Pooler JDBC URL with `sslmode=require` |
| `SPRING_DATASOURCE_USERNAME` | Supabase Shared Pooler username |
| `SPRING_DATASOURCE_PASSWORD` | Supabase database password |
| `APP_JWT_SECRET` | Random production-only value, at least 32 characters |
| `APP_CREDENTIAL_ENCRYPTION_KEY` | Random production-only credential-encryption key |
| `APP_CORS_ALLOWED_ORIGINS` | `https://custom-reporting-frontend.vercel.app` |
| `DB_POOL_MAX_SIZE` | Optional Hikari pool size; defaults to `3` for Supabase session-pool limits |
| `DB_POOL_MIN_IDLE` | Optional idle connection floor; defaults to `0` |

Render supplies `PORT`; do not hardcode it. The production profile uses Hibernate
`validate`. Flyway runs first and baselines the database at version 1. Migration 1.1
creates any missing original application tables, then migration 2 creates
`uploaded_data_states` and `application_user_preferences`; no manual SQL editor step is required.
The small production connection pool also allows Render's old and new instances to overlap
during a rolling deploy without exhausting Supabase's shared session-pool client limit.

## Vercel: `custom-reporting-frontend`

In **Settings -> Build and Deployment**, verify:

| Setting | Value |
| --- | --- |
| Repository | `gouthamijchpl-web/custom-reporting-` |
| Production Branch | `main` |
| Framework Preset | Vite |
| Root Directory | `frontend` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Git deployments | Enabled |

Set this Production environment variable and redeploy once if its value changes:

```text
VITE_API_BASE_URL=https://custom-reporting-backend.onrender.com/api/v1
```

Do not add database usernames, passwords, JDBC URLs, JWT secrets, or other backend
credentials to Vercel. Variables beginning with `VITE_` are embedded in the public
browser bundle.

## Local development

Local settings remain separate from production:

```text
Frontend: http://localhost:5173 -> /api Vite proxy
Backend:  http://localhost:8080 -> Supabase PostgreSQL
```

In the backend terminal, set `SUPABASE_DB_URL`, `SUPABASE_DB_USERNAME`, and
`SUPABASE_DB_PASSWORD`, then run. Local development also defaults to a three-connection
pool so it cannot starve the Render deployment of Supabase session-pool connections:

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

In a second terminal:

```powershell
cd frontend
npm.cmd run dev -- --host localhost --port 5173 --strictPort
```

The ignored `frontend/.env` keeps `VITE_API_BASE_URL=/api/v1` and
`VITE_API_PROXY_TARGET=http://localhost:8080` for local development.

## Normal release workflow

Run the checks before committing:

```powershell
cd backend
.\mvnw.cmd test

cd ..\frontend
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

Then commit only reviewed files:

```powershell
cd "C:\custom reporting"
git status
git add <changed-files>
git commit -m "Describe the changes"
git push origin main
```

After the push, confirm the commit appears in both providers. Render should deploy when
`backend/**` changed, and Vercel should deploy when `frontend/**` changed.

## Production verification

1. Open `https://custom-reporting-backend.onrender.com/api/v1/health` and confirm HTTP 200.
2. Open `https://custom-reporting-frontend.vercel.app`.
3. Confirm browser requests target the Render API and show no CORS errors.
4. Create or use a test account, then verify signup, login, page reload/token refresh,
   logout, and a normal database-backed update.
5. Restart/redeploy the backend and confirm the data remains in Supabase.
6. Push a reviewed backend-only commit and confirm only Render deploys it.
7. Push a reviewed frontend-only commit and confirm only Vercel deploys it.

## Failures and rollback

For a Render failure, read the first build/start error and keep the last healthy deploy
serving. For a Vercel failure, inspect the install, TypeScript, and Vite build output. Do
not weaken authentication, CORS, TLS, or secret handling to make a deployment pass.

To roll back source consistently, revert the faulty commit and push the revert:

```powershell
git log --oneline -10
git revert <faulty-commit-sha>
git push origin main
```

Render and Vercel will deploy the reverted source automatically. Their dashboards can
temporarily restore a previous successful deployment if production must be recovered
before the source revert finishes.

## Tracked runtime-profile cleanup

`.runtime/` contains local browser automation profiles and is ignored because it can
hold cookies, session storage, caches, and machine-specific data. If it was committed
previously, remove it from Git tracking without deleting local files:

```powershell
git rm -r --cached -- .runtime
git commit -m "Stop tracking local runtime profiles"
git push origin main
```

This removes the directory from future commits but not from existing Git history. If the
profiles contained a real session, revoke that session. History rewriting is a separate,
disruptive operation and must be coordinated with every repository user.
