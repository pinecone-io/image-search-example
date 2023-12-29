import express from "express";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { queryImages } from "./query";
import { listFiles } from "./utils/util";
import { indexImages } from "./indexImages";
import { PINECONE_DATA_DIR_PATH } from "./utils/enviroment";

interface Route {
  route: string;
  method: "get" | "post" | "put" | "delete";
  handler: (req: express.Request, res: express.Response) => void;
}

const imagePaths = await listFiles(
  join(dirname(fileURLToPath(import.meta.url)), PINECONE_DATA_DIR_PATH),
);

function getImagesInRange(
  page: number,
  pageSize: number,
  imagePaths: string[],
): string[] {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;

  return imagePaths.slice(start, end);
}

const routes: Route[] = [
  {
    route: "/indexImages",
    method: "get",
    handler: async (req, res) => {
      try {
        await indexImages();
        res.status(200).json({ message: "Indexing complete" });
      } catch (error) {
        res.status(500).json({ error: "Error indexing images" });
      }
    },
  },
  {
    route: "/getImages",
    method: "get",
    handler: async (req, res) => {
      const page = parseInt(req.query.page as string, 10) || 1;
      const pageSize = parseInt(req.query.pageSize as string, 10) || 10;

      try {
        const images = await getImagesInRange(page, pageSize, imagePaths).map(
          (image) => ({
            src: image,
          }),
        );
        res.json(images);
      } catch (error) {
        res.status(500).json({ error: "Error fetching images" });
      }
    },
  },
  {
    route: "/search",
    method: "get",
    handler: async (req, res) => {
      const imagePath = req.query.imagePath as string;

      try {
        const matchingImages = await queryImages(imagePath);
        res.json(matchingImages);
      } catch (error) {
        res.status(500).json({ error: "Error fetching images" });
      }
    },
  },
];

export { routes as resolvers };
