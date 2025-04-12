import { fal } from "@fal-ai/client"

// Initialize fal.ai client
if (typeof window !== "undefined") {
  fal.config({
    // Use the environment variable for the client side
    credentials: process.env.NEXT_PUBLIC_FAL_KEY,
  })
}

export async function uploadToFalStorage(file: File): Promise<string> {
  try {
    console.log("Uploading file to fal.ai storage:", file.name)

    // Make sure fal is configured
    if (!process.env.NEXT_PUBLIC_FAL_KEY) {
      console.error("FAL_KEY not configured")
      throw new Error("Storage service not configured")
    }

    const url = await fal.storage.upload(file)
    console.log("File uploaded successfully, URL:", url)
    return url
  } catch (error) {
    console.error("Error uploading to fal.ai storage:", error)
    throw new Error("Failed to upload file to storage")
  }
}

export async function fileFromDataUrl(dataUrl: string, filename: string): Promise<File> {
  const res = await fetch(dataUrl)
  const blob = await res.blob()
  return new File([blob], filename, { type: blob.type })
}
