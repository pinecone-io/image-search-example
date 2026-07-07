import { describe, it, expect } from "vitest";

// Importing routes.ts also exercises that the module graph (query/upsert/delete/
// indexImages/embeddings/multer) can be imported without side effects — i.e. no
// Pinecone client or CLIP model is constructed at load time. If the lazy-init
// refactor regresses, this import throws and the whole suite fails loudly.
import { getImagesInRange } from "../../server/routes.ts";

const pages = Array.from({ length: 10 }, (_, i) => `img-${i}.jpg`);

describe("getImagesInRange", () => {
  it("returns the first page", () => {
    expect(getImagesInRange(1, 3, pages)).toEqual([
      "img-0.jpg",
      "img-1.jpg",
      "img-2.jpg",
    ]);
  });

  it("returns a middle page", () => {
    expect(getImagesInRange(2, 3, pages)).toEqual([
      "img-3.jpg",
      "img-4.jpg",
      "img-5.jpg",
    ]);
  });

  it("returns a short final page", () => {
    expect(getImagesInRange(4, 3, pages)).toEqual(["img-9.jpg"]);
  });

  it("returns an empty array for a page past the end", () => {
    expect(getImagesInRange(100, 3, pages)).toEqual([]);
  });
});
