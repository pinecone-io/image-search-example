/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable dot-notation */
import { Vector, utils } from "@pinecone-database/pinecone";
import { embedder } from "./embeddings.ts";
import { listFiles } from "./utils/util.ts";
import { getPineconeClient } from "./utils/pinecone.ts";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { PINECONE_DATA_DIR_PATH, PINECONE_INDEX } from "./utils/enviroment";

const { waitUntilIndexIsReady } = utils;
const { createIndexIfNotExists, chunkedUpsert } = utils;

// Index setup
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
  const index = pineconeClient.Index(PINECONE_INDEX);

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
    await createIndexIfNotExists(pineconeClient, PINECONE_INDEX, 512);
    await waitUntilIndexIsReady(pineconeClient, PINECONE_INDEX);
    await embedder.init("Xenova/clip-vit-base-patch32");
    const imagePaths = await listFiles(
      join(dirname(fileURLToPath(import.meta.url)), PINECONE_DATA_DIR_PATH)
    );
    await embedAndUpsert({ imagePaths, chunkSize: 100 });
    return;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export { indexImages };
