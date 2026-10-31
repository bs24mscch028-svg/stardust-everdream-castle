export async function onRequestPost({ request, env }) {
  try {
    // Accept submissions only from this website.
    const origin = request.headers.get("Origin");
    const siteOrigin = new URL(request.url).origin;

    if (!origin || origin !== siteOrigin) {
      return Response.json(
        { success: false, message: "Request not allowed." },
        { status: 403 }
      );
    }

    if (!request.headers.get("Content-Type")?.includes("application/json")) {
      return Response.json(
        { success: false, message: "Invalid request format." },
        { status: 415 }
      );
    }

    const body = await request.json();
    const message = typeof body.message === "string"
      ? body.message.trim()
      : "";

    const allowedTypes = ["anonymous", "flower", "song"];
    const messageType = body.message_type;

    if (!allowedTypes.includes(messageType)) {
      return Response.json(
        { success: false, message: "Invalid message type." },
        { status: 400 }
      );
    }

    if (!message || message.length > 2000) {
      return Response.json(
        { success: false, message: "Message must contain 1–2000 characters." },
        { status: 400 }
      );
    }

    await env.DB.prepare(
      "INSERT INTO messages (message, message_type) VALUES (?, ?)"
    )
      .bind(message, messageType)
      .run();

    return Response.json(
      {
        success: true,
        message: "Your message has been saved. Thank you for sharing a little magic!"
      },
      {
        status: 201,
        headers: { "Cache-Control": "no-store" }
      }
    );
  } catch {
    return Response.json(
      { success: false, message: "We couldn't save your message. Please try again." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
