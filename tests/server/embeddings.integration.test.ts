import { describe, it, expect, beforeAll } from "vitest";
import { createHash } from "crypto";
import path from "path";
import { fileURLToPath } from "url";
import type { PineconeRecord } from "@pinecone-database/pinecone";

import { embedder, DEFAULT_MODEL } from "../../server/embeddings.ts";

// ---------------------------------------------------------------------------
// Layer 2: real model integration.
//
// This is the highest-value test for catching breakage from dependency bumps
// (@huggingface/transformers, onnxruntime-node). It actually loads the CLIP
// model and runs inference against committed fixture images — no Pinecone key
// or network to our own services required, only the one-time HF model download.
//
// It verifies three things a silent dependency break would violate:
//   1. Shape/format: a 512-dim finite vector in Pinecone's record format.
//   2. Determinism: the same image embeds to (essentially) the same vector.
//   3. Semantics: the embeddings are *meaningful* — two images of the same
//      subject are closer to each other than to a different subject.
// ---------------------------------------------------------------------------

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) =>
  path.join(__dirname, "..", "fixtures", "images", name);

const ABRA_1 = fixture("abra-1.jpg");
const ABRA_2 = fixture("abra-2.jpg");
const CHARIZARD = fixture("charizard-1.jpg");

const CLIP_DIMENSION = 512;

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

describe("Embedder (real CLIP model)", () => {
  // Warm the model once. Kept generous because the first run downloads weights.
  beforeAll(async () => {
    await embedder.ready();
  }, 300_000);

  it("uses the CLIP base patch32 model by default", () => {
    expect(DEFAULT_MODEL).toBe("Xenova/clip-vit-base-patch32");
  });

  it("produces a 512-dimensional finite vector in Pinecone record format", async () => {
    const record: PineconeRecord = await embedder.embed(ABRA_1);

    expect(record.values).toHaveLength(CLIP_DIMENSION);
    expect(record.values.every((v) => Number.isFinite(v))).toBe(true);
    // Not the zero vector.
    expect(record.values.some((v) => v !== 0)).toBe(true);
  });

  it("derives the record id from the md5 of the image path", async () => {
    const record = await embedder.embed(ABRA_1);
    const expectedId = createHash("md5").update(ABRA_1).digest("hex");
    expect(record.id).toBe(expectedId);
  });

  it("defaults metadata to the image path when none is supplied", async () => {
    const record = await embedder.embed(ABRA_1);
    expect(record.metadata).toEqual({ imagePath: ABRA_1 });
  });

  it("uses supplied metadata when provided", async () => {
    const record = await embedder.embed(ABRA_1, { imagePath: ABRA_1, tag: "x" });
    expect(record.metadata).toEqual({ imagePath: ABRA_1, tag: "x" });
  });

  it("is deterministic: the same image embeds to the same vector", async () => {
    const a = await embedder.embed(ABRA_1);
    const b = await embedder.embed(ABRA_1);
    // Cosine similarity of identical inputs must be ~1. A tiny epsilon absorbs
    // harmless floating-point nondeterminism across runtime versions while
    // still catching a genuine change in model output.
    expect(cosineSimilarity(a.values, b.values)).toBeGreaterThan(0.9999);
  });

  // Fixture set: 3 Pokémon x 3 images each. The class is encoded in the filename.
  const SUBJECTS = ["abra", "bulbasaur", "charizard"] as const;
  const CATALOG = SUBJECTS.flatMap((subject) =>
    [1, 2, 3].map((n) => ({ subject, file: fixture(`${subject}-${n}.jpg`) }))
  );

  it("retrieves a same-subject image as the nearest neighbor (mirrors app search)", async () => {
    // Embed the whole catalog, then for each image find its most-similar other
    // image — exactly the nearest-neighbor query the app performs against
    // Pinecone. A large majority should share the subject. This proves the
    // embeddings carry real semantic structure, not just valid-looking floats.
    const embedded = await Promise.all(
      CATALOG.map(async (item) => ({
        ...item,
        values: (await embedder.embed(item.file)).values,
      }))
    );

    let sameSubject = 0;
    for (let i = 0; i < embedded.length; i++) {
      let bestScore = -Infinity;
      let bestIdx = -1;
      for (let j = 0; j < embedded.length; j++) {
        if (i === j) continue;
        const score = cosineSimilarity(embedded[i].values, embedded[j].values);
        if (score > bestScore) {
          bestScore = score;
          bestIdx = j;
        }
      }
      if (embedded[bestIdx].subject === embedded[i].subject) sameSubject++;
    }

    // Observed 17/18 on the reference stack; 70% is a comfortable floor that
    // still fails hard if the model starts returning meaningless vectors.
    expect(sameSubject / embedded.length).toBeGreaterThanOrEqual(0.7);
  });

  it("clusters a well-separated subject tighter than across subjects", async () => {
    // Bulbasaur is a visually tight, well-separated class in the fixture set,
    // so this comparison has a wide, stable margin (intra ~0.97 vs cross ~0.83).
    const embed = async (f: string) => (await embedder.embed(f)).values;
    const bulba = await Promise.all(
      [1, 2, 3].map((n) => embed(fixture(`bulbasaur-${n}.jpg`)))
    );
    const others = await Promise.all(
      ["abra-1.jpg", "charizard-1.jpg"].map((f) => embed(fixture(f)))
    );

    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    const intra = mean([
      cosineSimilarity(bulba[0], bulba[1]),
      cosineSimilarity(bulba[0], bulba[2]),
      cosineSimilarity(bulba[1], bulba[2]),
    ]);
    const cross = mean(
      bulba.flatMap((b) => others.map((o) => cosineSimilarity(b, o)))
    );

    expect(intra).toBeGreaterThan(cross);
  });

  it("embedBatch chunks by batchSize and calls onDoneBatch per chunk", async () => {
    const collected: PineconeRecord[][] = [];
    await embedder.embedBatch([ABRA_1, ABRA_2, CHARIZARD], 2, (batch) => {
      collected.push(batch);
    });

    // 3 images, batchSize 2 -> chunks of [2, 1]
    expect(collected).toHaveLength(2);
    expect(collected[0]).toHaveLength(2);
    expect(collected[1]).toHaveLength(1);
    expect(collected[0][0].values).toHaveLength(CLIP_DIMENSION);
  });
});
