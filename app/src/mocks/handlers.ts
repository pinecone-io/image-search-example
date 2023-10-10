import { rest } from "msw";

const BASE_URL = import.meta.env.VITE_API_URL;

export const handlers = [
  rest.get(`${BASE_URL}/api/getImages`, (_, res, ctx) => {
    return res(ctx.status(200), ctx.json([]));
  }),
];
