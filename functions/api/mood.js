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
    const origin = request.headers.get("Origin");

    if (!origin || origin !== new URL(request.url).origin) {
      return Response.json(
        { success: false, message: "Request not allowed." },
        { status: 403 }
      );
    }

    if (
      !request.headers.get("Content-Type")?.includes("application/json")
    ) {
      return Response.json(
        { success: false, message: "Invalid request format." },
        { status: 415 }
      );
    }

    const body = await request.json();

    const mood =
      typeof body.mood === "string" ? body.mood.trim() : "";

    const note =
      typeof body.note === "string" ? body.note.trim() : "";

    if (!ALLOWED_MOODS.includes(mood)) {
      return Response.json(
        { success: false, message: "Please choose a valid mood." },
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
  } catch {
    return Response.json(
      {
        success: false,
        message: "Your memory could not be saved. Please try again."
      },
      { status: 500 }
    );
  }
}
