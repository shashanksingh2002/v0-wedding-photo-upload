"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Camera, Upload } from "lucide-react"
import { GoogleLoginHelp } from "@/components/google-login-help"

export default function Home() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [hasToken, setHasToken] = useState(false)

  useEffect(() => {
    // Check if user is already authenticated
    const token = localStorage.getItem("google_access_token")
    if (token) {
      setHasToken(true)
    }
  }, [])

  const handleGoogleAuth = async () => {
    // If already authenticated, go directly to upload
    const token = localStorage.getItem("google_access_token")
    if (token) {
      router.push("/upload")
      return
    }

    // Otherwise, authenticate
    setIsLoading(true)
    try {
      window.location.href = "/api/auth/google"
    } catch (error) {
      console.error("Auth error:", error)
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 to-amber-100">
      {/* Header */}
      <header className="pt-8 pb-12 px-4 text-center">
        <div className="mb-4">
          <h1 className="text-4xl md:text-5xl font-bold text-amber-900 mb-2">शादी के तस्वीरें</h1>
          <p className="text-amber-700 text-lg">Wedding Photo Gallery</p>
        </div>
        <div className="flex justify-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-red-700"></div>
          <div className="w-2 h-2 rounded-full bg-amber-600"></div>
          <div className="w-2 h-2 rounded-full bg-amber-500"></div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 pb-12">
        {/* Decorative divider */}
        <div className="mb-12 flex items-center gap-4">
          <div className="flex-1 h-px bg-amber-300"></div>
          <span className="text-amber-700">✦</span>
          <div className="flex-1 h-px bg-amber-300"></div>
        </div>

        {/* Action Cards */}
        <div className="space-y-6">
          {/* View Gallery Card */}
          <Link href="/gallery">
            <div className="bg-white rounded-lg shadow-lg p-8 cursor-pointer hover:shadow-xl transition-shadow border-t-4 border-red-700">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <Camera className="w-6 h-6 text-red-700" />
                </div>
                <h2 className="text-2xl font-bold text-amber-900">View Gallery</h2>
              </div>
              <p className="text-amber-700 ml-16">Browse all the beautiful moments from the wedding celebrations</p>
            </div>
          </Link>

          {/* Upload Photos Card */}
          <button onClick={handleGoogleAuth} disabled={isLoading} className="w-full text-left">
            <div className="bg-gradient-to-r from-amber-600 to-amber-700 rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow text-white border-t-4 border-red-700 disabled:opacity-50">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <Upload className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold">Add Your Photos</h2>
              </div>
              <p className="ml-16">
                {isLoading
                  ? "Connecting to Google..."
                  : hasToken
                    ? "Continue uploading (already signed in)"
                    : "Share your special moments from the wedding"}
              </p>
            </div>
          </button>
        </div>

        {/* Decorative divider */}
        <div className="mt-12 flex items-center gap-4">
          <div className="flex-1 h-px bg-amber-300"></div>
          <span className="text-amber-700">✦</span>
          <div className="flex-1 h-px bg-amber-300"></div>
        </div>

        {/* Info Section */}
        <div className="mt-12 bg-white/60 rounded-lg p-6 border-l-4 border-amber-600">
          <h3 className="font-semibold text-amber-900 mb-3">How to Share:</h3>
          <ul className="space-y-2 text-sm text-amber-800">
            <li>✓ Click "Add Your Photos" to begin</li>
            <li>✓ Sign in with your Google account</li>
            <li>✓ Enter your name</li>
            <li>✓ Upload your photos and videos</li>
            <li>✓ All uploads are permanent and cannot be deleted</li>
          </ul>
        </div>

        {/* Google Login Help */}
        <GoogleLoginHelp />
      </div>
    </main>
  )
}
