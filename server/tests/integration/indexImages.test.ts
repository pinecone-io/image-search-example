import request from "supertest";
import { viteNodeApp } from "../../index";

describe(
  "Index Images",
  () => {
    it("should index images", async () => {
      const res = await request(viteNodeApp).get("/indexImages");

      expect(res.statusCode).toBe(200);
      expect(res.body).toStrictEqual({
        message: "Indexing complete",
      });
    });
  },
  5 * 60 * 1_000
);
