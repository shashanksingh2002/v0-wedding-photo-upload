"use client"

import { useState } from "react"
import { Play } from "lucide-react"

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

  const isVideo = (mimeType: string) => mimeType.startsWith("video/")

  return (
    <>
      {/* Gallery Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {files.map((file) => (
          <button
            key={file.id}
            onClick={() => setSelectedMedia(file)}
            className="relative aspect-square rounded-lg overflow-hidden shadow-md hover:shadow-lg transition group cursor-pointer bg-amber-100"
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

            {isVideo(selectedMedia.mimeType) ? (
              <div className="w-full h-full flex items-center justify-center">
                <iframe
                  src={`https://drive.google.com/file/d/${selectedMedia.id}/preview`}
                  className="w-full h-full"
                  allow="autoplay"
                  allowFullScreen
                  style={{ minHeight: "500px" }}
                />
              </div>
            ) : (
              <img
                src={selectedMedia.viewLink}
                alt={selectedMedia.name}
                className="max-w-full max-h-full object-contain"
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
