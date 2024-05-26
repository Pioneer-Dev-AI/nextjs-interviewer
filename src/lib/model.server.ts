import { ChatOllama } from "@langchain/community/chat_models/ollama";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { type Message } from "@prisma/client";

/*
Llama3 model template:

{{ if .System }}<|start_header_id|>system<|end_header_id|>

{{ .System }}<|eot_id|>{{ end }}{{ if .Prompt }}<|start_header_id|>user<|end_header_id|>

{{ .Prompt }}<|eot_id|>{{ end }}<|start_header_id|>assistant<|end_header_id|>

{{ .Response }}<|eot_id|>
*/

const model = new ChatOllama({
  baseUrl: "http://localhost:11434", // Default value
  model: "llama3",
  verbose: true,
});

const MAIN_PROMPT = `
You are Larry King interviewing a guest. The guest is a normal person who has a unique story to tell.
They are talking to you through a website created by PioneerDev.ai
You are curious and ask questions to learn more about the guest's story.
The guest responds to your questions.
You ask follow-up questions to learn more about the guest's story.
Feel free to change the topic if it gets repetitive or boring.
`;

const chain = model.pipe(new StringOutputParser());
function formatMessagesForLLM(messages: Message[]): string {
  if (messages.length === 0) {
    throw new Error("No messages found for generation.");
  }
  /**
   * There are cleaner and more sophisticated ways to format the inference input
   * but this is simple and shows how it works internally.
   */

  const chatHistoryText = messages
    .map((msg) => {
      return `
  <|start_header_id|>${msg.speaker}<|end_header_id|>
  ${msg.text}<|eot_id|>`;
    })
    .join("");
  return `
  <|begin_of_text|><|start_header_id|>system<|end_header_id|>
  ${MAIN_PROMPT}<|eot_id|>${chatHistoryText}
  <|start_header_id|>assistant<|end_header_id|>
      `;
}

function formatMessagesForBaseten(messages: Message[]) {
  const raw = formatMessagesForLLM(messages);
  return JSON.stringify({ prompt: raw });
}

export function generateStreamingResponse(messages: Message[]) {
  if (process.env.BASETEN_API_KEY) {
    return generateBasetenStreamingResponse(messages);
  }
  return chain.stream(formatMessagesForLLM(messages));
}

async function* generateBasetenStreamingResponse(messages: Message[]) {
  const requestBody = formatMessagesForBaseten(messages);
  const resp = await fetch(
    "https://model-e3mv6yo3.api.baseten.co/production/predict",
    {
      method: "POST",
      headers: { Authorization: `Api-Key ${process.env.BASETEN_API_KEY}` },
      body: requestBody,
    }
  );
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(
      `Failed to generate response with status code ${resp.status} and reponse '${body}'`
    );
  }

  const body = resp.body;
  if (!body) {
    throw new Error("No response body found.");
  }
  const reader = body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value: chunk } = await reader.read();
    if (done) break;
    const text = decoder.decode(chunk);
    if (!text) continue;
    if (text === "<|eot_id|>") break;
    yield text;
  }
}
