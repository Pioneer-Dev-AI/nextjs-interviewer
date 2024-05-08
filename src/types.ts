export type SessionId = string;

export interface UIMessage {
  text: string;
  speaker: "user" | "larry";
  sessionId: SessionId;
}
