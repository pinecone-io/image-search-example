import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Layer 3a: Pinecone wrapper logic with the SDK and model mocked.
//
// Fast and CI-safe. Verifies OUR code around the Pinecone client: that
// queryImages maps SDK matches into the app's { src, score } shape and queries
// the right namespace/params, and that deleteImage looks up the vector id,
// deletes it, and renames the file. The live end-to-end test (pinecone.e2e)
// covers the real SDK request/response behavior across dependency bumps.
// ---------------------------------------------------------------------------

const { embedMock, queryMock, deleteOneMock, namespaceMock, PineconeMock } =
  vi.hoisted(() => {
    const embedMock = vi.fn();
    const queryMock = vi.fn();
    const deleteOneMock = vi.fn();
    const namespaceMock = vi.fn(() => ({
      query: queryMock,
      deleteOne: deleteOneMock,
    }));
    const indexFn = vi.fn(() => ({ namespace: namespaceMock }));
    const PineconeMock = vi.fn(() => ({ index: indexFn }));
    return { embedMock, queryMock, deleteOneMock, namespaceMock, PineconeMock };
  });

vi.mock("@pinecone-database/pinecone", () => ({ Pinecone: PineconeMock }));
vi.mock("../../server/embeddings.ts", () => ({
  embedder: { embed: embedMock, ready: vi.fn() },
  DEFAULT_MODEL: "test-model",
}));
vi.mock("fs/promises", () => ({ default: { rename: vi.fn() } }));
// getEnv("PINECONE_API_KEY") only feeds the (mocked) Pinecone constructor
// above, so its real value never matters here — stub it so the suite doesn't
// need a real key just to satisfy the SDK's required `apiKey` config field.
vi.mock("../../server/utils/util.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../server/utils/util.ts")>();
  return {
    ...actual,
    getEnv: (key: string, defaultValue?: string) =>
      key === "PINECONE_API_KEY" ? "test-api-key" : actual.getEnv(key, defaultValue),
  };
});

import { queryImages } from "../../server/query.ts";
import { deleteImage } from "../../server/deleteImage.ts";
import fs from "fs/promises";
import path from "path";

beforeAll(() => {
  process.env.PINECONE_INDEX = "test-index";
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("queryImages", () => {
  it("embeds the query and searches the 'default' namespace with topK 6", async () => {
    embedMock.mockResolvedValue({ values: [0.1, 0.2, 0.3] });
    queryMock.mockResolvedValue({ matches: [] });

    await queryImages("data/query.jpg");

    // Embedded via a path confined to the data dir (resolved to absolute).
    expect(embedMock).toHaveBeenCalledWith(path.resolve("data/query.jpg"));
    expect(namespaceMock).toHaveBeenCalledWith("default");
    expect(queryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        vector: [0.1, 0.2, 0.3],
        topK: 6,
        includeMetadata: true,
      })
    );
  });

  it("maps matches into { src, score } using metadata.imagePath", async () => {
    embedMock.mockResolvedValue({ values: [0.1] });
    queryMock.mockResolvedValue({
      matches: [
        { id: "1", score: 0.91, metadata: { imagePath: "data/a.jpg" } },
        { id: "2", score: 0.82, metadata: { imagePath: "data/b.jpg" } },
      ],
    });

    const result = await queryImages("data/query.jpg");

    expect(result).toEqual([
      { src: "data/a.jpg", score: 0.91 },
      { src: "data/b.jpg", score: 0.82 },
    ]);
  });

  it("falls back to an empty src when a match has no metadata", async () => {
    embedMock.mockResolvedValue({ values: [0.1] });
    queryMock.mockResolvedValue({
      matches: [{ id: "1", score: 0.5 }],
    });

    const result = await queryImages("data/query.jpg");
    expect(result).toEqual([{ src: "", score: 0.5 }]);
  });

  it("rejects a path that escapes the data directory without embedding", async () => {
    await expect(queryImages("../../etc/passwd")).rejects.toThrow(
      /invalid image path/i
    );
    expect(embedMock).not.toHaveBeenCalled();
    expect(queryMock).not.toHaveBeenCalled();
  });
});

describe("deleteImage", () => {
  it("looks up the vector id, deletes it, and renames the file", async () => {
    embedMock.mockResolvedValue({ values: [0.1] });
    queryMock.mockResolvedValue({ matches: [{ id: "vec-123" }] });

    await deleteImage("data/a.jpg");

    // Finds the id via a filtered query on the image path...
    expect(queryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        topK: 1,
        filter: { imagePath: { $eq: "data/a.jpg" } },
      })
    );
    // ...deletes that vector...
    expect(deleteOneMock).toHaveBeenCalledWith({ id: "vec-123" });
    // ...and marks the file deleted on disk, using a path confined to the data
    // directory (resolved to absolute to guard against path traversal).
    const expected = path.resolve("data/a.jpg");
    expect(fs.rename).toHaveBeenCalledWith(expected, `${expected}_deleted`);
  });

  it("rejects a path that escapes the data directory without touching disk", async () => {
    await expect(deleteImage("../../etc/passwd")).rejects.toThrow(
      /invalid image path/i
    );
    expect(fs.rename).not.toHaveBeenCalled();
    expect(deleteOneMock).not.toHaveBeenCalled();
  });
});
