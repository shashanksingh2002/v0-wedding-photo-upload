"use client"

import { useState } from "react"
import { Play, Download } from "lucide-react"

interface GalleryFile {
  id: string
  name: string
  mimeType: string
  createdTime: string
  uploaderName?: string
  thumbnailLink: string
  viewLink: string
  webViewLink?: string
}

interface GalleryGridProps {
  files: GalleryFile[]
}

export function GalleryGrid({ files }: GalleryGridProps) {
  const [selectedMedia, setSelectedMedia] = useState<GalleryFile | null>(null)
  const [videoError, setVideoError] = useState(false)

  const isVideo = (mimeType: string) => mimeType.startsWith("video/")

  const handleDownload = async (file: GalleryFile, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
    }

    try {
      const response = await fetch(file.viewLink)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = file.name
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error("Download failed:", err)
      alert("Failed to download file")
    }
  }

  const handleMediaSelect = (file: GalleryFile) => {
    setSelectedMedia(file)
    setVideoError(false)
  }

  return (
    <>
      {/* Gallery Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        {files.map((file) => (
          <div key={file.id} className="relative group">
            <button
              onClick={() => handleMediaSelect(file)}
              className="relative aspect-square rounded-lg overflow-hidden shadow-md hover:shadow-lg transition cursor-pointer bg-amber-100 w-full"
            >
              {isVideo(file.mimeType) ? (
                <>
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition"></div>
                  <Play className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-white z-10" />
                  <img
                    src={file.thumbnailLink}
                    alt={file.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder.svg"
                    }}
                  />
                </>
              ) : (
                <img
                  src={file.thumbnailLink}
                  alt={file.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition"
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder.svg"
                  }}
                />
              )}
            </button>
            {/* Download button */}
            <button
              onClick={(e) => handleDownload(file, e)}
              className="absolute top-2 right-2 bg-white/90 hover:bg-white text-amber-700 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-20"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Modal */}
      {selectedMedia && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedMedia(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center rounded-lg overflow-hidden bg-black">
            <button
              onClick={() => setSelectedMedia(null)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-10 text-2xl"
            >
              ✕
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleDownload(selectedMedia)
              }}
              className="absolute top-4 right-16 bg-white/90 hover:bg-white text-amber-700 p-2 rounded-full shadow-lg z-10"
              title="Download"
            >
              <Download className="w-5 h-5" />
            </button>

            {isVideo(selectedMedia.mimeType) ? (
              <div className="w-full h-full flex items-center justify-center flex-col gap-4 p-8" onClick={(e) => e.stopPropagation()}>
                {!videoError ? (
                  <iframe
                    src={`https://drive.google.com/file/d/${selectedMedia.id}/preview`}
                    className="w-full h-full"
                    allow="autoplay"
                    allowFullScreen
                    style={{ minHeight: "500px" }}
                    onError={() => setVideoError(true)}
                  />
                ) : (
                  <div className="text-center">
                    <Play className="w-16 h-16 text-white/60 mx-auto mb-4" />
                    <p className="text-white text-lg mb-2">Video preview unavailable</p>
                    <p className="text-white/70 text-sm mb-6">
                      This video might be too large or in an unsupported format for preview
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDownload(selectedMedia)
                      }}
                      className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium inline-flex items-center gap-2 transition"
                    >
                      <Download className="w-5 h-5" />
                      Download Video to Watch
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <img
                src={selectedMedia.viewLink}
                alt={selectedMedia.name}
                className="max-w-full max-h-full object-contain"
                onError={(e) => {
                  console.error("Failed to load image:", selectedMedia.id)
                  e.currentTarget.src = "/placeholder.svg"
                }}
              />
            )}

            <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-4 text-white text-sm">
              {selectedMedia.uploaderName && <p className="font-semibold">Uploaded by: {selectedMedia.uploaderName}</p>}
              <p className="text-gray-300">{new Date(selectedMedia.createdTime).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
