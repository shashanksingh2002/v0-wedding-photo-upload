import { type NextRequest, NextResponse } from "next/server"
import { createSign } from "crypto"

const WEDDING_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID
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
  const debugInfo: any = {
    timestamp: new Date().toISOString(),
    checks: [],
  }

  try {
    // Check 1: Environment variables
    debugInfo.checks.push({
      name: "Environment Variables",
      folderId: WEDDING_FOLDER_ID || "❌ NOT SET",
      serviceAccountConfigured: !!SERVICE_ACCOUNT_KEY,
    })

    if (!SERVICE_ACCOUNT_KEY) {
      return NextResponse.json({
        ...debugInfo,
        error: "SERVICE_ACCOUNT_KEY not set",
      })
    }

    // Check 2: Parse service account
    const serviceAccount = JSON.parse(SERVICE_ACCOUNT_KEY)
    debugInfo.checks.push({
      name: "Service Account Parsed",
      email: serviceAccount.client_email,
      projectId: serviceAccount.project_id,
    })

    // Check 3: Get token
    const token = await getServiceAccountToken()
    debugInfo.checks.push({
      name: "Token Generation",
      status: "✅ Success",
      tokenPreview: token.substring(0, 20) + "...",
    })

    // Check 4: Test folder metadata access
    const folderResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${WEDDING_FOLDER_ID}?fields=id,name,owners,permissions,capabilities&supportsAllDrives=true`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )

    if (!folderResponse.ok) {
      const errorText = await folderResponse.text()
      debugInfo.checks.push({
        name: "Folder Metadata Access",
        status: `❌ FAILED (${folderResponse.status})`,
        error: errorText,
        suggestion: "The service account doesn't have permission to access this folder. Make sure you shared the folder with the service account email.",
      })
      return NextResponse.json(debugInfo)
    }

    const folderData = await folderResponse.json()
    debugInfo.checks.push({
      name: "Folder Metadata Access",
      status: "✅ Success",
      folderName: folderData.name,
      canRead: folderData.capabilities?.canRead,
      canListChildren: folderData.capabilities?.canListChildren,
    })

    // Check 5: List files in folder
    const filesResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q='${WEDDING_FOLDER_ID}'+in+parents+and+trashed=false&pageSize=10&fields=files(id,name,mimeType)&supportsAllDrives=true`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )

    if (!filesResponse.ok) {
      const errorText = await filesResponse.text()
      debugInfo.checks.push({
        name: "List Files",
        status: `❌ FAILED (${filesResponse.status})`,
        error: errorText,
      })
      return NextResponse.json(debugInfo)
    }

    const filesData = await filesResponse.json()
    debugInfo.checks.push({
      name: "List Files",
      status: "✅ Success",
      fileCount: filesData.files?.length || 0,
      sampleFiles: filesData.files?.slice(0, 3).map((f: any) => ({ name: f.name, type: f.mimeType })),
    })

    // Final summary
    debugInfo.summary = "✅ All checks passed! Service account has proper access."

    return NextResponse.json(debugInfo)
  } catch (error) {
    debugInfo.error = error instanceof Error ? error.message : "Unknown error"
    debugInfo.summary = "❌ Test failed - see error above"
    return NextResponse.json(debugInfo, { status: 500 })
  }
}

