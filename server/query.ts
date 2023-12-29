/* eslint-disable import/no-extraneous-dependencies */
import { Pinecone } from "@pinecone-database/pinecone";
import { embedder } from "./embeddings";
import {
  PINECONE_API_KEY,
  PINECONE_ENVIRONMENT,
  PINECONE_INDEX,
} from "./utils/enviroment.js";

type Metadata = {
  imagePath: string;
};

const pinecone = new Pinecone({
  apiKey: PINECONE_API_KEY,
  environment: PINECONE_ENVIRONMENT,
});
const index = pinecone.index<Metadata>(PINECONE_INDEX);

await embedder.init("Xenova/clip-vit-base-patch32");

const queryImages = async (imagePath: string) => {
  const queryEmbedding = await embedder.embed(imagePath);
  const queryResult = await index.namespace("default").query({
    vector: queryEmbedding.values,
    includeMetadata: true,
    includeValues: true,
    topK: 6,
  });
  return queryResult.matches?.map((match) => {
    const { metadata } = match;
    return {
      src: metadata ? metadata.imagePath : "",
      score: match.score,
    };
  });
};

export { queryImages };
