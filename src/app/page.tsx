import { cookies } from "next/headers";
import { Message } from "@prisma/client";

import Conversation from "@/app/components/conversation";
import { getMessagesForConversation } from "@/lib/queries.server";
import UserForm from "@/app/components/user-form";
import Wrapper from "@/app/components/wrapper";

export default async function Home() {
  const cookieStore = cookies();
  const sessionIdCookie = cookieStore.get("session-id");
  let messages: Message[] = [];
  let sessionId = null;
  if (sessionIdCookie) {
    sessionId = sessionIdCookie.value;
    messages = await getMessagesForConversation(sessionId);
    // Filter out hidden messages
    messages = messages.filter((message) => !message.hidden);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1 className="text-4xl font-bold">Larry King Interviewer</h1>
      <Wrapper messages={messages} sessionId={sessionId} />
    </main>
  );
}
