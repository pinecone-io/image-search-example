export default () => {
  process.env.VITE_PINECONE_INDEX = `image-search-example-${new Date().getTime()}`;
};
