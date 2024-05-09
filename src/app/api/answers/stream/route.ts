import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/db.server";
import { StreamingTextResponse } from "ai";
import { ChatOllama } from "@langchain/community/chat_models/ollama";
import { RunnableSequence } from "@langchain/core/runnables";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

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


export async function POST(req: NextRequest) {
  try {
    // Retrieve the session ID and the message text from the request body
    const { sessionId, text } = await req.json();

    // Store the message from the user
    await prisma.message.create({
      data: {
        text: text,
        speaker: "user",
        sessionId: sessionId,
      },
    });

    // Re-query all existing messages for the conversation, including the new message
    const messages = await prisma.message.findMany({
      where: {
        sessionId: sessionId,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Concatenate chat history for the prompt

    const chatHistoryText = messages.map((msg) => {
      return `\n<|start_header_id|>${msg.speaker}<|end_header_id|>
      ${msg.text}<|eot_id|>`;
    }).join("");

    const fullText = `
    <|begin_of_text|><|start_header_id|>system<|end_header_id|>
    ${MAIN_PROMPT}<|eot_id|>${chatHistoryText}
    <|start_header_id|>assistant<|end_header_id|>
    `;

    const stream = await chain.stream(fullText);

    // Index the stream to keep track of the order of the responses
    const indexedStream = new ReadableStream({
      async start(controller) {
        let index = 0;
        for await (const chunk of stream) {
          controller.enqueue(JSON.stringify({ chunk, index: index++ }));
        }
        controller.close();
      },
    });

    return new StreamingTextResponse(indexedStream);
  } catch (error) {
    console.error(error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      return NextResponse.json(
        { error: "An unknown error occurred" },
        { status: 500 }
      );
    }
  }
}
