import { type NextRequest, NextResponse } from "next/server"
import { createSign } from "crypto"
import JSZip from "jszip"

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
    const errorText = await response.text()
    throw new Error(`Failed to get token: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  return data.access_token
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const folderId = searchParams.get("folderId")

    if (!folderId) {
      return NextResponse.json({ error: "Folder ID required" }, { status: 400 })
    }

    // Get service account token
    const token = await getServiceAccountToken()

    // Get all files in the folder
    const mediaQuery = `'${folderId}' in parents and trashed = false and (mimeType contains 'image/' or mimeType contains 'video/')`

    const filesResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(mediaQuery)}&pageSize=1000&fields=files(id,name,mimeType)&supportsAllDrives=true`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )

    if (!filesResponse.ok) {
      throw new Error("Failed to fetch files")
    }

    const filesData = await filesResponse.json()
    const files = filesData.files || []

    if (files.length === 0) {
      return NextResponse.json({ error: "No files in folder" }, { status: 404 })
    }

    // Create zip file
    const zip = new JSZip()

    // Download each file and add to zip
    for (const file of files) {
      try {
        const fileUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&supportsAllDrives=true`
        const fileResponse = await fetch(fileUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (fileResponse.ok) {
          const fileBlob = await fileResponse.arrayBuffer()
          zip.file(file.name, fileBlob)
        }
      } catch (err) {
        console.error(`Failed to download file ${file.name}:`, err)
      }
    }

    // Generate zip
    const zipBlob = await zip.generateAsync({ type: "nodebuffer" })

    // Return zip file
    return new NextResponse(zipBlob, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": "attachment; filename=photos.zip",
      },
    })
  } catch (error) {
    console.error("Download folder error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Download failed" },
      { status: 500 },
    )
  }
}

