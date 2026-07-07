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
    if (
      stats.isFile() &&
      !filePath.includes(".DS_Store") &&
      !filePath.includes("_deleted")
    ) {
      filePaths.push(filePath);
    }
  }
  return filePaths;
}

// Sensible defaults for where the serverless index is deployed, so the app
// doesn't refuse to start over an unset region. These match the free-tier
// serverless combination and the values documented in the README.
export const DEFAULT_PINECONE_CLOUD = "aws";
export const DEFAULT_PINECONE_REGION = "us-east-1";

// Reads an environment variable. When a `defaultValue` is supplied, a missing
// or empty variable falls back to it instead of throwing; otherwise the
// variable is required and its absence is a hard error.
export const getEnv = (key: string, defaultValue?: string): string => {
  const value = process.env[key];
  if (!value) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`${key} environment variable not set`);
  }
  return value;
};

const validateEnvironmentVariables = () => {
  // Only these are truly required; cloud and region default (see above).
  getEnv("PINECONE_API_KEY");
  getEnv("PINECONE_INDEX");
};

export { listFiles, sliceIntoChunks, validateEnvironmentVariables };
