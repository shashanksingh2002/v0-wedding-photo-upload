const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const REDIRECT_URI = process.env.REDIRECT_URI || "http://localhost:3000/api/callback"
const SERVICE_ACCOUNT_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY

export async function getGoogleAuthUrl() {
  // Use drive.file scope - ONLY files created by this app (NOT user's entire Drive!)
  // This is NOT a restricted scope - no verification needed, no scary warnings!
  // Users can ONLY access:
  //   - Files they upload through this app
  //   - The shared wedding folder (if shared with "Anyone with link can edit")
  const scopes = [
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/userinfo.profile"
  ]

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID!,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: scopes.join(" "),
    access_type: "offline",
    prompt: "consent",
  })

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

export async function exchangeCodeForToken(code: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID!,
      client_secret: GOOGLE_CLIENT_SECRET!,
      code,
      grant_type: "authorization_code",
      redirect_uri: REDIRECT_URI,
    }).toString(),
  })

  if (!response.ok) {
    throw new Error("Failed to exchange code for token")
  }

  return response.json()
}

export async function getUserProfile(accessToken: string) {
  const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error("Failed to get user profile")
  }

  return response.json()
}

export async function createFolder(accessToken: string, folderName: string, parentFolderId?: string) {
  const metadata = {
    name: folderName,
    mimeType: "application/vnd.google-apps.folder",
    ...(parentFolderId && { parents: [parentFolderId] }),
  }

  const response = await fetch("https://www.googleapis.com/drive/v3/files?supportsAllDrives=true", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(metadata),
  })

  if (!response.ok) {
    throw new Error("Failed to create folder")
  }

  return response.json()
}

export async function uploadFile(accessToken: string, file: Buffer, fileName: string, parentFolderId?: string) {
  const metadata = {
    name: fileName,
    ...(parentFolderId && { parents: [parentFolderId] }),
  }

  const formData = new FormData()
  formData.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }))
  formData.append("file", new Blob([file]), fileName)

  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    },
  )

  if (!response.ok) {
    throw new Error("Failed to upload file")
  }

  return response.json()
}

export async function listFilesInFolder(accessToken: string, folderId: string) {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&spaces=drive&pageSize=1000&fields=files(id,name,webContentLink,mimeType,createdTime)&supportsAllDrives=true`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  )

  if (!response.ok) {
    throw new Error("Failed to list files")
  }

  const data = await response.json()
  return data.files || []
}

export async function getServiceAccountToken() {
  if (!SERVICE_ACCOUNT_KEY) {
    throw new Error("SERVICE_ACCOUNT_KEY not configured")
  }

  try {
    const serviceAccount = JSON.parse(SERVICE_ACCOUNT_KEY)

    const payload = {
      iss: serviceAccount.client_email,
      scope: "https://www.googleapis.com/auth/drive.readonly",
      aud: "https://oauth2.googleapis.com/token",
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    }

    // For production, you'd sign this JWT with the private key
    // For now, we'll use a simpler approach with Google's service account
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: await signJWT(payload, serviceAccount.private_key),
      }).toString(),
    })

    if (!response.ok) {
      throw new Error("Failed to get service account token")
    }

    const data = await response.json()
    return data.access_token
  } catch (error) {
    console.error("Service account token error:", error)
    throw error
  }
}

// Helper to sign JWT (simplified - you may need a library like jsonwebtoken in production)
async function signJWT(payload: any, privateKey: string): Promise<string> {
  // Base64 encode header and payload
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url")
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url")
  const message = `${header}.${body}`

  // For simplicity in edge runtime, return a placeholder
  // In production, use jsonwebtoken library or crypto module
  return message + ".signature"
}

export async function getAllMediaFromDrive(accessToken: string, driveFolderId: string) {
  const query = `'${driveFolderId}' in parents and trashed = false and (mimeType contains 'image/' or mimeType contains 'video/')`

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&spaces=drive&pageSize=1000&fields=files(id,name,webContentLink,mimeType,createdTime,parents)&supportsAllDrives=true&corpora=allDrives`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  )

  if (!response.ok) {
    throw new Error("Failed to list media files")
  }

  const data = await response.json()
  return data.files || []
}

export async function getAllMediaRecursive(accessToken: string, folderId: string, mediaFiles: any[] = []) {
  const query = `'${folderId}' in parents and trashed = false`

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&spaces=drive&pageSize=1000&fields=files(id,name,webContentLink,mimeType,createdTime)&supportsAllDrives=true`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  )

  if (!response.ok) {
    throw new Error("Failed to list files")
  }

  const data = await response.json()
  const files = data.files || []

  for (const file of files) {
    if (file.mimeType === "application/vnd.google-apps.folder") {
      // Recursively get files from subfolders
      await getAllMediaRecursive(accessToken, file.id, mediaFiles)
    } else if (file.mimeType.includes("image/") || file.mimeType.includes("video/")) {
      mediaFiles.push(file)
    }
  }

  return mediaFiles
}
