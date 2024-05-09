export type SessionId = string;

export type StreamMessage = {
  index: number;
  action: "assistantResponse" | "sessionId";
  value: string;
};
