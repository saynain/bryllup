import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, attending, guests, dietaryRestrictions } = body;

    // Validate required fields
    if (!name || !attending) {
      return NextResponse.json(
        { error: "Name and attending status are required" },
        { status: 400 }
      );
    }

    // Validate environment variables
    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY;
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    if (!serviceAccountEmail || !privateKey || !spreadsheetId) {
      console.error("Missing required environment variables:", {
        hasEmail: !!serviceAccountEmail,
        hasKey: !!privateKey,
        hasSheetId: !!spreadsheetId,
      });
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Format the private key - handle both escaped newlines and actual newlines
    let formattedKey = privateKey;

    // If the key contains literal \n strings, replace them with actual newlines
    if (formattedKey.includes('\\n')) {
      formattedKey = formattedKey.replace(/\\n/g, '\n');
    }

    // Remove any surrounding quotes that might have been added
    formattedKey = formattedKey.replace(/^["']|["']$/g, '');

    // Set up Google Sheets API authentication
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: serviceAccountEmail,
        private_key: formattedKey,
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // Prepare the row data
    const timestamp = new Date().toLocaleString("nb-NO", {
      timeZone: "Europe/Oslo",
    });

    const rowData = [
      timestamp,
      name,
      attending === "yes" ? "Ja" : "Nei",
      attending === "yes" ? guests || "" : "",
      attending === "yes" ? dietaryRestrictions || "" : "",
    ];

    // Append the data to the sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "RSVP!A:E", // Adjust range if your columns are different
      valueInputOption: "RAW",
      requestBody: {
        values: [rowData],
      },
    });

    return NextResponse.json(
      { message: "RSVP submitted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error submitting RSVP:", error);
    return NextResponse.json(
      { error: "Failed to submit RSVP. Please try again." },
      { status: 500 }
    );
  }
}
