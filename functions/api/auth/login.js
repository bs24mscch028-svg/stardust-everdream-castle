export async function onRequestPost({ request, env }) {
  try {
    const { password } = await request.json();

    if (
      !env.OWNER_PASSWORD ||
      typeof password !== "string" ||
      password !== env.OWNER_PASSWORD
    ) {
      return Response.json(
        { success: false, message: "Incorrect password." },
        { status: 401 }
      );
    }

    const token = crypto.randomUUID();

    await env.DB.prepare(
      "CREATE TABLE IF NOT EXISTS owner_sessions (token_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL)"
    ).run();

    const tokenHash = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(token)
    );

    const hash = Array.from(new Uint8Array(tokenHash))
      .map(byte => byte.toString(16).padStart(2, "0"))
      .join("");

    const expiresAt = Date.now() + 8 * 60 * 60 * 1000;

    await env.DB.prepare(
      "INSERT INTO owner_sessions (token_hash, expires_at) VALUES (?, ?)"
    ).bind(hash, expiresAt).run();

    return Response.json(
      { success: true, message: "Login successful." },
      {
        headers: {
          "Set-Cookie": `owner_session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age=28800`,
          "Cache-Control": "no-store"
        }
      }
    );
  } catch {
    return Response.json(
      { success: false, message: "Login could not be completed." },
      { status: 500 }
    );
  }
}
