"use client"

import { Shield, CheckCircle, Info } from "lucide-react"

export function GoogleLoginHelp() {
    return (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                    <h4 className="font-semibold text-green-900 mb-2 text-sm">
                        Why We Need Google Sign In
                    </h4>
                    <div className="space-y-2 text-xs text-green-800">
                        <p className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                            <span>Sign in to get your name and identify yourself</span>
                        </p>
                        <p className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                            <span>Upload photos directly from your device to the wedding folder</span>
                        </p>
                        <p className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                            <span>No file size limits - upload full-resolution photos and videos</span>
                        </p>
                        <p className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                            <span>All photos organized by your name in a shared folder</span>
                        </p>
                    </div>

                    <div className="mt-3 pt-3 border-t border-green-200">
                        <div className="flex items-start gap-2">
                            <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-green-900">
                                <strong>What we access:</strong> Only files you upload through this app and your basic profile (name). We do NOT access your existing Google Drive files.
                            </p>
                        </div>
                    </div>

                    <div className="mt-2">
                        <div className="flex items-start gap-2">
                            <Shield className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-green-900">
                                <strong>Privacy:</strong> This is a private wedding app. Only wedding guests can access photos.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

