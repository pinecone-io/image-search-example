import express, { Request, Response, Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path, { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

import { resolvers } from './routes.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isProd: boolean = process.env.NODE_ENV === 'production';

export interface CreateAppOptions {
  // In dev, a catch-all proxy forwards non-API requests to the Vite dev server.
  // Tests disable it so the app has no external dependency and no open sockets.
  proxy?: boolean;
}

// Builds the Express application without starting a listener, so it can be
// driven directly by supertest in tests as well as booted by server/index.ts.
export function createApp(options: CreateAppOptions = {}): express.Application {
  const { proxy = true } = options;
  const app: express.Application = express();

  // API routes are always mounted so they can be exercised in every mode.
  const router = Router();
  resolvers.forEach((resolver) => {
    router[resolver.method](resolver.route, resolver.handler);
  });
  app.use(router);

  // Serve the source images referenced by the API responses.
  app.use('/data', express.static(join(__dirname, '../data')));

  if (isProd) {
    const buildPath: string = path.resolve(__dirname, 'app/dist');
    if (existsSync(buildPath)) {
      app.use(express.static(buildPath));
      app.get('*', (req: Request, res: Response) => {
        res.sendFile(path.resolve(buildPath, 'index.html'));
      });
    } else {
      console.log('Production build not found. Run `yarn build` in `src/app` directory.');
    }
  } else if (proxy) {
    app.use(
      '/',
      createProxyMiddleware({
        target: 'http://localhost:5173/',
        changeOrigin: true,
        ws: true,
      })
    );
  }

  return app;
}
