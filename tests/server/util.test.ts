import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs/promises";
import os from "os";
import path from "path";

import { getEnv, listFiles, sliceIntoChunks } from "../../server/utils/util.ts";

describe("sliceIntoChunks", () => {
  it("splits an array into evenly sized chunks", () => {
    expect(sliceIntoChunks([1, 2, 3, 4], 2)).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  it("puts the remainder in a final short chunk", () => {
    expect(sliceIntoChunks([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("returns an empty array for empty input", () => {
    expect(sliceIntoChunks([], 3)).toEqual([]);
  });

  it("returns a single chunk when chunkSize exceeds length", () => {
    expect(sliceIntoChunks([1, 2], 10)).toEqual([[1, 2]]);
  });
});

describe("getEnv", () => {
  it("returns the value when the variable is set", () => {
    process.env.__TEST_GET_ENV__ = "hello";
    expect(getEnv("__TEST_GET_ENV__")).toBe("hello");
    delete process.env.__TEST_GET_ENV__;
  });

  it("throws a descriptive error when the variable is missing", () => {
    delete process.env.__TEST_MISSING_ENV__;
    expect(() => getEnv("__TEST_MISSING_ENV__")).toThrow(
      "__TEST_MISSING_ENV__ environment variable not set"
    );
  });

  it("throws when the variable is set to an empty string", () => {
    process.env.__TEST_EMPTY_ENV__ = "";
    expect(() => getEnv("__TEST_EMPTY_ENV__")).toThrow();
    delete process.env.__TEST_EMPTY_ENV__;
  });

  it("returns the default when the variable is missing", () => {
    delete process.env.__TEST_DEFAULT_ENV__;
    expect(getEnv("__TEST_DEFAULT_ENV__", "fallback")).toBe("fallback");
  });

  it("returns the default when the variable is an empty string", () => {
    process.env.__TEST_DEFAULT_ENV__ = "";
    expect(getEnv("__TEST_DEFAULT_ENV__", "fallback")).toBe("fallback");
    delete process.env.__TEST_DEFAULT_ENV__;
  });

  it("prefers the set value over the default", () => {
    process.env.__TEST_DEFAULT_ENV__ = "real";
    expect(getEnv("__TEST_DEFAULT_ENV__", "fallback")).toBe("real");
    delete process.env.__TEST_DEFAULT_ENV__;
  });
});

describe("listFiles", () => {
  let dir: string;

  beforeAll(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "listfiles-"));
    await fs.writeFile(path.join(dir, "a.jpg"), "a");
    await fs.writeFile(path.join(dir, "b.jpg"), "b");
    await fs.writeFile(path.join(dir, ".DS_Store"), "");
    await fs.writeFile(path.join(dir, "c.jpg_deleted"), "gone");
    await fs.mkdir(path.join(dir, "subdir"));
  });

  afterAll(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("returns real files as joined paths", async () => {
    const files = await listFiles(dir);
    expect(files).toContain(path.join(dir, "a.jpg"));
    expect(files).toContain(path.join(dir, "b.jpg"));
  });

  it("filters out .DS_Store, _deleted files, and subdirectories", async () => {
    const files = await listFiles(dir);
    expect(files).toHaveLength(2);
    expect(files.some((f) => f.includes(".DS_Store"))).toBe(false);
    expect(files.some((f) => f.includes("_deleted"))).toBe(false);
    expect(files.some((f) => f.endsWith("subdir"))).toBe(false);
  });
});
