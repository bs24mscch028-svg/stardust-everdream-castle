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
    const cookie = request.headers.get("Cookie") || "";
    const match = cookie.match(/(?:^|;\s*)owner_session=([^;]+)/);

    if (!match) {
      return Response.json(
        { authenticated: false },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    const token = match[1];
    const tokenHash = await hashToken(token);

    const session = await env.DB.prepare(
      "SELECT expires_at FROM owner_sessions WHERE token_hash = ?"
    )
      .bind(tokenHash)
      .first();

    if (!session || session.expires_at <= Date.now()) {
      return Response.json(
        { authenticated: false },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    return Response.json(
      { authenticated: true },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return Response.json(
      { authenticated: false, message: "Session check failed." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
