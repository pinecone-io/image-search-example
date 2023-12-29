import {
  AutoTokenizer,
  AutoProcessor,
  AutoModel,
  RawImage,
  Processor,
  PreTrainedModel,
  PreTrainedTokenizer,
} from "@xenova/transformers";
import type {
  RecordMetadata,
  PineconeRecord,
} from "@pinecone-database/pinecone";
import { createHash } from "crypto";

import { sliceIntoChunks } from "./utils/util";

class Embedder {
  private processor!: Processor;

  private model!: PreTrainedModel;

  private tokenizer!: PreTrainedTokenizer;

  async init(modelName: string) {
    // Load the model, tokenizer and processor
    this.model = await AutoModel.from_pretrained(modelName);
    this.tokenizer = await AutoTokenizer.from_pretrained(modelName);
    this.processor = await AutoProcessor.from_pretrained(modelName);
  }

  // Embeds an image and returns the embedding
  async embed(
    imagePath: string,
    metadata?: RecordMetadata
  ): Promise<PineconeRecord> {
    try {
      // Load the image
      const image = await RawImage.read(imagePath);
      // Prepare the image and text inputs
      const image_inputs = await this.processor(image);
      const text_inputs = this.tokenizer([""], {
        padding: true,
        truncation: true,
      });
      // Embed the image
      const output = await this.model({ ...text_inputs, ...image_inputs });
      const { image_embeds } = output;
      const { data: embeddings } = image_embeds;

      // Create an id for the image
      const id = createHash("md5").update(imagePath).digest("hex");

      // Return the embedding in a format ready for Pinecone
      return {
        id,
        metadata: metadata || {
          imagePath,
        },
        values: Array.from(embeddings) as number[],
      };
    } catch (e) {
      console.log(`Error embedding image, ${e}`);
      throw e;
    }
  }

  // Embeds a batch of documents and calls onDoneBatch with the embeddings
  async embedBatch(
    imagePaths: string[],
    batchSize: number,
    onDoneBatch: (embeddings: PineconeRecord[]) => void
  ) {
    const batches = sliceIntoChunks<string>(imagePaths, batchSize);
    for (const batch of batches) {
      const embeddings = await Promise.all(
        batch.map((imagePath) => this.embed(imagePath))
      );
      await onDoneBatch(embeddings);
    }
  }
}

const embedder = new Embedder();
export { embedder };
