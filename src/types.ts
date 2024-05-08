export type SessionId = string;

interface UIMessage {
  text: string;
  speaker: "user" | "larry";
  sessionId: SessionId;
}
