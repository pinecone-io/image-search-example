import type { PineconeRecord } from "@pinecone-database/pinecone";
import { Pinecone } from "@pinecone-database/pinecone";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { embedder } from "./embeddings";
import { listFiles } from "./utils/util";
import { chunkedUpsert } from "./utils/chunkedUpsert";
import {
  PINECONE_API_KEY,
  PINECONE_DATA_DIR_PATH,
  PINECONE_ENVIRONMENT,
  PINECONE_INDEX,
} from "./utils/enviroment";

// Index setup
const pinecone = new Pinecone({
  apiKey: PINECONE_API_KEY,
  environment: PINECONE_ENVIRONMENT,
});

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
  const index = pinecone.Index(PINECONE_INDEX);

  // Embed each batch and upsert the embeddings into the index
  for await (const imagePaths of chunkGenerator) {
    await embedder.embedBatch(
      imagePaths,
      chunkSize,
      async (embeddings: PineconeRecord[]) => {
        await chunkedUpsert(index, embeddings, "default");
      }
    );
  }
}

const indexImages = async () => {
  try {
    // Create the index if it doesn't already exist
    const indexList = await pinecone.listIndexes();
    if (indexList.indexOf({ name: PINECONE_INDEX }) === -1) {
      await pinecone.createIndex({
        name: PINECONE_INDEX,
        dimension: 512,
        waitUntilReady: true,
      });
    }

    await embedder.init("Xenova/clip-vit-base-patch32");
    const imagePaths = await listFiles(
      join(dirname(fileURLToPath(import.meta.url)), PINECONE_DATA_DIR_PATH)
    );
    await embedAndUpsert({ imagePaths, chunkSize: 100 });
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export { indexImages };
