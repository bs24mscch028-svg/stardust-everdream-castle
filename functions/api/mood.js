const ALLOWED_MOODS = [
  "Happy",
  "Peaceful",
  "Dreamy",
  "Thoughtful",
  "Motivated",
  "Loved",
  "Grateful",
  "Excited",
  "Hopeful",
  "Sad"
];

export async function onRequestPost({ request, env }) {
  try {
    if (!env.DB) {
      return Response.json(
        { success: false, message: "Database connection is missing. Check the DB binding in Cloudflare." },
        { status: 500 }
      );
    }

    const origin = request.headers.get("Origin");

    if (!origin || origin !== new URL(request.url).origin) {
      return Response.json(
        { success: false, message: "Request not allowed. Please open the castle website and try again." },
        { status: 403 }
      );
    }

    const contentType = request.headers.get("Content-Type") || "";

    if (!contentType.includes("application/json")) {
      return Response.json(
        { success: false, message: "Invalid request format." },
        { status: 415 }
      );
    }

    const body = await request.json();

    const mood = typeof body.mood === "string" ? body.mood.trim() : "";
    const note = typeof body.note === "string" ? body.note.trim() : "";

    if (!ALLOWED_MOODS.includes(mood)) {
      return Response.json(
        { success: false, message: "Please select a mood before saving." },
        { status: 400 }
      );
    }

    if (note.length > 1000) {
      return Response.json(
        { success: false, message: "Your note must be 1000 characters or fewer." },
        { status: 400 }
      );
    }

    await env.DB.prepare(
      "INSERT INTO moods (mood, note) VALUES (?, ?)"
    ).bind(mood, note).run();

    return Response.json(
      {
        success: true,
        message: "Your Moonlit Memory has been saved. 🌙"
      },
      { status: 201 }
    );
  } catch (error) {
    return Response.json(
      {
        success: false,
        message: "Moonlit Memories could not save your entry. Please check that the moods table exists in your database."
      },
      { status: 500 }
    );
  }
}
