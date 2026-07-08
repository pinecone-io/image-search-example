import { describe, it, expect, beforeAll, afterAll } from "vitest";
import path from "path";
import { fileURLToPath } from "url";
import { Pinecone } from "@pinecone-database/pinecone";

import { embedder } from "../../server/embeddings.ts";

// ---------------------------------------------------------------------------
// Layer 3b: live Pinecone end-to-end test (opt-in).
//
// This is the truest signal that a @pinecone-database/pinecone bump hasn't
// broken the operations the app relies on: createIndex, listIndexes, upsert,
// query, and deleteOne against a real serverless index. It is SKIPPED unless
// PINECONE_API_KEY is set, so it never runs in the default CI job or for
// contributors without credentials.
//
// Run it with:  PINECONE_API_KEY=... npm run test:server
// It creates a uniquely-named throwaway index and deletes it on teardown.
// ---------------------------------------------------------------------------

const HAS_KEY = Boolean(process.env.PINECONE_API_KEY);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) =>
  path.join(__dirname, "..", "fixtures", "images", name);

const NAMESPACE = "default";
const CLOUD = process.env.PINECONE_CLOUD || "aws";
const REGION = process.env.PINECONE_REGION || "us-east-1";

// Unique, valid index name (lowercase alphanumeric + hyphens, <= 45 chars).
const indexName = `img-search-e2e-${Date.now().toString(36)}`;

const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

// Serverless indexes are eventually consistent; poll until `check` passes.
async function waitFor<T>(
  fn: () => Promise<T>,
  check: (value: T) => boolean,
  { attempts = 30, delayMs = 2000 } = {}
): Promise<T> {
  let last: T;
  for (let i = 0; i < attempts; i++) {
    last = await fn();
    if (check(last)) return last;
    await sleep(delayMs);
  }
  return last!;
}

describe.skipIf(!HAS_KEY)("Pinecone live end-to-end", () => {
  // Instantiated in beforeAll, not here: the describe body runs during test
  // collection even when the suite is skipped, and `new Pinecone()` throws
  // without an API key.
  let pinecone: Pinecone;
  const fixtures = ["abra-1.jpg", "bulbasaur-1.jpg", "charizard-1.jpg"].map(
    fixture
  );

  beforeAll(async () => {
    pinecone = new Pinecone();
    await embedder.ready();

    const existing = await pinecone.listIndexes();
    if (!existing.indexes?.some((idx) => idx.name === indexName)) {
      await pinecone.createIndex({
        name: indexName,
        dimension: 512,
        spec: { serverless: { cloud: CLOUD, region: REGION } },
        waitUntilReady: true,
      });
    }

    const index = pinecone.index(indexName);
    const records = await Promise.all(
      fixtures.map((f) => embedder.embed(f, { imagePath: f }))
    );
    await index.namespace(NAMESPACE).upsert({ records });

    // Wait until all upserted vectors are visible.
    await waitFor(
      () => index.namespace(NAMESPACE).describeIndexStats(),
      (stats) => (stats.namespaces?.[NAMESPACE]?.recordCount ?? 0) >= fixtures.length
    );
  }, 300_000);

  afterAll(async () => {
    try {
      await pinecone.deleteIndex(indexName);
    } catch {
      // Best-effort cleanup; ignore if the index is already gone.
    }
  }, 120_000);

  it("lists the created index", async () => {
    const list = await pinecone.listIndexes();
    expect(list.indexes?.some((idx) => idx.name === indexName)).toBe(true);
  });

  it("returns the query image itself as the top match", async () => {
    const index = pinecone.index(indexName);
    const target = fixtures[0];
    const query = await embedder.embed(target);

    // Serverless indexes are eventually consistent: recordCount in
    // describeIndexStats can tick up before every vector is queryable. Poll
    // until the query image's own vector is the top match, rather than until
    // *any* match exists, so a freshness lag doesn't surface a different image.
    const result = await waitFor(
      () =>
        index.namespace(NAMESPACE).query({
          vector: query.values,
          topK: 3,
          includeMetadata: true,
        }),
      (r) => r.matches?.[0]?.id === query.id
    );

    expect(result.matches && result.matches.length).toBeGreaterThan(0);
    const top = result.matches![0];
    expect(top.id).toBe(query.id);
    expect(top.score).toBeGreaterThan(0.99);
    expect(top.metadata?.imagePath).toBe(target);
  });

  it("deletes a vector by id", async () => {
    const index = pinecone.index(indexName);
    const target = fixtures[1];
    const { id } = await embedder.embed(target);

    await index.namespace(NAMESPACE).deleteOne({ id });

    const stats = await waitFor(
      () => index.namespace(NAMESPACE).describeIndexStats(),
      (s) => (s.namespaces?.[NAMESPACE]?.recordCount ?? 0) <= fixtures.length - 1
    );
    expect(stats.namespaces?.[NAMESPACE]?.recordCount ?? 0).toBeLessThanOrEqual(
      fixtures.length - 1
    );
  });
});
