/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable dot-notation */
import * as dotenv from "dotenv";
import {
  Pinecone,
  type ServerlessSpecCloudEnum,
} from "@pinecone-database/pinecone";
import { embedder } from "./embeddings.ts";
import { getEnv, listFiles } from "./utils/util.ts";
import { embedAndUpsert } from "./utils/embedAndUpsert.js";

dotenv.config();

// Index setup
const indexName = getEnv("PINECONE_INDEX");
const indexCloud = getEnv("PINECONE_CLOUD") as ServerlessSpecCloudEnum;
const indexRegion = getEnv("PINECONE_REGION");
const pinecone = new Pinecone();

const indexImages = async () => {
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

    await embedder.init("Xenova/clip-vit-base-patch32");
    const imagePaths = await listFiles("./data");
    await embedAndUpsert({ imagePaths, chunkSize: 100, index });
    return;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export { indexImages };
