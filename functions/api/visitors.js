// Stardust Everdream Castle — Visitor Counter

export async function onRequestGet({ env }) {
  try {
    const result = await env.DB.prepare(
      "SELECT COUNT(*) AS total FROM castle_visits"
    ).first();

    return Response.json(
      {
        success: true,
        total: Number(result?.total || 0)
      },
      {
        headers: { "Cache-Control": "no-store" }
      }
    );
  } catch (error) {
    return Response.json(
      {
        success: false,
        message: "Could not retrieve the visitor count."
      },
      { status: 500 }
    );
  }
}

export async function onRequestPost({ env }) {
  try {
    await env.DB.prepare(
      "INSERT INTO castle_visits DEFAULT VALUES"
    ).run();

    const result = await env.DB.prepare(
      "SELECT COUNT(*) AS total FROM castle_visits"
    ).first();

    return Response.json(
      {
        success: true,
        total: Number(result?.total || 0)
      },
      {
        headers: { "Cache-Control": "no-store" }
      }
    );
  } catch (error) {
    return Response.json(
      {
        success: false,
        message: "Could not record this visit."
      },
      { status: 500 }
    );
  }
}
