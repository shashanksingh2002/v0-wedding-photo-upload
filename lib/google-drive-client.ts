/**
 * Client-side Google Drive upload utilities
 * These functions run in the browser and upload files directly to Google Drive
 */

interface UploadProgress {
  fileName: string
  progress: number
  status: "pending" | "uploading" | "completed" | "error"
  error?: string
}

/**
 * Upload a single file directly to Google Drive using resumable upload
 */
export async function uploadFileToGoogleDrive(
  accessToken: string,
  file: File,
  folderId: string,
  onProgress?: (progress: number) => void,
): Promise<any> {
  try {
    // Step 1: Initiate resumable upload session
    const metadata = {
      name: file.name,
      parents: [folderId],
    }

    const initResponse = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(metadata),
      },
    )

    if (!initResponse.ok) {
      throw new Error(`Failed to initiate upload: ${initResponse.statusText}`)
    }

    const uploadUrl = initResponse.headers.get("Location")
    if (!uploadUrl) {
      throw new Error("No upload URL returned")
    }

    // Step 2: Upload the file content with progress tracking
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable && onProgress) {
          const progress = (e.loaded / e.total) * 100
          onProgress(progress)
        }
      })

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText)
            resolve(response)
          } catch {
            resolve(xhr.responseText)
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`))
        }
      })

      xhr.addEventListener("error", () => {
        reject(new Error("Network error during upload"))
      })

      xhr.addEventListener("abort", () => {
        reject(new Error("Upload aborted"))
      })

      xhr.open("PUT", uploadUrl)
      xhr.setRequestHeader("Content-Type", file.type)
      xhr.send(file)
    })
  } catch (error) {
    console.error("Error uploading file:", error)
    throw error
  }
}

/**
 * Upload multiple files to Google Drive with progress tracking
 */
export async function uploadMultipleFiles(
  accessToken: string,
  files: File[],
  folderId: string,
  onProgressUpdate?: (progressMap: Map<string, UploadProgress>) => void,
): Promise<{ success: boolean; results: any[]; errors: any[] }> {
  const progressMap = new Map<string, UploadProgress>()

  // Initialize progress tracking
  files.forEach((file) => {
    progressMap.set(file.name, {
      fileName: file.name,
      progress: 0,
      status: "pending",
    })
  })

  if (onProgressUpdate) {
    onProgressUpdate(new Map(progressMap))
  }

  const results: any[] = []
  const errors: any[] = []

  // Upload files sequentially to avoid overwhelming the browser
  for (const file of files) {
    try {
      // Update status to uploading
      progressMap.set(file.name, {
        ...progressMap.get(file.name)!,
        status: "uploading",
      })
      if (onProgressUpdate) {
        onProgressUpdate(new Map(progressMap))
      }

      // Upload the file
      const result = await uploadFileToGoogleDrive(accessToken, file, folderId, (progress) => {
        progressMap.set(file.name, {
          fileName: file.name,
          progress,
          status: "uploading",
        })
        if (onProgressUpdate) {
          onProgressUpdate(new Map(progressMap))
        }
      })

      // Mark as completed
      progressMap.set(file.name, {
        fileName: file.name,
        progress: 100,
        status: "completed",
      })
      if (onProgressUpdate) {
        onProgressUpdate(new Map(progressMap))
      }

      results.push(result)
    } catch (error) {
      // Mark as error
      const errorMessage = error instanceof Error ? error.message : "Upload failed"
      progressMap.set(file.name, {
        fileName: file.name,
        progress: 0,
        status: "error",
        error: errorMessage,
      })
      if (onProgressUpdate) {
        onProgressUpdate(new Map(progressMap))
      }

      errors.push({ file: file.name, error: errorMessage })
    }
  }

  return {
    success: errors.length === 0,
    results,
    errors,
  }
}

/**
 * Get or create a user folder in Google Drive - directly from the client
 */
export async function getUserFolder(
  accessToken: string,
  userName: string,
  weddingFolderId: string,
): Promise<string> {
  if (!weddingFolderId) {
    throw new Error("Wedding folder ID not configured")
  }

  const WEDDING_FOLDER_ID = weddingFolderId

  // Check if user folder already exists
  const listResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files?q='${WEDDING_FOLDER_ID}'+in+parents+and+trashed=false&spaces=drive&pageSize=1000&fields=files(id,name,mimeType)&supportsAllDrives=true`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  )

  if (!listResponse.ok) {
    throw new Error("Failed to list folders")
  }

  const listData = await listResponse.json()
  const files = listData.files || []

  // Find existing user folder
  const existingFolder = files.find(
    (f: any) => f.name === userName && f.mimeType === "application/vnd.google-apps.folder",
  )

  if (existingFolder) {
    return existingFolder.id
  }

  // Create new folder if it doesn't exist
  const metadata = {
    name: userName,
    mimeType: "application/vnd.google-apps.folder",
    parents: [WEDDING_FOLDER_ID],
  }

  const createResponse = await fetch("https://www.googleapis.com/drive/v3/files?supportsAllDrives=true", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(metadata),
  })

  if (!createResponse.ok) {
    throw new Error("Failed to create folder")
  }

  const newFolder = await createResponse.json()
  return newFolder.id
}

