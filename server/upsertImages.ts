import { Pinecone } from "@pinecone-database/pinecone";
import { embedAndUpsert } from "./utils/embedAndUpsert.js";
import { getEnv } from "./utils/util.js";

const indexName = getEnv("PINECONE_INDEX");
const pinecone = new Pinecone();

const upsertImages = async (imagePaths: string[]) => {
  const index = pinecone.index(indexName);
  await embedAndUpsert({ imagePaths, chunkSize: 100, index });
};

export { upsertImages };
