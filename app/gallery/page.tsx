"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Loader2, FolderOpen, Image as ImageIcon, Download } from "lucide-react"
import { GalleryGrid } from "@/components/gallery-grid"

export default function GalleryPage() {
  const [folders, setFolders] = useState<any[]>([])
  const [files, setFiles] = useState<any[]>([])
  const [selectedFolder, setSelectedFolder] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchFolders()
  }, [])

  const fetchFolders = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/gallery")
      if (!response.ok) {
        throw new Error("Failed to fetch folders")
      }
      const data = await response.json()
      setFolders(data.folders || [])
      setError(null)
    } catch (err) {
      console.error("Gallery error:", err)
      setError(err instanceof Error ? err.message : "Failed to load gallery")
    } finally {
      setLoading(false)
    }
  }

  const fetchFolderFiles = async (folderId: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/gallery?folderId=${folderId}`)
      if (!response.ok) {
        throw new Error("Failed to fetch files")
      }
      const data = await response.json()
      setFiles(data.files || [])
      setError(null)
    } catch (err) {
      console.error("Files error:", err)
      setError(err instanceof Error ? err.message : "Failed to load files")
    } finally {
      setLoading(false)
    }
  }

  const handleFolderClick = (folder: any) => {
    setSelectedFolder(folder)
    fetchFolderFiles(folder.id)
  }

  const handleBackToFolders = () => {
    setSelectedFolder(null)
    setFiles([])
  }

  const handleDownloadFolder = async (folderId: string, folderName: string) => {
    try {
      const response = await fetch(`/api/download-folder?folderId=${folderId}`)
      if (!response.ok) throw new Error("Download failed")
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${folderName}.zip`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      alert("Failed to download folder")
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 to-amber-100">
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {selectedFolder ? (
              <button
                onClick={handleBackToFolders}
                className="inline-flex items-center gap-2 text-amber-700 hover:text-amber-900"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Folders</span>
              </button>
            ) : (
              <Link href="/" className="inline-flex items-center gap-2 text-amber-700 hover:text-amber-900">
                <ArrowLeft className="w-5 h-5" />
                <span>Home</span>
              </Link>
            )}
            <h1 className="text-xl md:text-2xl font-bold text-amber-900 text-center flex-1">
              {selectedFolder ? selectedFolder.name : "Wedding Gallery"}
            </h1>
            <div className="w-20"></div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-amber-700 mx-auto mb-4" />
              <p className="text-amber-700">Loading...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border-l-4 border-red-600 p-6 rounded">
            <p className="text-red-700 font-semibold mb-2">Error Loading Gallery</p>
            <p className="text-red-600">{error}</p>
          </div>
        ) : selectedFolder ? (
          // Show files in selected folder
          files.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-amber-700 text-lg">No photos in this folder yet</p>
            </div>
          ) : (
            <>
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <p className="text-amber-700">
                  <span className="font-semibold">{files.length}</span> photo{files.length !== 1 ? "s" : ""} and video{files.length !== 1 ? "s" : ""}
                </p>
                <button
                  onClick={() => handleDownloadFolder(selectedFolder.id, selectedFolder.name)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Download All</span>
                </button>
              </div>
              <GalleryGrid files={files} />
            </>
          )
        ) : (
          // Show folders
          folders.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-amber-700 text-lg mb-4">No photos yet. Be the first to share!</p>
              <Link href="/" className="inline-block px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">
                Start Uploading
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <p className="text-amber-700 text-sm md:text-base">
                  <span className="font-semibold">{folders.length}</span> contributor{folders.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {folders.map((folder) => (
                  <div
                    key={folder.id}
                    className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden"
                  >
                    <button
                      onClick={() => handleFolderClick(folder)}
                      className="w-full p-6 text-left hover:bg-amber-50 transition"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                          <FolderOpen className="w-6 h-6 text-amber-700" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-amber-900 text-lg mb-1 truncate">{folder.name}</h3>
                          <p className="text-amber-600 text-sm flex items-center gap-1">
                            <ImageIcon className="w-4 h-4" />
                            <span>{folder.fileCount} item{folder.fileCount !== 1 ? "s" : ""}</span>
                          </p>
                        </div>
                      </div>
                    </button>
                    <div className="border-t border-amber-100 px-6 py-3 bg-amber-50/50">
                      <button
                        onClick={() => handleDownloadFolder(folder.id, folder.name)}
                        className="text-amber-700 hover:text-amber-900 text-sm font-medium flex items-center gap-2 transition"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download Folder</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )
        )}
      </div>
    </main>
  )
}
