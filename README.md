# MALA Construction ERP

Multi-site construction management ERP. Two roles (Super Admin, Site Admin), strict per-site data isolation, live dashboards, PDF/Excel reporting.

## Stack
- **Backend**: Node.js, Express, MongoDB/Mongoose, JWT auth (access + refresh, httpOnly cookies), Cloudinary for file uploads.
- **Frontend**: React 19 (plain JS), Vite, React Router, React Hook Form, TanStack Query, Axios, Recharts, Framer Motion, plain CSS with design tokens.

## Getting started

### Backend
```
cd backend
cp .env.example .env   # fill in MONGO_URI, JWT secrets, Cloudinary keys
npm install
npm run seed:admin     # creates the first Super Admin from env vars
npm run dev
```

### Frontend
```
cd frontend
cp .env.example .env   # set VITE_API_BASE_URL if not localhost:5000
npm install
npm run dev
```

## Status
**Phase 1 (Foundation) complete.** **Phase 2 (Auth & RBAC) complete.** **Phase 3 (Site & Site Admin management) complete.**

Phase 1:
- Repo scaffold, folder architecture (backend: config/middleware/controllers/services/repositories/routes/models/validators/utils; frontend: app/layouts/components/pages/hooks/contexts/services/store/utils/constants/styles).
- Security middleware stack wired: Helmet, CORS whitelist, rate limiting, mongo-sanitize, custom XSS sanitizer, standardized error handler.
- All 15 Mongoose models (14 spec'd collections + Profession, since the spec calls out "professions" as an admin-editable category alongside material/expense categories).
- Cloudinary config wired (uploads go straight to Cloudinary, never local disk).
- Frontend shell: design-token CSS system, responsive Sidebar (off-canvas drawer < 1025px, collapsible rail ≥ 1025px), Topbar, AppLayout, router with role-based ProtectedRoute, AuthContext (auto-refresh on 401), ThemeContext (dark mode), TanStack Query client, axios instance with cookie-based auth + refresh queueing.

Phase 2:
- `POST /api/auth/login`, `/refresh`, `/logout`, `/logout-all`, `GET /api/auth/me`, `POST /api/auth/change-password` - all live and wired.
- JWT access token (15 min) + refresh token (7d/30d "remember me"), httpOnly cookies, refresh cookie scoped to `/api/auth` path only.
- Refresh tokens rotate on every use, stored hashed per device, with theft-detection (reuse of a rotated-out token revokes all sessions).
- `authenticate` + `authorize`/`authorizeSiteAccess` middleware live and reusable on every future route.
- Rate limiting on login/refresh, audit logging on every auth action.

Phase 3:
- **Sites**: full CRUD (`/api/sites`) - create, list (paginated/searchable/sortable), get, update, archive, delete. Delete is blocked with a clear error if the site has any materials/workers/expenses recorded against it (must archive instead) - protects report/audit integrity.
- **Site Admins**: full management (`/api/site-admins`) - create (with photo upload to Cloudinary), list, get, update, reset password, activate/suspend, reassign site.
- One active Site Admin per Site is enforced both ways (`Site.assignedSiteAdmin` ↔ `User.assignedSite` kept in sync); creating/reassigning into an already-assigned site is rejected with a clear error.
- Suspending a Site Admin or resetting their password immediately invalidates all of their active sessions.
- Repository layer introduced (`repositories/site.repository.js`, `repositories/user.repository.js`) establishing the query-encapsulation pattern for future modules.
- Every mutating action writes to the audit log.
- **Frontend**: real Sites and Site Admins pages (not placeholders) - the shared `DataTable` (search, pagination, loading/empty/error states, table-on-desktop/cards-on-mobile), `Modal`, `ConfirmDialog`, `FormField`, `Button`, and a `ToastContext` for success/error feedback are all built here and will be reused by every module from Phase 4 onward.

**Not yet built** (upcoming phases): Materials/Workers/Attendance/Salary/Expenses CRUD, dashboard aggregation queries, Reports/Notifications/audit-log UI, polish pass.

## Security notes / assumptions
- First Super Admin is created via `npm run seed:admin`, not a public route.
- Refresh tokens are stored **hashed** per device on the User document, so "logout from all devices" is one array clear.
- XSS sanitization uses `sanitize-html` (recursive body/params/query stripping) rather than the unmaintained `xss-clean` package.
- `express-mongo-sanitize` strips `$`/`.` keys to block NoSQL operator injection.
- `npm audit` on the backend shows one moderate transitive advisory (uuid, via exceljs) with no non-breaking fix yet - flagged for revisiting before production, not blocking for now.
- **No email/SMS gateway is in the spec'd stack.** Site Admin temp passwords (on creation and password reset) are generated server-side and returned once in the API response for the Super Admin to relay manually - the frontend shows this in a one-time reveal modal with a copy button. Wiring up a transactional email provider (e.g. nodemailer + SMTP, or an API-based sender) would be a straightforward follow-up if you'd like it.
- **One active Site Admin per Site is enforced.** The spec's data model uses singular fields both ways (`Site.assignedSiteAdmin`, `User.assignedSite`), so this seemed like the intended design rather than an oversight - flagging in case you actually want multiple admins per site.
- Site deletion is blocked (with a clear error) if the site has any materials/workers/expenses recorded - archiving is the supported way to retire a site with history. This wasn't explicitly specified but protects report/audit integrity.
- **Build-environment limitation**: this sandbox has no outbound access to MongoDB's download servers, so the auth flow was verified with a full HTTP smoke test through the real middleware stack (Zod validation → rate limiter → controller → Mongoose call) rather than a live database. The request correctly reached the DB layer and failed only on "no Mongo running" (a connection timeout), confirming the code path is wired correctly end-to-end. Run `npm run dev` against your own MongoDB instance to exercise it fully - happy to do that verification pass with you once you have a `MONGO_URI` available.
