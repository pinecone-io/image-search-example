import { Pinecone, type Index } from "@pinecone-database/pinecone";
import fs from "fs/promises";
import path from "path";
import { embedder } from "./embeddings.ts";
import { getEnv } from "./utils/util.ts";
import { type Metadata } from "./query.js";

// Every deletable image lives under this directory. Deletion renames a file on
// disk from a client-supplied path, so that path must be confined here —
// otherwise a value like "../../etc/passwd" would let a caller rename files
// anywhere the server process can write.
const DATA_DIR = path.resolve("data");

// Resolves a client-supplied image path and verifies it stays inside DATA_DIR,
// throwing otherwise. Returns the absolute, normalized path safe to pass to fs.
const resolveWithinDataDir = (imagePath: string): string => {
  const resolved = path.resolve(imagePath);
  if (resolved !== DATA_DIR && !resolved.startsWith(DATA_DIR + path.sep)) {
    throw new Error(`Invalid image path: ${imagePath}`);
  }
  return resolved;
};

let index: Index<Metadata>;
const getIndex = (): Index<Metadata> => {
  if (!index) {
    const pinecone = new Pinecone();
    index = pinecone.index<Metadata>(getEnv("PINECONE_INDEX"));
  }
  return index;
};

const getPineconeId = async (imagePath: string) => {
  const queryEmbedding = await embedder.embed(imagePath);
  const queryResult = await getIndex().namespace("default").query({
    vector: queryEmbedding.values,
    includeMetadata: true,
    includeValues: false,
    topK: 1,
    filter: { imagePath: { $eq: imagePath } },
  });
  return queryResult.matches?.[0]?.id;
};

const deleteImage = async (imagePath: string) => {
  // Confine the client-supplied path to the data directory before any fs use.
  const safePath = resolveWithinDataDir(imagePath);
  const pineconeId = await getPineconeId(imagePath);
  if (!pineconeId) {
    throw new Error(`No indexed vector found for image: ${imagePath}`);
  }
  await getIndex().namespace("default").deleteOne({ id: pineconeId });
  // Append _deleted to the image path for demo purposes
  await fs.rename(safePath, `${safePath}_deleted`);
};

export { deleteImage };
