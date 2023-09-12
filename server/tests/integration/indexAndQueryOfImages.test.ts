import request from "supertest";
import { viteNodeApp } from "../../index";
import { PINECONE_INDEX } from "../../utils/enviroment";
import { getPineconeClient } from "../../utils/pinecone";
import getImagesMock from "../mocks/getImages";

describe(
  "Index/Query Images",
  () => {
    it("should index images and query them", async () => {
      // Index
      const res = await request(viteNodeApp).get("/indexImages");
      expect(res.statusCode).toBe(200);
      expect(res.body).toStrictEqual({
        message: "Indexing complete",
      });

      // Query
      const result = await request(viteNodeApp)
        .get("/getImages")
        .query({ page: 1, pageSize: 3 });
      expect(result.statusCode).toBe(200);
      expect(result.body).toStrictEqual(getImagesMock["page: 1, pageSize: 3"]);

      // Delete Index
      const pineconeClient = await getPineconeClient();
      await pineconeClient.deleteIndex({
        indexName: PINECONE_INDEX,
      });
    });
  },
  5 * 60 * 1_000
);
