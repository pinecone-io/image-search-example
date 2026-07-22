import { Pinecone } from "@pinecone-database/pinecone";
import { embedAndUpsert } from "./utils/embedAndUpsert.js";
import { getEnv } from "./utils/util.js";

const upsertImages = async (imagePaths: string[]) => {
  const pinecone = new Pinecone({
    apiKey: getEnv("PINECONE_API_KEY"),
    sourceTag: "pinecone:image_search_example",
  });
  const index = pinecone.index(getEnv("PINECONE_INDEX"));
  await embedAndUpsert({ imagePaths, chunkSize: 100, index });
};

export { upsertImages };
