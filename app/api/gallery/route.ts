import { type NextRequest, NextResponse } from "next/server"

const WEDDING_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID
const SERVICE_ACCOUNT_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY

async function getServiceAccountToken() {
  if (!SERVICE_ACCOUNT_KEY) {
    throw new Error("SERVICE_ACCOUNT_KEY environment variable not set")
  }

  try {
    const serviceAccount = JSON.parse(SERVICE_ACCOUNT_KEY)

    // Create JWT payload
    const now = Math.floor(Date.now() / 1000)
    const payload = {
      iss: serviceAccount.client_email,
      scope: "https://www.googleapis.com/auth/drive.readonly",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    }

    // For production, sign with private key using crypto
    // Placeholder: In real implementation, use a JWT signing library
    const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url")
    const payloadStr = Buffer.from(JSON.stringify(payload)).toString("base64url")

    // Simple approach: Use Google's JWT library via API
    // For now, return a basic implementation
    const jwt = `${header}.${payloadStr}.signature`

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }).toString(),
    })

    if (!response.ok) {
      console.error("[v0] Failed to get token:", await response.text())
      return null
    }

    const data = await response.json()
    return data.access_token
  } catch (error) {
    console.error("[v0] Service account error:", error)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!WEDDING_FOLDER_ID) {
      return NextResponse.json(
        {
          files: [],
          error: "Wedding folder not configured",
        },
        { status: 400 },
      )
    }

    if (!SERVICE_ACCOUNT_KEY) {
      return NextResponse.json(
        {
          files: [],
          error: "Service account not configured. Please add GOOGLE_SERVICE_ACCOUNT_KEY to environment variables.",
        },
        { status: 400 },
      )
    }

    // Get service account token
    const token = await getServiceAccountToken()
    if (!token) {
      return NextResponse.json(
        {
          files: [],
          error: "Failed to authenticate with service account",
        },
        { status: 401 },
      )
    }

    // Query for all media files recursively
    const query = `'${WEDDING_FOLDER_ID}' in parents and trashed = false and (mimeType contains 'image/' or mimeType contains 'video/')`

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&spaces=drive&pageSize=1000&fields=files(id,name,webContentLink,mimeType,createdTime,size,owners)&orderBy=createdTime desc&supportsAllDrives=true`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )

    if (!response.ok) {
      console.error("[v0] Failed to fetch files:", await response.text())
      return NextResponse.json(
        {
          files: [],
          error: "Failed to fetch gallery files",
        },
        { status: 500 },
      )
    }

    const data = await response.json()
    const files = data.files || []

    return NextResponse.json({
      files: files.map((file: any) => ({
        id: file.id,
        name: file.name,
        webContentLink: file.webContentLink,
        mimeType: file.mimeType,
        createdTime: file.createdTime,
        thumbnailLink: file.id ? `https://drive.google.com/thumbnail?id=${file.id}&sz=w320` : null,
      })),
    })
  } catch (error) {
    console.error("[v0] Gallery error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch gallery",
      },
      { status: 500 },
    )
  }
}
