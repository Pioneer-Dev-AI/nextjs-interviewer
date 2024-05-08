import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Simulated function to check if the session ID exists and create one if it doesn't
function getSessionIdAndSetIfMissing(req: NextRequest) {
  const cookies = req.cookies;
  let sessionId = cookies["session-id"];

  if (!sessionId) {
    sessionId = generateNewSessionId(); // You need to define how to generate a session ID
    const response = NextResponse.next();
    response.cookies.set("session-id", sessionId, {
      httpOnly: true, // Recommended for security reasons
      sameSite: "strict", // Helps prevent CSRF
      path: "/", // Available on all paths
    });
    return response;
  }
  return NextResponse.next();
}

export function middleware(req: NextRequest) {
  return getSessionIdAndSetIfMissing(req);
  console.log("Middleware is running");
  return NextResponse.next();
}

function generateNewSessionId() {
  // Implement your logic to generate a session ID
  return crypto.randomUUID();
}