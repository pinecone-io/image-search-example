import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  beforeAll,
  afterEach,
} from "vitest";
import request from "supertest";
import fs from "fs/promises";
import path from "path";

// ---------------------------------------------------------------------------
// Layer 4: HTTP API integration.
//
// Drives the real Express app (routing, multer multipart parsing, query-param
// handling, status codes, error mapping) via supertest. The Pinecone/model
// layer is mocked so this stays fast and CI-safe; it exercises the express +
// multer + routing glue, which is what express/multer bumps would break.
// ---------------------------------------------------------------------------

// Mocks are hoisted above the imports below, so routes.ts picks them up when
// createApp() builds the router.
vi.mock("../../server/query.ts", () => ({ queryImages: vi.fn() }));
vi.mock("../../server/indexImages.ts", () => ({ indexImages: vi.fn() }));
vi.mock("../../server/upsertImages.ts", () => ({ upsertImages: vi.fn() }));
vi.mock("../../server/deleteImage.ts", () => ({ deleteImage: vi.fn() }));
vi.mock("../../server/utils/util.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../server/utils/util.ts")>();
  return { ...actual, listFiles: vi.fn() };
});

import { createApp } from "../../server/app.ts";
import { queryImages } from "../../server/query.ts";
import { indexImages } from "../../server/indexImages.ts";
import { upsertImages } from "../../server/upsertImages.ts";
import { deleteImage } from "../../server/deleteImage.ts";
import { listFiles } from "../../server/utils/util.ts";

const app = createApp({ proxy: false });

// multer writes uploads to ./data with a random name. Snapshot the directory so
// we can remove anything the upload tests create, keeping the dataset pristine.
const DATA_DIR = path.join(process.cwd(), "data");
let originalDataFiles: Set<string>;

beforeAll(async () => {
  originalDataFiles = new Set(await fs.readdir(DATA_DIR));
});

afterEach(async () => {
  vi.clearAllMocks();
  const current = await fs.readdir(DATA_DIR);
  await Promise.all(
    current
      .filter((f) => !originalDataFiles.has(f))
      .map((f) => fs.rm(path.join(DATA_DIR, f), { force: true }))
  );
});

describe("GET /getImages", () => {
  beforeEach(() => {
    vi.mocked(listFiles).mockResolvedValue(
      Array.from({ length: 10 }, (_, i) => `data/img-${i}.jpg`)
    );
  });

  it("returns a page of images as { src } objects", async () => {
    const res = await request(app).get("/getImages?page=2&pageSize=3");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { src: "data/img-3.jpg" },
      { src: "data/img-4.jpg" },
      { src: "data/img-5.jpg" },
    ]);
  });

  it("defaults to page 1 / pageSize 10 when params are absent", async () => {
    const res = await request(app).get("/getImages");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(10);
    expect(res.body[0]).toEqual({ src: "data/img-0.jpg" });
  });
});

describe("GET /search", () => {
  it("returns matches from queryImages", async () => {
    const matches = [
      { src: "data/a.jpg", score: 0.9 },
      { src: "data/b.jpg", score: 0.8 },
    ];
    vi.mocked(queryImages).mockResolvedValue(matches);

    const res = await request(app).get("/search?imagePath=data/a.jpg");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(matches);
    expect(queryImages).toHaveBeenCalledWith("data/a.jpg");
  });

  it("returns 500 when the query fails", async () => {
    vi.mocked(queryImages).mockRejectedValue(new Error("boom"));
    const res = await request(app).get("/search?imagePath=data/a.jpg");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Error fetching images" });
  });
});

describe("POST /uploadImages", () => {
  it("parses a multipart upload, upserts it, and returns a page number", async () => {
    vi.mocked(upsertImages).mockResolvedValue(undefined);
    vi.mocked(listFiles).mockResolvedValue(["data/img-0.jpg"]);

    const res = await request(app)
      .post("/uploadImages?pageSize=3")
      .attach("images", Buffer.from("fake-image-bytes"), "upload.jpg");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("pageOfFirstImage");
    // The handler passes the multer-written path(s) through to upsertImages.
    expect(upsertImages).toHaveBeenCalledTimes(1);
    const [paths] = vi.mocked(upsertImages).mock.calls[0];
    expect(paths).toHaveLength(1);
  });

  it("returns 400 when no files are attached", async () => {
    const res = await request(app).post("/uploadImages");
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "No files uploaded" });
    expect(upsertImages).not.toHaveBeenCalled();
  });

  it("returns 500 when upsert fails", async () => {
    vi.mocked(upsertImages).mockRejectedValue(new Error("boom"));
    vi.mocked(listFiles).mockResolvedValue([]);

    const res = await request(app)
      .post("/uploadImages")
      .attach("images", Buffer.from("fake-image-bytes"), "upload.jpg");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Error uploading images" });
  });
});

describe("DELETE /deleteImage", () => {
  it("deletes and returns a confirmation message", async () => {
    vi.mocked(deleteImage).mockResolvedValue(undefined);
    const res = await request(app).delete(
      "/deleteImage?imagePath=data/a.jpg"
    );
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "Image deleted" });
    expect(deleteImage).toHaveBeenCalledWith("data/a.jpg");
  });

  it("returns 500 when deletion fails", async () => {
    vi.mocked(deleteImage).mockRejectedValue(new Error("boom"));
    const res = await request(app).delete(
      "/deleteImage?imagePath=data/a.jpg"
    );
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Error deleting image" });
  });
});

describe("GET /indexImages", () => {
  it("runs indexing and returns completion", async () => {
    vi.mocked(indexImages).mockResolvedValue(undefined);
    const res = await request(app).get("/indexImages");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "Indexing complete" });
  });

  it("returns 500 when indexing fails", async () => {
    vi.mocked(indexImages).mockRejectedValue(new Error("boom"));
    const res = await request(app).get("/indexImages");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Error indexing images" });
  });
});
