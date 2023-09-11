import request from "supertest";
import { viteNodeApp } from "../../index";
import { PINECONE_INDEX } from "../../utils/enviroment";
import { getPineconeClient } from "../../utils/pinecone";

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
      expect(result.body).toStrictEqual([
        {
          src: "data/Abra-06b9eec4827d4d49b1b4c284308708df_jpg.rf.e2d4cd14d8057f4a6474cd50e64535fe.jpg",
        },
        {
          src: "data/Abra-10a9f06ec6524c66b779ea80354f8519_jpg.rf.e2ec90c8492bbc41ce46ad4b3077b86a.jpg",
        },
        {
          src: "data/Abra-2eb2a528f9a247358452b3c740df69a0_jpg.rf.bdbfe2c31e8816602a2c897add07bc1d.jpg",
        },
      ]);

      // Delete Index
      const pineconeClient = await getPineconeClient();
      await pineconeClient.deleteIndex({
        indexName: PINECONE_INDEX,
      });
    });
  },
  5 * 60 * 1_000
);
