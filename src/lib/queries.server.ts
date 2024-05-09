import { type Message } from "@prisma/client";

import { prisma } from "@/lib/db.server";

export async function getMessagesForConversation(
  sessionId: string,
  options: Parameters<typeof prisma.message.findMany>[0] = {}
) {
  const messages = await prisma.message.findMany({
    where: {
      sessionId: sessionId,
    },
    ...options,
  });
  return messages.filter((message): message is Message => {
    return ["assistant", "user"].includes(message.speaker);
  });
}
