import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Webhook Endpoints
  app.post('/api/webhooks/github', (req, res) => {
    const payload = req.body;
    console.log('GitHub Webhook received:', payload);
    // Logic to parse GitHub actions/checks and update Firestore would go here
    // For now, just acknowledge
    res.status(200).json({ status: 'received' });
  });

  app.post('/api/webhooks/gitlab', (req, res) => {
    const payload = req.body;
    console.log('GitLab Webhook received:', payload);
    // Logic to parse GitLab pipeline events
    res.status(200).json({ status: 'received' });
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
