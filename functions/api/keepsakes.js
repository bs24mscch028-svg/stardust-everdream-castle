export async function onRequestPost({ request, env }) {
  try {
    const origin = request.headers.get("Origin");
    const siteOrigin = new URL(request.url).origin;

    if (!origin || origin !== siteOrigin) {
      return Response.json(
        { success: false, message: "Request not allowed." },
        { status: 403 }
      );
    }

    if (
      !request.headers
        .get("Content-Type")
        ?.includes("application/json")
    ) {
      return Response.json(
        { success: false, message: "Invalid request format." },
        { status: 415 }
      );
    }

    const data = await request.json();

    const nickname =
      typeof data.nickname === "string"
        ? data.nickname.trim()
        : "";

    const question =
      typeof data.question === "string"
        ? data.question.trim()
        : "";

    const answer =
      typeof data.answer === "string"
        ? data.answer.trim()
        : "";

    if (nickname.length > 40) {
      return Response.json(
        { success: false, message: "Nickname is too long." },
        { status: 400 }
      );
    }

    if (!question || question.length > 500) {
      return Response.json(
        { success: false, message: "Please choose a valid question." },
        { status: 400 }
      );
    }

    if (!answer || answer.length > 1500) {
      return Response.json(
        { success: false, message: "Your answer must contain 1–1500 characters." },
        { status: 400 }
      );
    }

    await env.DB.prepare(
      `INSERT INTO keepsake_answers
       (nickname, question, answer)
       VALUES (?, ?, ?)`
    )
      .bind(nickname || "Anonymous", question, answer)
      .run();

    return Response.json(
      {
        success: true,
        message: "Your little piece of stardust has been sent! 💜✨"
      },
      {
        status: 201,
        headers: { "Cache-Control": "no-store" }
      }
    );
  } catch (error) {
    return Response.json(
      {
        success: false,
        message: "We couldn't save your answer. Please try again."
      },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" }
      }
    );
  }
}
