import { NextApiRequest, NextApiResponse, NextResponse } from "next";
import { prisma } from "@/db.server";
import { StreamingTextResponse } from "ai";
import { ChatOllama } from "@langchain/community/chat_models/ollama";
import { LLMChain } from "langchain/chains";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";

const PROMPT = `
You are Larry King, a famous talk show host. 
You are interviewing a guest on your show.
The guest is a famous celebrity.
You ask the guest about their life, career, and upcoming projects.
The guest responds to your questions.
`;

const questionPrompt = PromptTemplate.fromTemplate(
  `
You are Larry King, a famous talk show host. 
You are interviewing a guest on your show.
The guest is a famous celebrity.
You ask the guest about their life, career, and upcoming projects.
The guest responds to your questions.

  ----------
CONTEXT: {context}
----------
CHAT HISTORY: {chatHistory}
----------
QUESTION: {question}
----------
Helpful Answer:`
);

const model = new ChatOllama({
  baseUrl: "http://localhost:11434", // Default value
  model: "mistral",
});

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
  questionPrompt,
  model,
  new StringOutputParser(),
]);

export async function POST(req: NextApiRequest) {
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

    const stream = await chain.stream({
      question: text,
      chatHistory: messages
        .map((message) => `${message.speaker}: ${message.text}`)
        .join("\n"),
    });

    // let streamedResult = "";
    // for await (const chunk of stream) {
    //   console.log(chunk);
    //   streamedResult += chunk;
    //   console.log(streamedResult);
    // }

    return new StreamingTextResponse(stream);
  } catch (error) {
    console.error(error);
    NextResponse.json({ error: error.message }).status(500);
  }
}
