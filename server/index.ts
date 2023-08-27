import express, { Request, Response, Router } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import path, { dirname, join } from "path";
import { fileURLToPath } from "url";

import { existsSync } from "fs";
import { resolvers } from "./routes.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app: express.Application = express();
const port: string | number = process.env.PORT || 3000;

const router = Router();

resolvers.forEach((resolver) => {
  router[resolver.method](resolver.route, resolver.handler);
});

app.use(router);

if (import.meta.env.PROD) {
  const buildPath: string = path.resolve(__dirname, "../app");
  if (existsSync(buildPath)) {
    app.use(express.static(buildPath));
    app.use("/", express.static(join(__dirname, "./data")));
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.resolve(buildPath, "index.html"));
    });

    app.listen(port, () => {
      console.log(`Server started at http://localhost:${port}`);
    });
  } else {
    console.log("Production build not found. Run `pnpm build`");
  }
} else {
  app.use("/data", express.static(join(__dirname, "../data")));
  app.use(
    "/",
    createProxyMiddleware({
      target: "http://localhost:5173/",
      changeOrigin: true,
    })
  );
}

export const viteNodeApp = app;
