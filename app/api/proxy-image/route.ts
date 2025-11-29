import { type NextRequest, NextResponse } from "next/server"
import { createSign } from "crypto"

const SERVICE_ACCOUNT_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY

async function getServiceAccountToken() {
  if (!SERVICE_ACCOUNT_KEY) {
    throw new Error("SERVICE_ACCOUNT_KEY environment variable not set")
  }

  const serviceAccount = JSON.parse(SERVICE_ACCOUNT_KEY)

  const header = {
    alg: "RS256",
    typ: "JWT",
    kid: serviceAccount.private_key_id,
  }

  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/drive.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  }

  const headerB64 = Buffer.from(JSON.stringify(header)).toString("base64url")
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url")
  const message = `${headerB64}.${payloadB64}`

  const signer = createSign("RSA-SHA256")
  signer.update(message)
  signer.end()
  const signature = signer.sign(serviceAccount.private_key, "base64url")

  const jwt = `${message}.${signature}`

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
    throw new Error("Failed to get token")
  }

  const data = await response.json()
  return data.access_token
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const fileId = searchParams.get("id")
    const size = searchParams.get("size") // 'thumb' for thumbnail, null for full

    if (!fileId) {
      return NextResponse.json({ error: "File ID required" }, { status: 400 })
    }

    // Get service account token
    const token = await getServiceAccountToken()

    let imageUrl: string
    
    if (size === "thumb") {
      // Get thumbnail using Drive API
      imageUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`
      // For thumbnails, we can also try the thumbnail link
      const metadataUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=thumbnailLink&supportsAllDrives=true`
      const metadataResponse = await fetch(metadataUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      
      if (metadataResponse.ok) {
        const metadata = await metadataResponse.json()
        if (metadata.thumbnailLink) {
          // Use Google's thumbnail
          const thumbResponse = await fetch(metadata.thumbnailLink)
          if (thumbResponse.ok) {
            const imageBuffer = await thumbResponse.arrayBuffer()
            return new NextResponse(imageBuffer, {
              headers: {
                "Content-Type": thumbResponse.headers.get("content-type") || "image/jpeg",
                "Cache-Control": "public, max-age=31536000, immutable",
              },
            })
          }
        }
      }
    }

    // Fetch full image/video
    imageUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`
    
    const imageResponse = await fetch(imageUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch file: ${imageResponse.status}`)
    }

    const imageBuffer = await imageResponse.arrayBuffer()
    const contentType = imageResponse.headers.get("content-type") || "image/jpeg"

    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch (error) {
    console.error("Proxy image error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch image" },
      { status: 500 },
    )
  }
}

