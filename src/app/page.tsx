import { cookies } from "next/headers";
import Conversation from "@/app/components/conversation";
import { Message } from "@/lib/types";
import { getMessagesForConversation } from "@/lib/queries.server";

export default async function Home() {
  const cookieStore = cookies();
  const sessionIdCookie = cookieStore.get("session-id");
  if (!sessionIdCookie) {
    throw new Error("Session ID is required");
  }
  const sessionId = sessionIdCookie.value;
  const messages: Message[] = await getMessagesForConversation(sessionId);
  
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1 className="text-4xl font-bold">Larry King Interviewer</h1>
      <Conversation messages={messages} sessionId={sessionId} />
    </main>
  );
}
