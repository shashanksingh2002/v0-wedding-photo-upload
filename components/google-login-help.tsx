"use client"

import { AlertCircle, Shield, CheckCircle } from "lucide-react"

export function GoogleLoginHelp() {
  return (
    <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-semibold text-blue-900 mb-2 text-sm">
            Google Login Instructions
          </h4>
          <div className="space-y-2 text-xs text-blue-800">
            <p className="flex items-start gap-2">
              <span className="font-bold">1.</span>
              <span>Click "Add Your Photos" and sign in with Google</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="font-bold">2.</span>
              <span>You may see "Google hasn't verified this app" - this is normal</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="font-bold">3.</span>
              <span>Click <strong>"Advanced"</strong> at the bottom</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="font-bold">4.</span>
              <span>Click <strong>"Go to Wedding Photos (unsafe)"</strong></span>
            </p>
            <p className="flex items-start gap-2">
              <span className="font-bold">5.</span>
              <span>Click <strong>"Continue"</strong> to grant permissions</span>
            </p>
          </div>
          
          <div className="mt-3 pt-3 border-t border-blue-200">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-900">
                <strong>Don't worry!</strong> This is a private wedding app. The warning appears because it's not a commercial app. Your photos are safe and only accessible to wedding guests.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

