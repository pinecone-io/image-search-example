import express, { Request, Response } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { existsSync } from 'fs';


const app: express.Application = express();
const port: string | number = process.env.PORT || 3000;
const isProd: boolean = process.env.NODE_ENV === 'production';

if (isProd) {
  const buildPath: string = path.resolve(__dirname, 'src/app/dist');
  if (existsSync(buildPath)) {
    app.use(express.static(buildPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(buildPath, 'index.html'));
    });
  } else {
    console.log('Production build not found. Run `yarn build` in `src/app` directory.');
  }
} else {
  app.use("/", createProxyMiddleware({
    target: 'http://localhost:5173/',
    changeOrigin: true,
    ws: true,
  }));
}

app.listen(port, () => {
  console.log(`Server started at http://localhost:${port}`);
});
