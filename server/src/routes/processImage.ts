import { Router } from 'express';
import sharp from 'sharp';

const router = Router();

// POST /api/process-image
// Accepts JSON { width?: number, height?: number, color?: string }
// Returns a tiny generated PNG (base64) to demonstrate image processing.
router.post('/process-image', async (req, res) => {
  const width = Number(req.body.width) || 320;
  const height = Number(req.body.height) || 180;
  const color = (req.body.color as string) || '#0077cc';
  try {
    const img = await sharp({
      create: {
        width,
        height,
        channels: 4,
        background: color,
      },
    })
      .png()
      .toBuffer();

    return res.json({ ok: true, width, height, data: img.toString('base64') });
  } catch (err) {
    console.error('[process-image] error:', err);
    return res.status(500).json({ error: 'PROCESSING_FAILED' });
  }
});

export default router;
