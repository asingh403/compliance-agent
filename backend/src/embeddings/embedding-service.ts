import { MistralAIEmbeddings } from "@langchain/mistralai";
import { env } from "../config/env.js";
import { AppError } from "../lib/app-error.js";

export interface EmbeddingProvider {
  readonly modelName: string;
  embedDocuments(texts: string[]): Promise<number[][]>;
  embedQuery(text: string): Promise<number[]>;
}

export const assertCompatibleEmbedding = (embedding: number[]) => {
  if (
    embedding.length !== env.MONGODB_VECTOR_DIMENSIONS
    || embedding.some((value) => !Number.isFinite(value))
  ) {
    throw new AppError(
      502,
      "EMBEDDING_INCOMPATIBLE",
      `Embedding must contain ${env.MONGODB_VECTOR_DIMENSIONS} finite dimensions`,
    );
  }
};

export class EmbeddingService implements EmbeddingProvider {
  readonly modelName = env.MISTRAL_EMBED_MODEL;
  private readonly client = new MistralAIEmbeddings({
    apiKey: env.MISTRAL_API_KEY,
    model: env.MISTRAL_EMBED_MODEL,
    batchSize: env.INGEST_BATCH_SIZE,
    stripNewLines: false,
  });

  async embedDocuments(texts: string[]) {
    try {
      const embeddings = await this.client.embedDocuments(texts);
      if (embeddings.length !== texts.length) {
        throw new Error("Embedding response count did not match input count");
      }
      embeddings.forEach(assertCompatibleEmbedding);
      return embeddings;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(503, "EMBEDDING_UNAVAILABLE", "Unable to embed legal clauses");
    }
  }

  async embedQuery(text: string) {
    try {
      const embedding = await this.client.embedQuery(text);
      assertCompatibleEmbedding(embedding);
      return embedding;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(503, "EMBEDDING_UNAVAILABLE", "Unable to embed the compliance requirement");
    }
  }
}

export const embeddingService = new EmbeddingService();
