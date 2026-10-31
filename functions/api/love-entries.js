export async function onRequestPost({ request, env }) {
  try {
    const data = await request.json();

    const allowedCategories = [
      "flowers",
      "films",
      "stories",
      "moments"
    ];

    const category = String(data.category || "");
    const title = String(data.title || "").trim();
    const content = String(data.content || "").trim();

    if (!allowedCategories.includes(category)) {
      return Response.json(
        { success: false, message: "Please choose a valid category." },
        { status: 400 }
      );
    }

    if (!title && !content) {
      return Response.json(
        { success: false, message: "Please enter something to save." },
        { status: 400 }
      );
    }

    if (title.length > 200 || content.length > 5000) {
      return Response.json(
        { success: false, message: "Your entry is too long." },
        { status: 400 }
      );
    }

    await env.DB.prepare(
      `INSERT INTO love_entries (category, title, content)
       VALUES (?, ?, ?)`
    )
      .bind(category, title, content)
      .run();

    return Response.json({
      success: true,
      message: "Your little memory has been saved! ✨"
    });
  } catch (error) {
    return Response.json(
      { success: false, message: "Could not save your entry. Please try again." },
      { status: 500 }
    );
  }
}
