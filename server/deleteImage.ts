import { Pinecone, type Index } from "@pinecone-database/pinecone";
import fs from "fs/promises";
import { embedder } from "./embeddings.ts";
import { getEnv } from "./utils/util.ts";
import { type Metadata } from "./query.js";

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
  const pineconeId = await getPineconeId(imagePath);
  if (!pineconeId) {
    throw new Error(`No indexed vector found for image: ${imagePath}`);
  }
  await getIndex().namespace("default").deleteOne({ id: pineconeId });
  // Append _deleted to the image path for demo purposes
  await fs.rename(imagePath, `${imagePath}_deleted`);
};

export { deleteImage };
