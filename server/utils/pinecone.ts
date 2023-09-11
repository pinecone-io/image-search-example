import { PineconeClient } from "@pinecone-database/pinecone";
import { PINECONE_API_KEY, PINECONE_ENVIRONMENT } from "./enviroment";

let pineconeClient: PineconeClient | null = null;

// Returns a PineconeClient instance
export const getPineconeClient: () => Promise<PineconeClient> = async () => {
  if (pineconeClient) {
    return pineconeClient;
  }
  pineconeClient = new PineconeClient();

  await pineconeClient.init({
    apiKey: PINECONE_API_KEY,
    environment: PINECONE_ENVIRONMENT,
  });

  return pineconeClient;
};
