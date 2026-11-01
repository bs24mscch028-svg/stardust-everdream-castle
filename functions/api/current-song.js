async function hashToken(token) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token)
  );

  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function verifyOwner(request, env) {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(/(?:^|;\s*)owner_session=([^;]+)/);

  if (!match) return false;

  const tokenHash = await hashToken(match[1]);

  const session = await env.DB.prepare(
    "SELECT expires_at FROM owner_sessions WHERE token_hash = ?"
  ).bind(tokenHash).first();

  const rawExpiry = session?.expires_at;

  const expiry = typeof rawExpiry === "number"
    ? (rawExpiry < 1e12 ? rawExpiry * 1000 : rawExpiry)
    : Date.parse(rawExpiry);

  return Number.isFinite(expiry) && expiry > Date.now();
}

// Visitors can read the current song.
export async function onRequestGet({ env }) {
  try {
    const row = await env.DB.prepare(
      "SELECT setting_value FROM site_settings WHERE setting_key = 'current_song'"
    ).first();

    let song = null;

    if (row) {
      try {
        song = JSON.parse(row.setting_value);
      } catch {
        song = null;
      }
    }

    return Response.json(
      { success: true, song },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return Response.json(
      { success: false, message: "Could not load the current song." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

// Only the authenticated owner can change the current song.
export async function onRequestPost({ request, env }) {
  try {
    if (!(await verifyOwner(request, env))) {
      return Response.json(
        { success: false, message: "Owner login required." },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (!request.headers.get("Content-Type")?.includes("application/json")) {
      return Response.json(
        { success: false, message: "Invalid request format." },
        { status: 415 }
      );
    }

    const body = await request.json();
    const source = body.source;
    const url = typeof body.url === "string" ? body.url.trim() : "";

    if (!["youtube", "spotify", "audio"].includes(source)) {
      return Response.json(
        { success: false, message: "Choose YouTube, Spotify, or direct audio." },
        { status: 400 }
      );
    }

    if (!url || url.length > 2000) {
      return Response.json(
        { success: false, message: "Please enter a valid song link." },
        { status: 400 }
      );
    }

    let parsedUrl;

    try {
      parsedUrl = new URL(url);
    } catch {
      return Response.json(
        { success: false, message: "That song link is not valid." },
        { status: 400 }
      );
    }

    if (parsedUrl.protocol !== "https:") {
      return Response.json(
        { success: false, message: "Please use a secure HTTPS link." },
        { status: 400 }
      );
    }

    if (
      source === "youtube" &&
      !["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be"].includes(parsedUrl.hostname)
    ) {
      return Response.json(
        { success: false, message: "Please enter a YouTube song link." },
        { status: 400 }
      );
    }

    if (
      source === "spotify" &&
      !["open.spotify.com"].includes(parsedUrl.hostname)
    ) {
      return Response.json(
        { success: false, message: "Please enter a Spotify song link." },
        { status: 400 }
      );
    }

    const song = { source, url: parsedUrl.href };

    await env.DB.prepare(`
      INSERT INTO site_settings (setting_key, setting_value, updated_at)
      VALUES ('current_song', ?, CURRENT_TIMESTAMP)
      ON CONFLICT(setting_key) DO UPDATE SET
        setting_value = excluded.setting_value,
        updated_at = CURRENT_TIMESTAMP
    `).bind(JSON.stringify(song)).run();

    return Response.json(
      {
        success: true,
        song,
        message: "Your Castle's Heartbeat has been updated! 🎶💜"
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return Response.json(
      { success: false, message: "Could not save the current song." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
