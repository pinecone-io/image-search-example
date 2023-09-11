/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable dot-notation */
import * as dotenv from "dotenv";
import { Vector, utils } from "@pinecone-database/pinecone";
import { embedder } from "./embeddings.ts";
import { getEnv, listFiles } from "./utils/util.ts";
import { getPineconeClient } from "./utils/pinecone.ts";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

dotenv.config();

const { waitUntilIndexIsReady } = utils;
const { createIndexIfNotExists, chunkedUpsert } = utils;

// Index setup
const indexName = getEnv("PINECONE_INDEX");
const pineconeClient = await getPineconeClient();

function* chunkArray<T>(array: T[], chunkSize: number): Generator<T[]> {
  for (let i = 0; i < array.length; i += chunkSize) {
    yield array.slice(i, i + chunkSize);
  }
}

async function embedAndUpsert({
  imagePaths,
  chunkSize,
}: {
  imagePaths: string[];
  chunkSize: number;
}) {
  // Chunk the image paths into batches of size chunkSize
  const chunkGenerator = chunkArray(imagePaths, chunkSize);

  // Get the index
  const index = pineconeClient.Index(indexName);

  // Embed each batch and upsert the embeddings into the index
  for await (const imagePaths of chunkGenerator) {
    await embedder.embedBatch(
      imagePaths,
      chunkSize,
      async (embeddings: Vector[]) => {
        await chunkedUpsert(index, embeddings, "default");
      }
    );
  }
}

const indexImages = async () => {
  try {
    await createIndexIfNotExists(pineconeClient, indexName, 512);
    await waitUntilIndexIsReady(pineconeClient, indexName);
    await embedder.init("Xenova/clip-vit-base-patch32");
    const imagePaths = await listFiles(
      join(
        dirname(fileURLToPath(import.meta.url)),
        getEnv("PINECONE_DATA_DIR_PATH")
      )
    );
    await embedAndUpsert({ imagePaths, chunkSize: 100 });
    return;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export { indexImages };
