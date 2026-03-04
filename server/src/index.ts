import express from 'express';
import cors from 'cors';
import * as admin from 'firebase-admin';
import dotenv from 'dotenv';
import { verifyFirebaseToken } from './middleware/verifyFirebase';
import processRouter from './routes/processImage';
import jobsRouter from './routes/jobs';

dotenv.config();

const PORT = Number(process.env.PORT || 8080);
const CORS_ALLOWED_ORIGINS = (process.env.CORS_ALLOWED_ORIGINS ?? 'https://culturepass.app,https://www.culturepass.app')
  .split(',')
  .map((origin: string) => origin.trim())
  .filter(Boolean);

if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  try {
    const svc = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    admin.initializeApp({ credential: admin.credential.cert(svc as admin.ServiceAccount) });
  } catch (err) {
    console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', err);
    process.exit(1);
  }
} else {
  // will use ADC (gcloud auth) if available
  admin.initializeApp();
}

const app = express();
app.use(cors((req, callback) => {
  const origin = req.header('Origin');

  if (!origin) {
    callback(null, { origin: false });
    return;
  }

  const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
  const isAllowedOrigin = CORS_ALLOWED_ORIGINS.includes(origin) || isLocalhost;

  callback(null, {
    origin: isAllowedOrigin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    credentials: false,
    maxAge: 600,
  });
}));
app.use(express.json());

// Public health
app.get('/health', (_req, res) => res.json({ ok: true, service: 'culturepass-server' }));

// Attach optional auth middleware
app.use(verifyFirebaseToken());

// Example protected route
app.get('/api/hello', (req, res) => {
  // type narrowing
  const user = (req as any).user;
  if (user) return res.json({ ok: true, msg: `hello ${user.uid}`, uid: user.uid });
  return res.json({ ok: true, msg: 'hello anonymous' });
});

// Example utility routes
app.use('/api', processRouter);
app.use('/api', jobsRouter);

app.listen(PORT, () => {
  console.log(`culturepass-server running on port ${PORT}`);
});
