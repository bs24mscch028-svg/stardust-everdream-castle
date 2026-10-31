async function hashToken(token) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token)
  );

  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function onRequestPost({ request, env }) {
  try {
    const cookie = request.headers.get("Cookie") || "";
    const match = cookie.match(/(?:^|;\s*)owner_session=([^;]+)/);

    if (match) {
      const tokenHash = await hashToken(match[1]);

      await env.DB.prepare(
        "DELETE FROM owner_sessions WHERE token_hash = ?"
      )
        .bind(tokenHash)
        .run();
    }

    return Response.json(
      { success: true, message: "Logged out successfully." },
      {
        headers: {
          "Set-Cookie": "owner_session=; HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age=0",
          "Cache-Control": "no-store"
        }
      }
    );
  } catch {
    return Response.json(
      { success: false, message: "Logout could not be completed." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
