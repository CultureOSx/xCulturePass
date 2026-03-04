## 2026-03-04 - CORS Allowlist Baseline
**Vulnerability:** `server/src/index.ts` used `app.use(cors())`, allowing any origin to call API endpoints from browsers.
**Learning:** Local utility servers in this codebase can be started in production-like contexts, so permissive defaults become real exposure.
**Prevention:** Default CORS to explicit allowlist from `CORS_ALLOWED_ORIGINS` and only permit localhost origins for dev.

## 2026-03-04 - API Error Detail Leakage in Admin Routes
**Vulnerability:** Several `functions/src/app.ts` admin/location endpoints returned raw exception text (`String(err)` / `detail`) in JSON responses.
**Learning:** Fast-path admin tooling endpoints were built with debug-friendly responses, and those patterns remained in production handlers.
**Prevention:** Return stable generic client errors, keep full exception context only in server logs, and centralize 500-response helpers.
