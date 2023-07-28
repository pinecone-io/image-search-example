import { Pipeline, pipeline, AutoConfig, AutoTokenizer, AutoProcessor, AutoModel, RawImage, Processor, PreTrainedModel, PreTrainedTokenizer } from "@xenova/transformers";
import { Vector } from "@pinecone-database/pinecone";
import { sliceIntoChunks } from "./utils/util.js";
import { createHash } from 'crypto';


class Embedder {

  private processor: Processor;
  private model: PreTrainedModel;
  private tokenizer: PreTrainedTokenizer;

  async init(modelName: string) {
    this.model = await AutoModel.from_pretrained(modelName);

    this.tokenizer = await AutoTokenizer.from_pretrained(modelName);
    this.processor = await AutoProcessor.from_pretrained(modelName);

  }

  // Embeds a text and returns the embedding
  async embed(imagePath: string, metadata?: Record<string, unknown>): Promise<Vector> {
    try {
      const image = await RawImage.read(imagePath);
      const image_inputs = await this.processor(image);
      const text_inputs = this.tokenizer([''], {
        padding: true,
        truncation: true
      });
      const output = await this.model({ ...text_inputs, ...image_inputs });
      const { image_embeds } = output;
      const { data: embeddings } = image_embeds
      const id = createHash('md5').update(imagePath).digest('hex');
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
    onDoneBatch: (embeddings: Vector[]) => void
  ) {
    const batches = sliceIntoChunks<string>(imagePaths, batchSize);
    for (const batch of batches) {
      const embeddings = await Promise.all(
        batch.map(imagePath => this.embed(imagePath)
        ));
      await onDoneBatch(embeddings);
    }
  }
}




const embedder = new Embedder();
export { embedder };
