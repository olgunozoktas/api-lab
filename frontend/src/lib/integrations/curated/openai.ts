/** Olgun Özoktaş geliştirdi · API Lab */
// OpenAI — curated essentials. A hand-picked slice of the API: chat
// completions, models, embeddings, images, audio, files, moderation.
import type { CuratedProvider } from "./types";

export const openaiCurated: CuratedProvider = {
  baseUrl: "https://api.openai.com/v1",
  endpoints: [
    { group: "Chat", name: "Create chat completion", method: "POST", path: "/chat/completions" },
    { group: "Models", name: "List models", method: "GET", path: "/models" },
    { group: "Models", name: "Retrieve a model", method: "GET", path: "/models/{model}" },
    { group: "Embeddings", name: "Create embeddings", method: "POST", path: "/embeddings" },
    { group: "Images", name: "Create image", method: "POST", path: "/images/generations" },
    {
      group: "Audio",
      name: "Create transcription",
      method: "POST",
      path: "/audio/transcriptions",
    },
    { group: "Audio", name: "Create speech", method: "POST", path: "/audio/speech" },
    { group: "Files", name: "List files", method: "GET", path: "/files" },
    { group: "Files", name: "Upload a file", method: "POST", path: "/files" },
    { group: "Moderation", name: "Create moderation", method: "POST", path: "/moderations" },
    { group: "Batches", name: "List batches", method: "GET", path: "/batches" },
    { group: "Batches", name: "Create a batch", method: "POST", path: "/batches" },
  ],
};
