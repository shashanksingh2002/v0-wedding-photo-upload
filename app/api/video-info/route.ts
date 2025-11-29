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

    if (!fileId) {
      return NextResponse.json({ error: "File ID required" }, { status: 400 })
    }

    const token = await getServiceAccountToken()

    // Get detailed file info
    const fileUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,size,videoMediaMetadata,permissions,capabilities&supportsAllDrives=true`
    
    const response = await fetch(fileUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch file info: ${response.status}`)
    }

    const fileInfo = await response.json()

    // Calculate size in MB
    const sizeInMB = fileInfo.size ? (parseInt(fileInfo.size) / 1024 / 1024).toFixed(2) : 'Unknown'

    return NextResponse.json({
      id: fileInfo.id,
      name: fileInfo.name,
      mimeType: fileInfo.mimeType,
      size: fileInfo.size,
      sizeInMB: `${sizeInMB} MB`,
      videoMetadata: fileInfo.videoMediaMetadata,
      canDownload: fileInfo.capabilities?.canDownload,
      canCopy: fileInfo.capabilities?.canCopy,
      permissions: fileInfo.permissions,
      diagnosis: {
        tooLarge: parseInt(fileInfo.size || '0') > 100 * 1024 * 1024, // > 100MB
        supportsPreview: fileInfo.mimeType?.includes('video/mp4') || fileInfo.mimeType?.includes('video/quicktime'),
        recommendation: parseInt(fileInfo.size || '0') > 100 * 1024 * 1024 
          ? 'File is too large for preview. Provide direct download instead.'
          : 'File should work with preview.',
      },
    })
  } catch (error) {
    console.error("Video info error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch video info" },
      { status: 500 },
    )
  }
}

