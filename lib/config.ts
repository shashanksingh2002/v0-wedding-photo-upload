/**
 * Client-side accessible configuration
 * The folder ID is not sensitive - it's just a reference.
 * Security is handled by OAuth tokens.
 */

// This will be replaced at build time by Next.js
export const WEDDING_FOLDER_ID = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_FOLDER_ID || ""

if (!WEDDING_FOLDER_ID && typeof window !== "undefined") {
  console.warn("NEXT_PUBLIC_GOOGLE_DRIVE_FOLDER_ID is not set")
}

