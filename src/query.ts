/* eslint-disable import/no-extraneous-dependencies */
import { embedder } from "./embeddings.ts";
import { getEnv } from "./utils/util.ts";
import { getPineconeClient } from "./utils/pinecone.ts";

interface Metadata {
  imagePath: string;
}

const indexName = getEnv("PINECONE_INDEX");
const pineconeClient = await getPineconeClient();
const pineconeIndex = pineconeClient.Index(indexName);

await embedder.init("Xenova/clip-vit-base-patch32");

const queryImages = async (imagePath: string) => {
  const queryEmbedding = await embedder.embed(imagePath);
  const queryResult = await pineconeIndex.query({
    queryRequest: {
      vector: queryEmbedding.values,
      includeMetadata: true,
      includeValues: true,
      namespace: "default",
      topK: 6
    }
  });
  return queryResult.matches?.map(match => {
    const metadata = match.metadata as Metadata;
    return {
      src: metadata.imagePath,
      score: match.score
    };
  });
};

export {
  queryImages
};