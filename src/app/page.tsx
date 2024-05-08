import { prisma } from "@/db.server";
import { SessionId, UIMessage } from "@/types";
import Conversation from "@/app/components/conversation";
import { cookies } from "next/headers";

interface HomeProps {
  sessionId: SessionId;
}

export default async function Home() {
  const cookieStore = cookies();
  const { value: sessionId } = cookieStore.get("session-id");

  if (!sessionId) {
    throw new Error("Session ID is required");
  }

  const messages: UIMessage[] = await prisma.message.findMany({
    where: {
      sessionId: sessionId,
    },
    select: {
      text: true,
      speaker: true,
      sessionId: true,
    },
  });
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1 className="text-4xl font-bold">Larry King Interviewer</h1>
      <Conversation messages={messages} sessionId={sessionId} />
    </main>
  );
}
