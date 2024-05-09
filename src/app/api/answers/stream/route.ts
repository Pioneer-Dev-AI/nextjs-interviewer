import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/db.server";
import { StreamingTextResponse } from "ai";
import { generateStreamingResponse } from "@/lib/model.server";
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
      },
    });

    // Re-query all existing messages for the conversation, including the new message
    const messages = await getMessagesForConversation(sessionId);
    const stream = await generateStreamingResponse(messages);

    // Index the stream to keep track of the order of the responses
    const indexedStream = new ReadableStream({
      async start(controller) {
        let index = 0;
        let assistantMessage = "";
        for await (const chunk of stream) {
          assistantMessage += chunk;
          controller.enqueue(JSON.stringify({ chunk, index: index++ }));
        }
        controller.close();
        await prisma.message.create({
          data: {
            text: assistantMessage,
            speaker: "assistant",
            sessionId: sessionId,
          },
        });
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
