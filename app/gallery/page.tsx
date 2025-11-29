"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Loader2 } from "lucide-react"
import { GalleryGrid } from "@/components/gallery-grid"

export default function GalleryPage() {
  const [files, setFiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchGallery()
  }, [])

  const fetchGallery = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/gallery")
      if (!response.ok) {
        throw new Error("Failed to fetch gallery")
      }
      const data = await response.json()
      setFiles(data.files || [])
      setError(null)
    } catch (err) {
      console.error("Gallery error:", err)
      setError(err instanceof Error ? err.message : "Failed to load gallery")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 to-amber-100">
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-amber-700 hover:text-amber-900">
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </Link>
          <h1 className="text-2xl font-bold text-amber-900">Wedding Gallery</h1>
          <div className="w-20"></div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-amber-700 mx-auto mb-4" />
              <p className="text-amber-700">Loading gallery...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border-l-4 border-red-600 p-6 rounded">
            <p className="text-red-700 font-semibold mb-2">Error Loading Gallery</p>
            <p className="text-red-600">{error}</p>
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-amber-700 text-lg mb-4">No photos yet. Be the first to share!</p>
            <Link href="/" className="inline-block px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">
              Start Uploading
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <p className="text-amber-700">
                <span className="font-semibold">{files.length}</span> photos and videos
              </p>
            </div>
            <GalleryGrid files={files} />
          </>
        )}
      </div>
    </main>
  )
}
