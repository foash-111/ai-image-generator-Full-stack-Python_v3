"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Download, Heart, Bookmark, Share2, RefreshCw, AlertCircle } from "lucide-react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { generateImage } from "@/lib/generate-image"
import { toast } from "@/hooks/use-toast"
import { useUser, type ImageItem } from "@/lib/user-context"
import { v4 as uuidv4 } from "uuid"
import apiClient from "@/lib/api-client"
import { useAuth } from "@/components/auth-provider"
import { Loading } from "@/components/loading"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function DashboardPage() {
  const { isLoading, isAuthenticated } = useAuth()
  const [prompt, setPrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [currentImageId, setCurrentImageId] = useState<string | null>(null)
  const { saveImage, loveImage, isImageSaved, isImageLoved, addToHistory } = useUser()
  const [hasGeneratedImage, setHasGeneratedImage] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [generationProgress, setGenerationProgress] = useState<string>("Initializing...")
  const [generationError, setGenerationError] = useState<string | null>(null)

  useEffect(() => {
    // Only run this check once when the component mounts or auth state changes
    if (!isLoading) {
      if (!isAuthenticated) {
        console.log("User not authenticated, should redirect to login")
        setLoadError("Authentication failed. Please log in again.")
      } else {
        // Only log once when authentication is confirmed
        console.log("User authenticated, dashboard should render")
      }
    }
  }, [isLoading, isAuthenticated])

  if (isLoading) {
    return <Loading />
  }

  if (loadError) {
    return (
      // <div className="flex min-h-screen flex-col items-center justify-center">
      //   <Card className="p-8 max-w-md">
      //     <h2 className="text-xl font-bold mb-4">Error Loading Dashboard</h2>
      //     <p className="text-muted-foreground mb-4">{loadError}</p>
      //     <Button onClick={() => (window.location.href = "/login")}>Return to Login</Button>
      //   </Card>
      // </div>
      <div className="flex min-h-screen flex-col items-center justify-center">
      <Card className="p-8 max-w-md">
        <h2 className="text-xl font-bold mb-4">Welcome ❤️ </h2>
        <p className="text-muted-foreground mb-4">stay creating, stay creative 🔥</p>
        <Button onClick={() => (window.location.href = "/login")}>let's start ⚡</Button>
      </Card>
    </div>
    )
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a prompt",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)
    setGenerationProgress("Generating your image (this may take up to a minute)...")
    setGenerationError(null)
    setImageUrl(null)
    setCurrentImageId(null)

    try {
      // With the async approach, this will wait for the entire process to complete
      const result = await generateImage(prompt)

      setImageUrl(result.imageUrl)
      setHasGeneratedImage(true)

      // Use the image ID returned from the backend
      const imageId = result.imageId || uuidv4()
      setCurrentImageId(imageId)

      // Add to history
      const imageItem: ImageItem = {
        id: imageId,
        imageUrl: result.imageUrl,
        prompt,
        createdAt: new Date().toISOString(),
      }
      addToHistory(imageItem)

      toast({
        title: "Success",
        description: "Image generated successfully!",
      })
    } catch (error) {
      console.error("Image generation error:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to generate image. Please try again."
      setGenerationError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
      setGenerationProgress("Initializing...")
    }
  }

const handleDownload = async () => {
      try {
        if (!imageUrl) return;
        const response = await fetch(imageUrl, { mode: "cors" }); // Ensure CORS is allowed
        if (!response.ok) throw new Error("Failed to fetch image");
    
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
    
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = `ai-image-${Date.now()}.png`; // File name
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl); // Free memory
    
        toast({
          title: "Success",
          description: "Image downloaded successfully",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to download image",
          variant: "destructive",
        });
        console.error("Download error:", error);
      }
};

  const handleShare = () => {
    if (!imageUrl) return

    // Use Web Share API if available
    if (navigator.share) {
      navigator
        .share({
          title: "AI Generated Image",
          text: prompt,
          url: imageUrl,
        })
        .catch(() => {
          // Fallback if share fails
          navigator.clipboard.writeText(imageUrl)
          toast({
            title: "Link copied",
            description: "Image URL copied to clipboard",
          })
        })
    } else {
      // Fallback for browsers that don't support Web Share API
      navigator.clipboard.writeText(imageUrl)
      toast({
        title: "Link copied",
        description: "Image URL copied to clipboard",
      })
    }
  }

  const handleSave = () => {
    if (!imageUrl || !currentImageId) return

    const imageItem: ImageItem = {
      id: currentImageId,
      imageUrl,
      prompt,
      createdAt: new Date().toISOString(),
    }

    saveImage(imageItem)

    // Update backend
    try {
      apiClient.toggleSaveImage(currentImageId, true)
    } catch (error) {
      console.error("Failed to save image to backend:", error)
    }

    toast({
      title: "Saved",
      description: "Image saved to your collection",
    })
  }

  const handleLove = () => {
    if (!imageUrl || !currentImageId) return

    const imageItem: ImageItem = {
      id: currentImageId,
      imageUrl,
      prompt,
      createdAt: new Date().toISOString(),
    }

    loveImage(imageItem)

    // Update backend
    try {
      apiClient.toggleLoveImage(currentImageId, true)
    } catch (error) {
      console.error("Failed to love image in backend:", error)
    }

    toast({
      title: "Loved",
      description: "Image added to your favorites",
    })
  }

  const isSaved = currentImageId ? isImageSaved(currentImageId) : false
  const isLoved = currentImageId ? isImageLoved(currentImageId) : false

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="container flex-1 py-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Generate Images</h1>
            <p className="text-muted-foreground">Enter a detailed description to generate an image</p>
          </div>

          <div className="space-y-4">
            <Textarea
              placeholder="A futuristic cityscape at sunset with flying cars and neon lights..."
              className="min-h-24 resize-none"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <Button onClick={handleGenerate} disabled={isGenerating || !prompt.trim()} className="w-full">
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {generationProgress}
                </>
              ) : (
                "Generate Image"
              )}
            </Button>
          </div>

          {generationError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{generationError}</AlertDescription>
            </Alert>
          )}

          <Card className="overflow-hidden">
            <div className="aspect-square w-full bg-muted">
              {imageUrl ? (
                <img
                  src={imageUrl || "/placeholder.svg"}
                  alt={prompt}
                  className="h-full w-full object-cover transition-opacity duration-300"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  {isGenerating ? (
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="h-12 w-12 animate-spin" />
                      <p className="text-center">{generationProgress}</p>
                      <p className="text-xs text-center text-muted-foreground">
                        This may take up to a minute depending on server load
                      </p>
                    </div>
                  ) : (
                    <p>Your generated image will appear here</p>
                  )}
                </div>
              )}
            </div>

            {imageUrl && (
              <div className="flex items-center justify-between border-t p-4">
                <div className="text-sm text-muted-foreground line-clamp-1">{prompt}</div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={handleDownload} title="Download">
                    <Download className="h-4 w-4" />
                    <span className="sr-only">Download</span>
                  </Button>
                  <Button
                    variant={isLoved ? "default" : "outline"}
                    size="icon"
                    onClick={handleLove}
                    title="Love this image"
                  >
                    <Heart className={`h-4 w-4 ${isLoved ? "fill-current" : ""}`} />
                    <span className="sr-only">Love</span>
                  </Button>
                  <Button
                    variant={isSaved ? "default" : "outline"}
                    size="icon"
                    onClick={handleSave}
                    title="Save to collection"
                  >
                    <Bookmark className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} />
                    <span className="sr-only">Save</span>
                  </Button>
                  <Button variant="outline" size="icon" onClick={handleShare} title="Share">
                    <Share2 className="h-4 w-4" />
                    <span className="sr-only">Share</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleGenerate} disabled={isGenerating || !prompt.trim()} 
                    title="Regenerate"
                  >
                    <RefreshCw className={`h-4 w-4 ${isGenerating ? "animate-spin" : ""}`} />
                    <span className="sr-only">Regenerate</span>
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  )
}
