import { seedNewConversation } from "@/lib/interviewer.server";
import { cookies } from "next/headers";

export default function UserForm() {
  async function startConversation(formData: FormData) {
    "use server"
    console.log("Starting conversation with", formData.get("name"));
    const cookieStore = cookies();
    const sessionId = crypto.randomUUID();
    const name = formData.get("name");
    if (!name) {
      throw new Error("No message content provided");
    }
    const nameEntry = formData.get("name");
    if (!nameEntry) {
      throw new Error("No name provided");
    }
    await seedNewConversation({
      name: nameEntry.toString(),
      sessionId: sessionId,
    });
    cookieStore.set("session-id", sessionId, {
      httpOnly: true,
      sameSite: "strict",
      path: "/",
    });
  }

  return (
    <form
      action={startConversation}
      className="flex flex-col items-center bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4"
    >
      <div className="mb-4">
        <label
          htmlFor="name"
          className="block text-gray-700 text-sm font-bold mb-2"
        >
          Name:
        </label>
        <input
          type="text"
          id="name"
          name="name"
          required
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
        />
      </div>
      <div className="flex items-center justify-between">
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        >
          Submit
        </button>
      </div>
    </form>
  );
}
