export default () => {
  process.env.PINECONE_INDEX = `image-search-example-${new Date().getTime()}`;
  process.env.PINECONE_DATA_DIR_PATH = "./tests/data";
};
