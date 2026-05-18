/** Olgun Özoktaş geliştirdi · API Lab */
// OpenAI — curated essentials. A hand-picked slice of the API: chat
// completions, models, embeddings, images, audio, files, moderation.
// JSON write endpoints carry a body skeleton; file-upload endpoints
// (transcription, file upload) are multipart and ship none.
import type { CuratedProvider } from "./types";

export const openaiCurated: CuratedProvider = {
  baseUrl: "https://api.openai.com/v1",
  endpoints: [
    {
      group: "Chat",
      name: "Create chat completion",
      method: "POST",
      path: "/chat/completions",
      description: "Generate a chat completion from a list of messages.",
      body: {
        mode: "json",
        text: '{\n  "model": "gpt-4o",\n  "messages": [\n    { "role": "user", "content": "Hello!" }\n  ]\n}',
      },
    },
    {
      group: "Models",
      name: "List models",
      method: "GET",
      path: "/models",
      description: "List the models available to the API key.",
    },
    {
      group: "Models",
      name: "Retrieve a model",
      method: "GET",
      path: "/models/{model}",
      description: "Fetch details for a single model.",
    },
    {
      group: "Embeddings",
      name: "Create embeddings",
      method: "POST",
      path: "/embeddings",
      description: "Turn text into an embedding vector.",
      body: {
        mode: "json",
        text: '{\n  "model": "text-embedding-3-small",\n  "input": "The text to embed"\n}',
      },
    },
    {
      group: "Images",
      name: "Create image",
      method: "POST",
      path: "/images/generations",
      description: "Generate an image from a text prompt.",
      body: {
        mode: "json",
        text: '{\n  "model": "dall-e-3",\n  "prompt": "A white siamese cat",\n  "n": 1,\n  "size": "1024x1024"\n}',
      },
    },
    {
      group: "Audio",
      name: "Create transcription",
      method: "POST",
      path: "/audio/transcriptions",
      // multipart/form-data — the body is an uploaded audio file.
      description: "Transcribe audio — body is a multipart audio-file upload.",
    },
    {
      group: "Audio",
      name: "Create speech",
      method: "POST",
      path: "/audio/speech",
      description: "Synthesize speech audio from text.",
      body: {
        mode: "json",
        text: '{\n  "model": "tts-1",\n  "input": "Hello world",\n  "voice": "alloy"\n}',
      },
    },
    {
      group: "Files",
      name: "List files",
      method: "GET",
      path: "/files",
      description: "List files uploaded to the account.",
    },
    {
      group: "Files",
      name: "Upload a file",
      method: "POST",
      path: "/files",
      // multipart/form-data — the body is the uploaded file + purpose.
      description: "Upload a file — body is a multipart file upload.",
    },
    {
      group: "Moderation",
      name: "Create moderation",
      method: "POST",
      path: "/moderations",
      description: "Check text against the moderation model.",
      body: {
        mode: "json",
        text: '{\n  "model": "omni-moderation-latest",\n  "input": "Text to classify"\n}',
      },
    },
    {
      group: "Batches",
      name: "List batches",
      method: "GET",
      path: "/batches",
      description: "List batch jobs.",
    },
    {
      group: "Batches",
      name: "Create a batch",
      method: "POST",
      path: "/batches",
      description: "Start a batch job from an uploaded input file.",
      body: {
        mode: "json",
        text: '{\n  "input_file_id": "file-abc123",\n  "endpoint": "/v1/chat/completions",\n  "completion_window": "24h"\n}',
      },
    },
  ],
};
