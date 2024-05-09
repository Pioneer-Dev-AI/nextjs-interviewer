"use client";

import { useState } from "react";
import { type Message } from "@prisma/client";

import { SessionId } from "@/lib/types";

interface Props {
  messages: Message[];
  createUserReply: (inputValue: string) => Message;
  sessionId: SessionId;
  processReader: (reader: ReadableStreamDefaultReader<Uint8Array>) => void;
}

export default function Conversation({
  messages,
  createUserReply,
  processReader,
  sessionId,
}: Props) {
  const [inputValue, setInputValue] = useState("");

  async function handleSubmit() {
    const newMessage = createUserReply(inputValue);
    setInputValue(""); // Clear input field

    // Send the message to the server
    await fetchStream("/api/answers/stream", newMessage);
  }

  async function fetchStream(url: string, message: Message) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    if (!response.body) throw new Error("Response body is null");
    const reader = response.body.getReader();
    processReader(reader);
  }

  return (
    <div>
      <ul className="w-full max-w-5xl mb-4">
        {messages.map((message, index) => (
          <li key={index} className="border-b border-gray-300 py-2">
            {message.text}
          </li>
        ))}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="w-full max-w-5xl"
      >
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="w-full rounded border p-2"
          placeholder="Type your message here..."
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              handleSubmit();
            }
          }}
        />
        <button
          type="submit"
          className="mt-2 rounded bg-blue-500 py-2 px-4 text-white"
        >
          Send
        </button>
      </form>
    </div>
  );
}
