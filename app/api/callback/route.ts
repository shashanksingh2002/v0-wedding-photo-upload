import { exchangeCodeForToken, getUserProfile } from "@/lib/google-drive"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get("code")

    if (!code) {
      return NextResponse.redirect(new URL("/?error=no_code", request.url))
    }

    const tokenData = await exchangeCodeForToken(code)
    const userProfile = await getUserProfile(tokenData.access_token)

    // Redirect to upload page with access token
    const uploadUrl = new URL("/upload", request.url)
    uploadUrl.searchParams.set("access_token", tokenData.access_token)
    uploadUrl.searchParams.set("user_id", userProfile.id)
    uploadUrl.searchParams.set("user_email", userProfile.email)

    return NextResponse.redirect(uploadUrl)
  } catch (error) {
    console.error("Callback error:", error)
    return NextResponse.redirect(new URL("/?error=auth_failed", request.url))
  }
}
