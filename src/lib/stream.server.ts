import { type Message } from "@prisma/client";

import { generateStreamingResponse } from "@/lib/model.server";
import { prisma } from "@/lib/db.server";

export async function generateStreamAndSaveAssistantResponse(
  messages: Message[]
) {
  if (messages.length === 0) {
    throw new Error("No messages provided for streaming.");
  }
  const sessionId = messages[0].sessionId;
  const stream = await generateStreamingResponse(messages);

  // Index the stream to keep track of the order of the responses
  const indexedStream = new ReadableStream({
    async start(controller) {
      let index = 0;
      let assistantMessage = "";
      controller.enqueue(
        JSON.stringify({
          action: "sessionId",
          value: sessionId,
          index: index++,
        }) + "\n"
      );
      for await (const chunk of stream) {
        assistantMessage += chunk;
        controller.enqueue(
          JSON.stringify({
            action: "assistantResponse",
            value: chunk,
            index: index++,
          }) + "\n"
        );
      }
      controller.enqueue(
        JSON.stringify({
          action: "stop",
          value: null,
          index: index++,
        }) + "\n"
      );
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
  return indexedStream;
}
