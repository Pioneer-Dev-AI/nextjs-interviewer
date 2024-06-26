import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/db.server";
import { StreamingTextResponse } from "ai";
import { generateStreamAndSaveAssistantResponse } from "@/lib/stream.server";
import { getMessagesForConversation } from "@/lib/queries.server";

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
        hidden: false,
      },
    });

    // Re-query all existing messages for the conversation, including the new message
    const messages = await getMessagesForConversation(sessionId);
    // Use generateStreamAndSaveAssistantResponse to get the indexed stream
    const indexedStream = await generateStreamAndSaveAssistantResponse(
      messages
    );
    return new StreamingTextResponse(indexedStream);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
      },
      { status: 500 }
    );
  }
}
