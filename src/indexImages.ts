/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable dot-notation */
import * as dotenv from "dotenv";
import { Vector, utils } from '@pinecone-database/pinecone';
import cliProgress from "cli-progress";

import fs from 'fs';
import path from 'path';
import { embedder } from "./embeddings.ts";
import { getEnv } from "./utils/util.ts";
import { getPineconeClient } from "./utils/pinecone.ts";

const { waitUntilIndexIsReady } = utils;

async function listFiles(dir: string): Promise<string[]> {
  const files = await fs.promises.readdir(dir);
  const filePaths: string[] = [];
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stats = await fs.promises.stat(filePath);
    if (stats.isFile()) {
      filePaths.push(filePath);
    }
  }
  return filePaths;
}


dotenv.config();
const { createIndexIfNotExists, chunkedUpsert } = utils;

const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

// Index setup
const indexName = getEnv("PINECONE_INDEX");
const pineconeClient = await getPineconeClient();


function* chunkArray<T>(array: T[], chunkSize: number): Generator<T[]> {
  for (let i = 0; i < array.length; i += chunkSize) {
    yield array.slice(i, i + chunkSize);
  }
}


async function embedAndUpsert({ imagePaths, chunkSize, progressBar }: { imagePaths: string[], chunkSize: number, progressBar: cliProgress.SingleBar }) {
  const chunkGenerator = chunkArray(imagePaths, chunkSize);
  const index = pineconeClient.Index(indexName);

  for await (const imagePaths of chunkGenerator) {
    await embedder.embedBatch(imagePaths, chunkSize, async (embeddings: Vector[]) => {
      await chunkedUpsert(index, embeddings, "default");
      progressBar.increment(embeddings.length);
    });
  }
}

const indexImages = async () => {
  try {
    await createIndexIfNotExists(pineconeClient, indexName, 512);
    await waitUntilIndexIsReady(pineconeClient, indexName);

    await embedder.init("Xenova/clip-vit-base-patch32");

    const imagePaths = await listFiles("./data");


    await embedAndUpsert({ imagePaths, chunkSize: 100, progressBar });

  } catch (error) {
    console.error(error);
  }
};

export {
  indexImages
};

