import { NextRequest, NextResponse } from "next/server";
import { getStorageProvider } from "@/lib/storage";

// Allowed image types
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

// Max file size: 10MB
const MAX_SIZE = 10 * 1024 * 1024;

// GET /api/photos - List all photos
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50");
    const cursor = searchParams.get("cursor") || undefined;

    const storage = getStorageProvider();
    const result = await storage.list({ limit, cursor });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error listing photos:", error);
    return NextResponse.json(
      { error: "Kunne ikke hente bilder" },
      { status: 500 }
    );
  }
}

// POST /api/photos - Upload a new photo
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const uploadedBy = formData.get("uploadedBy") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "Ingen fil valgt" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            "Ugyldig filtype. Kun JPEG, PNG, WebP og HEIC er tillatt.",
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Filen er for stor. Maks størrelse er 10MB." },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    const storage = getStorageProvider();

    const result = await storage.upload({
      file: buffer,
      filename: file.name,
      mimeType: file.type,
      uploadedBy: uploadedBy || undefined,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Opplasting feilet" },
        { status: 500 }
      );
    }

    return NextResponse.json(result.photo, { status: 201 });
  } catch (error) {
    console.error("Error uploading photo:", error);
    return NextResponse.json(
      { error: "Kunne ikke laste opp bildet" },
      { status: 500 }
    );
  }
}
