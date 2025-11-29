"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Upload, ArrowLeft, Loader2, Check, X } from "lucide-react"

export default function UploadPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [name, setName] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const accessToken = searchParams.get("access_token")
    if (!accessToken) {
      router.push("/")
    }
  }, [searchParams, router])

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
      const formData = new FormData()
      formData.append("name", name)
      files.forEach((file) => {
        formData.append("files", file)
      })

      const accessToken = searchParams.get("access_token")
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Upload failed")
      }

      setSuccess(true)
      setName("")
      setFiles([])

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
        <div className="max-w-2xl mx-auto px-4 py-4">
          <Link href="/" className="inline-flex items-center gap-2 text-amber-700 hover:text-amber-900">
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </Link>
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
              <p className="text-xs text-amber-600 mt-1">Your name will be used to organize your uploads</p>
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
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-amber-50 p-3 rounded border border-amber-200"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-amber-900 truncate">{file.name}</p>
                        <p className="text-xs text-amber-600">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
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
                  ))}
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
