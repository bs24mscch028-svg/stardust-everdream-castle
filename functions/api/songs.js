export async function onRequestGet(context) {
  try {
    const result = await context.env.DB.prepare(
      `SELECT id, title, artist, song_url, note, created_at
       FROM songs
       ORDER BY id DESC`
    ).all();

    return Response.json({
      success: true,
      songs: result.results
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        message: "Unable to load songs."
      },
      { status: 500 }
    );
  }
}
