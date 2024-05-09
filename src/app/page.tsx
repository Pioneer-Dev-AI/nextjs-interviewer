import { cookies } from "next/headers";
import Conversation from "@/app/components/conversation";
import { Message } from "@/lib/types";
import { getMessagesForConversation } from "@/lib/queries.server";
import UserForm from "./components/user-form";

export default async function Home() {
  const cookieStore = cookies();
  const sessionIdCookie = cookieStore.get("session-id");

  const getInnerContent = async () => {
    if (sessionIdCookie) {
      const sessionId = sessionIdCookie.value;
      const messages: Message[] = await getMessagesForConversation(sessionId);
      if (messages.length === 0) {
        return <UserForm />;
      }
      return <Conversation messages={messages} sessionId={sessionId} />;
    }
    return <UserForm />;
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1 className="text-4xl font-bold">Larry King Interviewer</h1>
      {getInnerContent()}
    </main>
  );
}
