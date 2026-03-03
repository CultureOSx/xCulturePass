import { Router } from 'express';

const router = Router();

interface Job {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
  status: 'queued' | 'processing' | 'done' | 'failed';
}

const jobs: Job[] = [];

// POST /api/enqueue-job
router.post('/enqueue-job', (req, res) => {
  const id = `job_${Date.now()}`;
  const job: Job = {
    id,
    type: (req.body.type as string) || 'generic',
    payload: req.body.payload || {},
    createdAt: new Date().toISOString(),
    status: 'queued',
  };
  jobs.push(job);
  // naive background processing simulation
  setTimeout(() => {
    const j = jobs.find((x) => x.id === id);
    if (!j) return;
    j.status = 'processing';
    setTimeout(() => {
      j.status = 'done';
    }, 500);
  }, 100);

  return res.json({ ok: true, jobId: id });
});

// GET /api/jobs
router.get('/jobs', (_req, res) => {
  return res.json({ ok: true, jobs });
});

export default router;
