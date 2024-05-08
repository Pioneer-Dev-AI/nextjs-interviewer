import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/db.server";
import { StreamingTextResponse } from "ai";
import { ChatOllama } from "@langchain/community/chat_models/ollama";
import { RunnableSequence } from "@langchain/core/runnables";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

// An example prompt with multiple input variables
const multipleInputPrompt = new PromptTemplate({
  inputVariables: ["context", "chatHistory", "question"],
  template: "system\n{context}\nuser\n{chatHistory}\nassistant\n{question}",
});

const model = new ChatOllama({
  baseUrl: "http://localhost:11434", // Default value
  model: "llama3",
});

const CONTEXT = `
You are Larry King, a famous talk show host. 
You are interviewing a guest on your show.
The guest is a famous celebrity.
You ask the guest about their life, career, and upcoming projects.
The guest responds to your questions.
`;

const chain = RunnableSequence.from([
  {
    question: (input: { question: string; chatHistory?: string }) =>
      input.question,
    chatHistory: (input: { question: string; chatHistory?: string }) =>
      input.chatHistory ?? "",
    context: async (input: { question: string; chatHistory?: string }) => {
      return "";
    },
  },
  multipleInputPrompt,
  model,
  new StringOutputParser(),
]);

export async function POST(req: NextRequest) {
  try {
    // Retrieve the session ID and the message text from the request body
    const { sessionId, text } = await req.json();

    // Store the message from the user
    await prisma.message.create({
      data: {
        text: text,
        speaker: "User",
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
    const chatHistory = messages
      .map((msg) => `${msg.speaker}: ${msg.text}`)
      .join("\n");

    // Format the prompt with the current chat history and question
    const formattedPrompt = await multipleInputPrompt.format({
      context: CONTEXT,
      chatHistory: chatHistory,
      question: text,
    });

    const stream = await chain.stream({
      question: formattedPrompt,
      chatHistory,
    });

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
