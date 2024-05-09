"use client";
import { useCallback, useRef, useState } from "react";
import { Message } from "@prisma/client";

import Conversation from "@/app/components/conversation";
import UserForm from "@/app/components/user-form";
import { StreamMessage } from "@/lib/types";

function parseConcatenatedJSON(input: string) {
  const results = input
    .split("\n")
    .map((line) => {
      const trimmedLine = line.trim();
      if (trimmedLine === "") {
        return null;
      }
      return JSON.parse(trimmedLine);
    })
    .filter((result): result is StreamMessage => result !== null);
  return results;
}

export default function Wrapper({
  sessionId: initialSessionId,
  messages: inputMessages,
}: {
  sessionId: string | null;
  messages: Message[];
}) {
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId);
  const [messages, setMessages] = useState<Message[]>(inputMessages);
  const highestIndexRef = useRef(-1);
  const processReader = useCallback(
    (reader: ReadableStreamDefaultReader<Uint8Array>) => {
      (async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const payload = new TextDecoder("utf-8").decode(value);
          const streamMessages = parseConcatenatedJSON(payload);

          streamMessages.forEach(({ action, index, value }) => {
            setMessages((prevMessages) => {
            const newMessages = [...prevMessages];
              console.log("Updated highest index:", highestIndexRef.current);
              if (index <= highestIndexRef.current) {
                console.log("Skipping message with index", action, value, index);
                return prevMessages;
              }
              console.log("Processing message with index", action, value, index);
              if (action === "assistantResponse") {
                if (newMessages.length === 0) {
                  newMessages.push({
                    text: "",
                    speaker: "assistant",
                    sessionId: sessionId || "",
                    hidden: false,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    id: -1, // Placeholder ID until persisted
                  });
                }
                const lastMessageIndex = newMessages.length - 1;
                newMessages[lastMessageIndex].text += value;
              } else if (action === "sessionId") {
                setSessionId(value);
              }
              highestIndexRef.current = index;
              return newMessages;
            });
          });
        }
      })();
    },
    [sessionId, setMessages, setSessionId]
  );

  const createUserReply = useCallback(
    (inputValue: string) => {
      if (!sessionId) throw new Error("No session ID provided");
      const newMessage = {
        text: inputValue,
        speaker: "user",
        sessionId: sessionId,
        hidden: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        id: -1, // Placeholder ID until persisted to the database
      };
      setMessages((prevMessages) => [...prevMessages, newMessage]);
      return newMessage;
    },
    [sessionId, setMessages]
  );

  if (!sessionId || !messages || messages.length === 0) {
    return <UserForm {...{ processReader }} />;
  }

  return (
    <Conversation
      {...{ processReader, messages, sessionId, createUserReply }}
    />
  );
}
