import yargs from "yargs";
import { hideBin } from "yargs/helpers";

const sliceIntoChunks = <T>(arr: T[], chunkSize: number) => Array.from({ length: Math.ceil(arr.length / chunkSize) }, (_, i) =>
  arr.slice(i * chunkSize, (i + 1) * chunkSize)
);

const getQueryingCommandLineArguments = () => {
  const argv = yargs(hideBin(process.argv))
    .option("query", {
      alias: "q",
      type: "string",
      description: "The query to search for",
      demandOption: true,
    })
    .option("section", {
      alias: "s",
      type: "string",
      description: "The section of the article",
      demandOption: true,
    })

    .parseSync();

  const { query, section } = argv;
  if (!query) {
    console.error("Please provide a query");
    process.exit(1);
  }

  return { query, section };
};

export const getEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} environment variable not set`);
  }
  return value;
};

const validateEnvironmentVariables = () => {
  getEnv("PINECONE_API_KEY");
  getEnv("PINECONE_ENVIRONMENT");
  getEnv("PINECONE_INDEX");
};

export {
  getQueryingCommandLineArguments,
  sliceIntoChunks,
  validateEnvironmentVariables
};
