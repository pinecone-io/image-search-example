import type express from 'express';

import { createApp } from './app.ts';

const app: express.Application = createApp();
const port: string | number = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server started at http://localhost:${port}`);
});
