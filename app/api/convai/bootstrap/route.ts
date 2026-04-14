import { NextResponse } from "next/server";
import { getConvaiBootstrap } from "@/lib/convai-bootstrap";

export const dynamic = "force-dynamic";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

export async function GET() {
  const { status, body } = await getConvaiBootstrap(process.env);
  return NextResponse.json(body, { status, headers: cors });
}
