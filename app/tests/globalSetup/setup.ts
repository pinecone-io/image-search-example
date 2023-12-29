import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { server } from "../../src/mocks/server";

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));

afterAll(() => server.close());

afterEach(() => {
  server.resetHandlers();
  // runs a cleanup after each test case (e.g. clearing jsdom)
  cleanup();
});
