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
const defaultTheme = {
  name: "Lavender Galaxy",
  background: "#f6f0ff",
  surface: "#ffffff",
  accent: "#9b7ede",
  accent2: "#e8b8e8",
  text: "#35264b"
};

// Visitors can read the current theme.
export async function onRequestGet({ env }) {
  try {
    const row = await env.DB.prepare(
      "SELECT setting_value FROM site_settings WHERE setting_key = 'theme'"
    ).first();

    let theme = defaultTheme;

    if (row) {
      try {
        theme = { ...defaultTheme, ...JSON.parse(row.setting_value) };
      } catch {
        theme = defaultTheme;
      }
    }

    return Response.json(
      { success: true, theme },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return Response.json(
      { success: false, message: "Could not load the website theme." },
      { status: 500 }
    );
  }
}

// Only the logged-in owner can change the website-wide theme.
export async function onRequestPost({ request, env }) {
  try {
    if (!(await verifyOwner(request, env))) {
      return Response.json(
        { success: false, message: "Owner login required." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const theme = body.theme;

    if (!theme || typeof theme !== "object" || Array.isArray(theme)) {
      return Response.json(
        { success: false, message: "Invalid theme settings." },
        { status: 400 }
      );
    }

    const fields = ["background", "surface", "accent", "accent2", "text"];

    for (const field of fields) {
      if (
        typeof theme[field] !== "string" ||
        !/^#[0-9a-fA-F]{6}$/.test(theme[field])
      ) {
        return Response.json(
          { success: false, message: "Please choose valid colours." },
          { status: 400 }
        );
      }
    }

    const name =
      typeof theme.name === "string"
        ? theme.name.trim().slice(0, 60)
        : "Custom Theme";

    const safeTheme = {
      name: name || "Custom Theme",
      background: theme.background,
      surface: theme.surface,
      accent: theme.accent,
      accent2: theme.accent2,
      text: theme.text
    };

    await env.DB.prepare(`
      INSERT INTO site_settings (setting_key, setting_value, updated_at)
      VALUES ('theme', ?, CURRENT_TIMESTAMP)
      ON CONFLICT(setting_key) DO UPDATE SET
        setting_value = excluded.setting_value,
        updated_at = CURRENT_TIMESTAMP
    `).bind(JSON.stringify(safeTheme)).run();

    return Response.json({
      success: true,
      message: "Your castle's theme has been updated! ✨",
      theme: safeTheme
    });
  } catch {
    return Response.json(
      { success: false, message: "Could not save the website theme." },
      { status: 500 }
    );
  }
}
