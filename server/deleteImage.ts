import { Pinecone, type Index } from "@pinecone-database/pinecone";
import fs from "fs/promises";
import path from "path";
import { embedder } from "./embeddings.ts";
import { getEnv, DATA_DIR } from "./utils/util.ts";
import { type Metadata } from "./query.js";

let index: Index<Metadata>;
const getIndex = (): Index<Metadata> => {
  if (!index) {
    const pinecone = new Pinecone({
      apiKey: getEnv("PINECONE_API_KEY"),
      sourceTag: "pinecone:image_search_example",
    });
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
  // Confine the client-supplied path to the data directory before touching the
  // filesystem: path.resolve collapses any "..", and a path.relative that
  // starts with ".." means the resolved path escaped DATA_DIR.
  const safePath = path.resolve(imagePath);
  if (path.relative(DATA_DIR, safePath).startsWith("..")) {
    throw new Error(`Invalid image path: ${imagePath}`);
  }
  const pineconeId = await getPineconeId(imagePath);
  if (!pineconeId) {
    throw new Error(`No indexed vector found for image: ${imagePath}`);
  }
  await getIndex().namespace("default").deleteOne({ id: pineconeId });
  // Append _deleted to the image path for demo purposes
  await fs.rename(safePath, `${safePath}_deleted`);
};

export { deleteImage };
