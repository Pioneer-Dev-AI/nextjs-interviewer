import { Message } from "@prisma/client";
import { useState } from "react";

export default function UserForm({
  processReader,
}: {
  processReader: (reader: ReadableStreamDefaultReader<Uint8Array>) => void;
}) {
  const [name, setName] = useState("");

  async function startConversation(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name) {
      throw new Error("No name provided");
    }
    // Send the initial message to the server
    const response = await fetch("/api/start-conversation/stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
      }),
    });

    if (!response.body) throw new Error("Response body is null");
    const reader = response.body.getReader();
    processReader(reader);
  }

  return (
    <form
      onSubmit={startConversation}
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
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
        />
      </div>
      <div className="flex items-center justify-between">
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        >
          Start Conversation
        </button>
      </div>
    </form>
  );
}
