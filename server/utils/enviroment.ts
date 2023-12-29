export const getEnv = (key: string): string => {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(`${key} environment variable not set`);
  }
  return value;
};

export const PINECONE_API_KEY = getEnv("VITE_PINECONE_API_KEY");
export const PINECONE_ENVIRONMENT = getEnv("VITE_PINECONE_ENVIRONMENT");
export const PINECONE_INDEX = getEnv("VITE_PINECONE_INDEX");
export const PINECONE_DATA_DIR_PATH = getEnv("VITE_PINECONE_DATA_DIR_PATH");
export const IS_PROD = import.meta.env.PROD;
