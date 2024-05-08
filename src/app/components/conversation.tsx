"use client";

import { useState } from "react";

import { SessionId, UIMessage } from "@/types";

interface Props {
  messages: UIMessage[];
  sessionId: SessionId;
}

export default function Conversation({
  messages: inputMessages,
  sessionId,
}: Props) {
  const [messages, setMessages] = useState<UIMessage[]>(inputMessages);
  const [inputValue, setInputValue] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const newMessage: UIMessage = {
      text: inputValue,
      speaker: "user",
      sessionId: sessionId,
    };
    setMessages((prevMessages) => [...prevMessages, newMessage]); // Optimistically update UI in a callback
    setInputValue(""); // Clear input field

    // Send the message to the server
    await fetchStream("/api/answers/stream", newMessage);
  }

  async function fetchStream(url: string, message: UIMessage) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    if (!response.body) throw new Error("Response body is null");
    const reader = response.body.getReader();
    // add in the initial response
    setMessages((prevMessages) => [
      ...prevMessages,
      {
        text: "",
        speaker: "larry",
        sessionId: sessionId,
      },
    ]);

    let highestIndex = -1;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      let {chunk, index}: { chunk: string; index: number } = JSON.parse(
        new TextDecoder("utf-8").decode(value)
      );
      setMessages((prevMessages) => {
        const newMessages = [...prevMessages];
        const lastMessageIndex = newMessages.length - 1;
        if (lastMessageIndex >= 0 && chunk && index > highestIndex) {
          newMessages[lastMessageIndex].text += chunk;
        }
        highestIndex = Math.max(highestIndex, index);
        return newMessages;
      });
    }
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
      <form onSubmit={handleSubmit} className="w-full max-w-5xl">
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="w-full rounded border p-2"
          placeholder="Type your message here..."
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
