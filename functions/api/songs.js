async function hashToken(token) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token)
  );

  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function isOwner(request, env) {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(/(?:^|;\s*)owner_session=([^;]+)/);

  if (!match) return false;

  const tokenHash = await hashToken(match[1]);

  const session = await env.DB.prepare(
    "SELECT expires_at FROM owner_sessions WHERE token_hash = ?"
  ).bind(tokenHash).first();

  return Boolean(session && session.expires_at > Date.now());
}

// Private: only the owner can read submitted songs.
export async function onRequestGet({ request, env }) {
  try {
    if (!(await isOwner(request, env))) {
      return Response.json(
        { success: false, message: "Owner login required." },
        {
          status: 401,
          headers: { "Cache-Control": "no-store" }
        }
      );
    }

    const result = await env.DB.prepare(
      `SELECT id, title, artist, song_url, note, created_at
       FROM songs
       ORDER BY id DESC
       LIMIT 500`
    ).all();

    return Response.json(
      { success: true, songs: result.results || [] },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return Response.json(
      { success: false, message: "Unable to load songs." },
      { status: 500 }
    );
  }
}

// Public: visitors can submit song dedications.
export async function onRequestPost({ request, env }) {
  try {
    const origin = request.headers.get("Origin");

    if (!origin || origin !== new URL(request.url).origin) {
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

    const title = typeof body.title === "string" ? body.title.trim() : "";
    const artist = typeof body.artist === "string" ? body.artist.trim() : "";
    const songUrl = typeof body.song_url === "string" ? body.song_url.trim() : "";
    const note = typeof body.note === "string" ? body.note.trim() : "";

    if (!title || title.length > 150) {
      return Response.json(
        { success: false, message: "Please enter a song title (maximum 150 characters)." },
        { status: 400 }
      );
    }

    if (artist.length > 150 || note.length > 1000 || songUrl.length > 2048) {
      return Response.json(
        { success: false, message: "One of the fields is too long." },
        { status: 400 }
      );
    }

    if (songUrl) {
      try {
        const parsedUrl = new URL(songUrl);

        if (!["http:", "https:"].includes(parsedUrl.protocol)) {
          throw new Error("Invalid protocol");
        }
      } catch {
        return Response.json(
          { success: false, message: "Please enter a valid HTTP or HTTPS song link." },
          { status: 400 }
        );
      }
    }

    await env.DB.prepare(
      `INSERT INTO songs (title, artist, song_url, note)
       VALUES (?, ?, ?, ?)`
    ).bind(title, artist, songUrl, note).run();

    return Response.json(
      { success: true, message: "Your song dedication has reached Melody Planet! ✨" },
      { status: 201 }
    );
  } catch {
    return Response.json(
      { success: false, message: "Your song could not be submitted. Please try again." },
      { status: 500 }
    );
  }
}
