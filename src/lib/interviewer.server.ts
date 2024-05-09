import { prisma } from "@/lib/db.server";
import { generateSimpleResponse } from "@/lib/model.server";
import { type Message } from "@/lib/types";

export async function seedNewConversation({
  name,
  sessionId,
}: {
  name: string;
  sessionId: string;
}) {
  const message = await prisma.message.create({
    data: {
      text: `Hi Larry, my name is ${name}. Excited for you to interview me!`,
      speaker: "user",
      sessionId: sessionId,
    },
  });
  // TODO: fix typing
  const response = await generateSimpleResponse([message] as Message[]);
  await prisma.message.create({
    data: {
      text: response,
      speaker: "assistant",
      sessionId: sessionId,
    },
  });
}
