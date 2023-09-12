import { embedder } from "./embeddings";
import { PINECONE_INDEX } from "./utils/enviroment";
import { getPineconeClient } from "./utils/pinecone";

interface Metadata {
  imagePath: string;
}

const pineconeClient = await getPineconeClient();
const pineconeIndex = pineconeClient.Index(PINECONE_INDEX);

await embedder.init("Xenova/clip-vit-base-patch32");

const queryImages = async (imagePath: string) => {
  const queryEmbedding = await embedder.embed(imagePath);
  const queryResult = await pineconeIndex.query({
    queryRequest: {
      vector: queryEmbedding.values,
      includeMetadata: true,
      includeValues: true,
      namespace: "default",
      topK: 6,
    },
  });
  return queryResult.matches?.map((match) => {
    const metadata = match.metadata as Metadata;
    return {
      src: metadata.imagePath,
      score: match.score,
    };
  });
};

export { queryImages };
