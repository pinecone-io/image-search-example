import request from "supertest";
import { viteNodeApp } from "../../index";
import searchMock from "../mocks/search.mock";

describe("Search Images", () => {
  it("should return similar images", async () => {
    const imagePath =
      "data/Abra-2eb2a528f9a247358452b3c740df69a0_jpg.rf.bdbfe2c31e8816602a2c897add07bc1d.jpg";

    const res = await request(viteNodeApp).get("/api/search").query({
      imagePath,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toStrictEqual(searchMock[imagePath]);
  });
});
