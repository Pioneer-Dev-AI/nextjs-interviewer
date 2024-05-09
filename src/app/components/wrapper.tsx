"use client";
import { useCallback, useEffect, useRef, useState } from "react";
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
  // use an array buffer to store the streaming message
  const [pendingMessgeBuffer, setPendingMessageBuffer] = useState<string[]>([]);
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
            setPendingMessageBuffer((prevBuffer) => {
              console.log("action", action, value, index);
              if (index <= highestIndexRef.current) {
                return prevBuffer;
              }
              highestIndexRef.current = index;
              if (action === "assistantResponse") {
                console.log("new buffer", [...prevBuffer, value])
                return [...prevBuffer, value];
              }
              if (action === "sessionId") {
                setSessionId(value);
              }
              return prevBuffer;
            });
          });
        }
      })();
    },
    [setPendingMessageBuffer, setSessionId]
  );

  useEffect(() => {
    setMessages((prevMessages) => {
      console.log("pendingMessgeBuffer", pendingMessgeBuffer, prevMessages);
      if (pendingMessgeBuffer.length === 0 || prevMessages.length === 0) {
        return prevMessages;
      }
      const previousMessage = prevMessages[prevMessages.length - 1];
      // if the previous message was from the user, we need to initialize the assistant message
      if (previousMessage.speaker === "user") {
        return [
          ...prevMessages,
          {
            text: pendingMessgeBuffer.join(""),
            speaker: "assistant",
            sessionId: previousMessage.sessionId,
            hidden: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            id: -1,
          },
        ];
      }
      if (previousMessage.speaker === "assistant") {
        const updatedMessages = [...prevMessages];
        updatedMessages[updatedMessages.length - 1].text =
          pendingMessgeBuffer.join("");
        return updatedMessages;
      }
      // should never reach here
      return prevMessages;
    });
  }, [setMessages, pendingMessgeBuffer]);

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
