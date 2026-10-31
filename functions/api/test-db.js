export async function onRequest(context) {
  try {
    const result = await context.env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"
    ).all();

    return new Response(
      JSON.stringify({
        success: true,
        message: "Stardust Everdream Castle database connected!",
        tables: result.results
      }),
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        message: "Database connection failed."
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }
}
