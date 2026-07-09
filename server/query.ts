/* eslint-disable import/no-extraneous-dependencies */
import { Pinecone, type Index } from '@pinecone-database/pinecone';
import path from "path";
import { embedder } from "./embeddings.ts";
import { getEnv, DATA_DIR } from "./utils/util.ts";

export type Metadata = {
  imagePath: string;
}

let index: Index<Metadata>;
const getIndex = (): Index<Metadata> => {
  if (!index) {
    const pinecone = new Pinecone();
    index = pinecone.index<Metadata>(getEnv("PINECONE_INDEX"));
  }
  return index;
};

const queryImages = async (imagePath: string) => {
  // Confine the client-supplied path to the data directory before reading it:
  // path.resolve collapses any "..", and the prefix check rejects anything that
  // escapes DATA_DIR.
  const safePath = path.resolve(imagePath);
  if (safePath !== DATA_DIR && !safePath.startsWith(DATA_DIR + path.sep)) {
    throw new Error(`Invalid image path: ${imagePath}`);
  }
  const queryEmbedding = await embedder.embed(safePath);
  const queryResult = await getIndex().namespace('default').query({
      vector: queryEmbedding.values,
      includeMetadata: true,
      includeValues: true,
      topK: 6
  });
  return queryResult.matches?.map(match => {
    const { metadata } = match;
    return {
      src: metadata ? metadata.imagePath : '',
      score: match.score
    };  
  });
};

export {
  queryImages
};