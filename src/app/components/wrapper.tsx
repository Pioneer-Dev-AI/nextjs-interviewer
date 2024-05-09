"use client";
import { useCallback, useRef, useReducer } from "react";
import { Message } from "@prisma/client";

import Conversation from "@/app/components/conversation";
import UserForm from "@/app/components/user-form";

interface StreamMessage {
  action: string;
  index: number;
  value: string | null;
}

function parseConcatenatedJSON(input: string): StreamMessage[] {
  return input
    .split("\n")
    .map((line: string) => {
      const trimmedLine = line.trim();
      return trimmedLine ? JSON.parse(trimmedLine) : null;
    })
    .filter((result): result is StreamMessage => result !== null);
}

interface MessageState {
  sessionId: string | null;
  messages: Message[];
}

type MessageAction =
  | { type: "SET_SESSION_ID"; sessionId: string }
  | { type: "ADD_MESSAGE"; message: Message }
  | { type: "APPEND_ASSISTANT_MESSAGE"; chunk: string };


/**
 * We use a reducer here because with strict mode, we have problems with
 * the asyncronous nature of the assistant state updates that get batched.
 * Using a reducer ensures that the state updates are synchronous and only happen once
 */
const messageReducer = (
  state: MessageState,
  action: MessageAction
): MessageState => {
  switch (action.type) {
    case "SET_SESSION_ID":
      return { ...state, sessionId: action.sessionId };
    case "ADD_MESSAGE":
      return { ...state, messages: [...state.messages, action.message] };
    case "APPEND_ASSISTANT_MESSAGE":
      if (
        state.messages.length === 0 ||
        state.messages[state.messages.length - 1].speaker === "user"
      ) {
        const newAssistantMessage = {
          text: action.chunk,
          speaker: "assistant",
          sessionId: state.sessionId || "",
          hidden: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          id: -1, // Placeholder ID until persisted to the database
        };
        return { ...state, messages: [...state.messages, newAssistantMessage] };
      } else {
        const lastMessage = state.messages[state.messages.length - 1];
        // immutable update the message
        const updatedMessages = [
          ...state.messages.slice(0, -1),
          {
            ...lastMessage,
            text: lastMessage.text + action.chunk,
          },
        ];
        return { ...state, messages: updatedMessages };
      }
    default:
      return state;
  }
};

interface WrapperProps {
  sessionId: string | null;
  messages: Message[];
}

export default function Wrapper({
  sessionId: initialSessionId,
  messages: inputMessages,
}: WrapperProps) {
  const [{ sessionId, messages }, dispatch] = useReducer(messageReducer, {
    sessionId: initialSessionId,
    messages: inputMessages,
  });

  async function processReader(
    reader: ReadableStreamDefaultReader<Uint8Array>
  ) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const payload = new TextDecoder("utf-8").decode(value);
      const streamMessages = parseConcatenatedJSON(payload);

      streamMessages.forEach(({ action, value }) => {
        if (action === "assistantResponse" && value) {
          dispatch({ type: "APPEND_ASSISTANT_MESSAGE", chunk: value });
        } else if (action === "sessionId" && value) {
          dispatch({
            type: "SET_SESSION_ID",
            sessionId: value,
          });
        }
      });
    }
  }

  const createUserReply = useCallback(
    (inputValue: string) => {
      if (!sessionId) throw new Error("No session ID provided");
      const newMessage: Message = {
        text: inputValue,
        speaker: "user",
        sessionId: sessionId as string,
        hidden: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        id: -1, // Placeholder ID until persisted to the database
      } as Message;
      dispatch({ type: "ADD_MESSAGE", message: newMessage });
      return newMessage;
    },
    [sessionId]
  );

  if (!sessionId || !messages || messages.length === 0) {
    return <UserForm processReader={processReader} />;
  }

  return (
    <Conversation
      processReader={processReader}
      messages={messages}
      sessionId={sessionId}
      createUserReply={createUserReply}
    />
  );
}
