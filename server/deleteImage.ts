import { Pinecone } from "@pinecone-database/pinecone";
import fs from "fs/promises";
import { embedder } from "./embeddings.ts";
import { getEnv } from "./utils/util.ts";
import { type Metadata } from "./query.js";

const indexName = getEnv("PINECONE_INDEX");
const pinecone = new Pinecone();
const index = pinecone.index<Metadata>(indexName);

await embedder.init("Xenova/clip-vit-base-patch32");

const getPineconeId = async (imagePath: string) => {
  const queryEmbedding = await embedder.embed(imagePath);
  const queryResult = await index.namespace("default").query({
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
  await index.namespace("default").deleteOne(pineconeId);
  // Append _deleted to the image path for demo purposes
  await fs.rename(imagePath, `${imagePath}_deleted`);
};

export { deleteImage };
