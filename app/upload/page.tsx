"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Upload, ArrowLeft, Loader2, Check, X, LogOut } from "lucide-react"
import { getUserFolder, uploadMultipleFiles } from "@/lib/google-drive-client"
import { WEDDING_FOLDER_ID } from "@/lib/config"

interface FileProgress {
  fileName: string
  progress: number
  status: "pending" | "uploading" | "completed" | "error"
  error?: string
}

export default function UploadPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [name, setName] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<Map<string, FileProgress>>(new Map())

  useEffect(() => {
    // Check for token in URL params (from OAuth callback)
    const accessToken = searchParams.get("access_token")
    const userName = searchParams.get("user_name")
    
    if (accessToken) {
      // Store token in localStorage for future use
      localStorage.setItem("google_access_token", accessToken)
      if (userName) {
        localStorage.setItem("user_name", userName)
      }
    }

    // Check if we have a stored token
    const storedToken = localStorage.getItem("google_access_token")
    if (!accessToken && !storedToken) {
      // No token available, redirect to home
      router.push("/")
      return
    }

    // Auto-populate name from URL or localStorage
    const savedName = userName || localStorage.getItem("user_name")
    if (savedName && !name) {
      setName(savedName)
    }
  }, [searchParams, router, name])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      const validFiles = selectedFiles.filter((file) => {
        const isValidType = file.type.startsWith("image/") || file.type.startsWith("video/")
        if (!isValidType) {
          setError(`${file.name} is not a valid image or video`)
          return false
        }
        return true
      })
      setFiles((prev) => [...prev, ...validFiles])
      setError(null)
    }
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSignOut = () => {
    localStorage.removeItem("google_access_token")
    localStorage.removeItem("user_name")
    router.push("/")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      setError("Please enter your name")
      return
    }

    if (files.length === 0) {
      setError("Please select at least one file")
      return
    }

    setUploading(true)
    setError(null)

    try {
      // Get token from URL params or localStorage
      const accessToken = searchParams.get("access_token") || localStorage.getItem("google_access_token")
      if (!accessToken) {
        throw new Error("No access token found. Please sign in again.")
      }

      if (!WEDDING_FOLDER_ID) {
        throw new Error("Wedding folder not configured. Please contact administrator.")
      }

      // Get or create user folder
      const folderId = await getUserFolder(accessToken, name.trim(), WEDDING_FOLDER_ID)

      // Upload files directly to Google Drive
      const result = await uploadMultipleFiles(accessToken, files, folderId, (progressMap) => {
        setUploadProgress(new Map(progressMap))
      })

      if (!result.success) {
        const errorMsg = result.errors.map((e) => `${e.file}: ${e.error}`).join(", ")
        throw new Error(`Some uploads failed: ${errorMsg}`)
      }

      setSuccess(true)
      setName("")
      setFiles([])
      setUploadProgress(new Map())

      setTimeout(() => {
        router.push("/gallery")
      }, 2000)
    } catch (err) {
      console.error("Upload error:", err)
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 to-amber-100">
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-amber-700 hover:text-amber-900">
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </Link>
          <button
            onClick={handleSignOut}
            className="inline-flex items-center gap-2 text-red-600 hover:text-red-800 text-sm"
            title="Sign out and use a different account"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-8 pb-20">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-amber-900 mb-2">Upload Your Photos</h1>
          <p className="text-amber-700 mb-8">Share your special moments from the wedding</p>

          {success && (
            <div className="mb-6 bg-green-50 border-l-4 border-green-600 p-4 rounded flex items-start gap-3">
              <Check className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-green-900">Upload successful!</p>
                <p className="text-green-800 text-sm">Redirecting to gallery...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-600 p-4 rounded flex items-start gap-3">
              <X className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900">Error</p>
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Input */}
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-amber-900 mb-2">
                Your Name *
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Ravi Sharma"
                className="w-full px-4 py-3 border-2 border-amber-200 rounded-lg focus:border-amber-600 focus:outline-none text-amber-900 placeholder-amber-400"
                disabled={uploading}
              />
              <p className="text-xs text-amber-600 mt-1">
                {searchParams.get("user_name") || localStorage.getItem("user_name")
                  ? "Auto-filled from your Google account. You can edit if needed."
                  : "Your name will be used to organize your uploads"}
              </p>
            </div>

            {/* File Input */}
            <div>
              <label htmlFor="files" className="block text-sm font-semibold text-amber-900 mb-2">
                Select Photos & Videos *
              </label>
              <div className="border-2 border-dashed border-amber-300 rounded-lg p-6 text-center cursor-pointer hover:border-amber-500 hover:bg-amber-50 transition">
                <input
                  type="file"
                  id="files"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={uploading}
                />
                <label htmlFor="files" className="cursor-pointer">
                  <Upload className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                  <p className="font-semibold text-amber-900">Click to select files or drag and drop</p>
                  <p className="text-sm text-amber-700 mt-1">Supports JPG, PNG, MP4, WebM, etc.</p>
                </label>
              </div>
            </div>

            {/* Selected Files */}
            {files.length > 0 && (
              <div>
                <h3 className="font-semibold text-amber-900 mb-3">Selected Files ({files.length})</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {files.map((file, index) => {
                    const progress = uploadProgress.get(file.name)
                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-amber-50 p-3 rounded border border-amber-200"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-amber-900 truncate">{file.name}</p>
                          <p className="text-xs text-amber-600">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                          {progress && progress.status !== "pending" && (
                            <div className="mt-1">
                              {progress.status === "uploading" && (
                                <>
                                  <div className="w-full bg-amber-200 rounded-full h-1.5">
                                    <div
                                      className="bg-amber-600 h-1.5 rounded-full transition-all duration-300"
                                      style={{ width: `${progress.progress}%` }}
                                    />
                                  </div>
                                  <p className="text-xs text-amber-700 mt-0.5">
                                    {Math.round(progress.progress)}% uploaded
                                  </p>
                                </>
                              )}
                              {progress.status === "completed" && (
                                <p className="text-xs text-green-600 flex items-center gap-1">
                                  <Check className="w-3 h-3" /> Uploaded successfully
                                </p>
                              )}
                              {progress.status === "error" && (
                                <p className="text-xs text-red-600 flex items-center gap-1">
                                  <X className="w-3 h-3" /> {progress.error}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          disabled={uploading}
                          className="ml-2 px-3 py-1 text-red-700 hover:bg-red-50 rounded text-sm font-medium disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={uploading || files.length === 0}
              className="w-full bg-gradient-to-r from-amber-600 to-amber-700 text-white font-bold py-3 rounded-lg hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {uploading && <Loader2 className="w-5 h-5 animate-spin" />}
              {uploading ? "Uploading..." : "Upload Files"}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
