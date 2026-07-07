/* eslint-disable import/no-extraneous-dependencies */
import { Pinecone, type Index } from '@pinecone-database/pinecone';
import { embedder } from "./embeddings.ts";
import { getEnv } from "./utils/util.ts";

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
  const queryEmbedding = await embedder.embed(imagePath);
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