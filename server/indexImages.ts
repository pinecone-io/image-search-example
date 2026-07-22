/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable dot-notation */
import * as dotenv from "dotenv";
import { Pinecone } from "@pinecone-database/pinecone";
import { embedder } from "./embeddings.ts";
import {
  getEnv,
  listFiles,
  DEFAULT_PINECONE_CLOUD,
  DEFAULT_PINECONE_REGION,
} from "./utils/util.ts";
import { embedAndUpsert } from "./utils/embedAndUpsert.js";

dotenv.config();

// Index setup
const indexImages = async () => {
  const indexName = getEnv("PINECONE_INDEX");
  const indexCloud = getEnv("PINECONE_CLOUD", DEFAULT_PINECONE_CLOUD);
  const indexRegion = getEnv("PINECONE_REGION", DEFAULT_PINECONE_REGION);
  const pinecone = new Pinecone({
    apiKey: getEnv("PINECONE_API_KEY"),
    sourceTag: "pinecone:image_search_example",
  });

  try {
    // Create the index if it doesn't already exist
    const indexList = await pinecone.listIndexes();
    if (!indexList.indexes?.some((index) => index.name === indexName)) {
      await pinecone.createIndex({
        name: indexName,
        dimension: 512,
        spec: { serverless: { region: indexRegion, cloud: indexCloud } },
        waitUntilReady: true,
      });
    }

    // Get the index
    const index = pinecone.index(indexName);

    await embedder.ready();
    const imagePaths = await listFiles("./data");
    await embedAndUpsert({ imagePaths, chunkSize: 100, index });
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export { indexImages };
