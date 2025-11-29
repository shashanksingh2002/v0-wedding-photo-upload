import { getGoogleAuthUrl } from "@/lib/google-drive"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const authUrl = await getGoogleAuthUrl()
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error("Auth error:", error)
    return NextResponse.json({ error: "Failed to initiate authentication" }, { status: 500 })
  }
}
