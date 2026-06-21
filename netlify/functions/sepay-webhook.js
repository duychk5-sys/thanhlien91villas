exports.handler = async (event) => {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const data = JSON.parse(event.body);

        // Gửi sang Google Sheet
        const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwSKXfOS23CyNYjZ3P6329D91NGXuTFNxJso1PsAlCCuFcogv8zogrsXo6ia9lIHa4w/exec";

        await fetch(APPS_SCRIPT_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true })
        };
    } catch (err) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: err.message })
        };
    }
};