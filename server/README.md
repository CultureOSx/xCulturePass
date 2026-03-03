# CulturePass - server

Minimal TypeScript Express server for heavy/long-running workloads.

Quick start (local):

1. Install deps

```bash
cd server
npm install
```

2. Create a `.env` from `.env.example` and set `FIREBASE_SERVICE_ACCOUNT_JSON` or use gcloud ADC.

3. Run in dev mode

```bash
npm run dev
```

Endpoints:
- `GET /health` — health check
- `GET /api/hello` — example route (returns authenticated user if you pass `Authorization: Bearer <idToken>`)

Deploy (Cloud Run):

```bash
cd server
gcloud builds submit --tag gcr.io/$GCP_PROJECT/culturepass-server
gcloud run deploy culturepass-server --image=gcr.io/$GCP_PROJECT/culturepass-server --region=australia-southeast1
```

Notes:
- This is a minimal scaffold. Add job queues (Pub/Sub/Cloud Tasks), WebSocket handling, or image processing as needed.
