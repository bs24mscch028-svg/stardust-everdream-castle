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
      {
        success: true,
        songs: result.results || []
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return Response.json(
      {
        success: false,
        message: "Unable to load songs."
      },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" }
      }
    );
  }
}
     
