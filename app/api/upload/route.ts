import { createFolder, uploadFile, listFilesInFolder } from "@/lib/google-drive"
import { type NextRequest, NextResponse } from "next/server"

const WEDDING_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const accessToken = authHeader.replace("Bearer ", "")
    const formData = await request.formData()
    const name = formData.get("name") as string
    const files = formData.getAll("files") as File[]

    if (!name || !files.length) {
      return NextResponse.json({ error: "Name and files are required" }, { status: 400 })
    }

    // Create user folder in the wedding folder
    let userFolder = await listFilesInFolder(accessToken, WEDDING_FOLDER_ID!)
    userFolder = userFolder.find((f: any) => f.name === name && f.mimeType === "application/vnd.google-apps.folder")

    let userFolderId = userFolder?.id

    if (!userFolderId) {
      const newFolder = await createFolder(accessToken, name, WEDDING_FOLDER_ID)
      userFolderId = newFolder.id
    }

    // Upload files to user's folder
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer())
      await uploadFile(accessToken, buffer, file.name, userFolderId)
    }

    return NextResponse.json({
      success: true,
      message: "Files uploaded successfully",
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed" }, { status: 500 })
  }
}
