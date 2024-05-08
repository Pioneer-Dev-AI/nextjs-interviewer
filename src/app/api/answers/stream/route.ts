import { NextApiRequest, NextApiResponse, Response } from "next";
import { prisma } from "@/db.server";
import { StreamingTextResponse } from "ai";

export async function POST(req: NextApiRequest) {
  try {
    // Retrieve the session ID and the message text from the request body
    const { sessionId, text } = await req.json();

    // Store the message from the user
    await prisma.message.create({
      data: {
        text: text,
        speaker: "User",
        sessionId: sessionId,
      },
    });

    // Re-query all existing messages for the conversation, including the new message
    const messages = await prisma.message.findMany({
      where: {
        sessionId: sessionId,
      },
    });

    // Make a POST request to the server running on port 5000
    const response = await fetch("http://localhost:5000/stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages }),
    });

    if (response.body) {
      // Stream the response back to the client using StreamingTextResponse
      return new StreamingTextResponse(response.body);

      // Once the stream is done, store the accumulated stream in a new row in the db
      // await prisma.message.create({
      //   data: {
      //     text: streamData,
      //     speaker: "Server",
      //     sessionId: sessionId,
      //   },
      // });
    } else {
      Response.json({
        error: "Stream response from the server is empty.",
      }).status(500);
    }
  } catch (error) {
    Response.json({ error: error.message }).status(500);
  }
}
