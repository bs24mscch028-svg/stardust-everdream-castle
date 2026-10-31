async function hashToken(token) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token)
  );

  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function onRequestGet({ request, env }) {
  try {
    // Verify the owner's login session.
    const cookie = request.headers.get("Cookie") || "";
    const match = cookie.match(/(?:^|;\s*)owner_session=([^;]+)/);

    if (!match) {
      return Response.json(
        { success: false, message: "Owner login required." },
        {
          status: 401,
          headers: { "Cache-Control": "no-store" }
        }
      );
    }

    const tokenHash = await hashToken(match[1]);

    const session = await env.DB.prepare(
      "SELECT expires_at FROM owner_sessions WHERE token_hash = ?"
    ).bind(tokenHash).first();

    if (!session || session.expires_at <= Date.now()) {
      return Response.json(
        { success: false, message: "Your session has expired. Please log in again." },
        {
          status: 401,
          headers: { "Cache-Control": "no-store" }
        }
      );
    }

    // Only a verified owner session can reach these private queries.
    const [
  messagesResult,
  songsResult,
  moodsResult,
  visitsResult,
  loveEntriesResult
] =
      await Promise.all([
        env.DB.prepare(
          `SELECT id, message, message_type, created_at
           FROM messages
           ORDER BY id DESC
           LIMIT 500`
        ).all(),

        env.DB.prepare(
          `SELECT id, title, artist, song_url, note, created_at
           FROM songs
           ORDER BY id DESC
           LIMIT 500`
        ).all(),

        env.DB.prepare(
          `SELECT id, mood, note, created_at
           FROM moods
           ORDER BY id DESC
           LIMIT 500`
        ).all(),

        env.DB.prepare(
  "SELECT COUNT(*) AS total FROM visits"
).first(),

env.DB.prepare(
  `SELECT id, category, title, content, created_at
   FROM love_entries
   ORDER BY id DESC
   LIMIT 500`
).all()
      ]);

    return Response.json(
      {
        success: true,
        messages: messagesResult.results || [],
        songs: songsResult.results || [],
        moods: moodsResult.results || [],
        visits: Number(visitsResult?.total || 0)
      },
      {
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  } catch (error) {
    return Response.json(
      {
        success: false,
        message: "Unable to load private dashboard data."
      },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" }
      }
    );
  }
}
