import fs from "fs/promises";
import path from "path";
import * as dotenv from "dotenv";

dotenv.config();

const sliceIntoChunks = <T>(arr: T[], chunkSize: number) =>
  Array.from({ length: Math.ceil(arr.length / chunkSize) }, (_, i) =>
    arr.slice(i * chunkSize, (i + 1) * chunkSize)
  );

async function listFiles(dir: string): Promise<string[]> {
  const files = await fs.readdir(dir);
  const filePaths: string[] = [];
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stats = await fs.stat(filePath);
    if (stats.isFile()) {
      filePaths.push(filePath);
    }
  }
  return filePaths;
}

export const getEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} environment variable not set`);
  }
  return value;
};

const validateEnvironmentVariables = () => {
  getEnv("PINECONE_API_KEY");
  getEnv("PINECONE_INDEX");
  getEnv("PINECONE_CLOUD");
  getEnv("PINECONE_REGION");
};

export { listFiles, sliceIntoChunks, validateEnvironmentVariables };
