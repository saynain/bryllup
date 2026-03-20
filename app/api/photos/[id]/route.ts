import { NextRequest, NextResponse } from "next/server";
import { getStorageProvider } from "@/lib/storage";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/photos/[id] - Get single photo
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const storage = getStorageProvider();
    const photo = await storage.get(decodeURIComponent(id));

    if (!photo) {
      return NextResponse.json(
        { error: "Bildet ble ikke funnet" },
        { status: 404 }
      );
    }

    return NextResponse.json(photo);
  } catch (error) {
    console.error("Error getting photo:", error);
    return NextResponse.json(
      { error: "Kunne ikke hente bildet" },
      { status: 500 }
    );
  }
}

// DELETE /api/photos/[id] - Delete photo
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const storage = getStorageProvider();
    const success = await storage.delete(decodeURIComponent(id));

    if (!success) {
      return NextResponse.json(
        { error: "Kunne ikke slette bildet" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting photo:", error);
    return NextResponse.json(
      { error: "Kunne ikke slette bildet" },
      { status: 500 }
    );
  }
}
