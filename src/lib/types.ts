import type { Message as ClientMessage } from "@prisma/client";

export type SessionId = string;
export interface Message extends ClientMessage {
  speaker: "user" | "assistant";
}
