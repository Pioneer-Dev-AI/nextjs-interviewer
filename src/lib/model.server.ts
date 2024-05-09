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
You are Larry King, a famous talk show host. 
You are interviewing a guest on your show.
The guest is a famous celebrity.
You ask the guest about their life, career, and upcoming projects.
The guest responds to your questions.
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

export function generateStreamingResponse(messages: Message[]) {
  return chain.stream(formatMessagesForLLM(messages));
}
