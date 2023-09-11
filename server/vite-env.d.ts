/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly PINECONE_API_KEY: string;
  readonly PINECONE_ENVIRONMENT: string;
  readonly PINECONE_INDEX: string;
  readonly PINECONE_DATA_DIR_PATH: string;
  readonly IS_PROD: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
