import { type NextRequest, NextResponse } from "next/server"
import { createSign } from "crypto"

const WEDDING_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID
const SERVICE_ACCOUNT_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY

async function getServiceAccountToken() {
  if (!SERVICE_ACCOUNT_KEY) {
    throw new Error("SERVICE_ACCOUNT_KEY environment variable not set")
  }

  try {
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

    // Sign with RS256 using the private key
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
      console.error("[v0] Token response error:", errorText)
      throw new Error(`Failed to get token: ${response.status}`)
    }

    const data = await response.json()
    console.log("[v0] Service account token obtained successfully")
    return data.access_token
  } catch (error) {
    console.error("[v0] Service account error:", error)
    throw error
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] Gallery API called")

    if (!WEDDING_FOLDER_ID) {
      console.error("[v0] GOOGLE_DRIVE_FOLDER_ID not set")
      return NextResponse.json(
        {
          files: [],
          error: "Wedding folder not configured",
        },
        { status: 400 },
      )
    }

    if (!SERVICE_ACCOUNT_KEY) {
      console.error("[v0] SERVICE_ACCOUNT_KEY not set")
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
    console.log("[v0] Got token, fetching files from folder:", WEDDING_FOLDER_ID)

    if (!token) {
      throw new Error("No token received")
    }

    // First, get all subfolders (user folders)
    const foldersQuery = `'${WEDDING_FOLDER_ID}' in parents and trashed = false and mimeType = 'application/vnd.google-apps.folder'`
    
    const foldersResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(foldersQuery)}&fields=files(id,name)&supportsAllDrives=true`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )

    if (!foldersResponse.ok) {
      const errorText = await foldersResponse.text()
      console.error("[v0] Folders API error:", errorText)
      throw new Error(`Folders API error: ${foldersResponse.status}`)
    }

    const foldersData = await foldersResponse.json()
    const userFolders = foldersData.files || []

    console.log(`[v0] Found ${userFolders.length} user folders`)

    // Now get all media files from each user folder
    const allFiles: any[] = []
    
    for (const folder of userFolders) {
      const mediaQuery = `'${folder.id}' in parents and trashed = false and (mimeType contains 'image/' or mimeType contains 'video/')`
      
      const mediaResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(mediaQuery)}&pageSize=1000&fields=files(id,name,webContentLink,mimeType,createdTime,size)&orderBy=createdTime%20desc&supportsAllDrives=true`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      if (mediaResponse.ok) {
        const mediaData = await mediaResponse.json()
        const filesWithUser = (mediaData.files || []).map((file: any) => ({
          ...file,
          uploaderName: folder.name, // Add the user folder name
        }))
        allFiles.push(...filesWithUser)
      }
    }

    const files = allFiles
    console.log(`[v0] Found ${files.length} total media files across all user folders`)

    return NextResponse.json({
      files: files.map((file: any) => ({
        id: file.id,
        name: file.name,
        webContentLink: file.webContentLink,
        mimeType: file.mimeType,
        createdTime: file.createdTime,
        uploaderName: file.uploaderName, // Include who uploaded it
        thumbnailLink: `https://drive-thumnails.googleusercontent.com/d/${file.id}=w320-h320`,
      })),
    })
  } catch (error) {
    console.error("[v0] Gallery error:", error)
    return NextResponse.json(
      {
        files: [],
        error: error instanceof Error ? error.message : "Failed to fetch gallery",
      },
      { status: 500 },
    )
  }
}
