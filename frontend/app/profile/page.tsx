"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Download,
  Heart,
  Bookmark,
  Share2,
  Trash2,
  History,
  Settings,
  Upload,
  Key,
  UserX,
  AlertTriangle,
  User,
} from "lucide-react"
import { useUser } from "@/lib/user-context"
import { toast } from "@/hooks/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import apiClient from "@/lib/api-client"
import { useAuth } from "@/components/auth-provider"
import { Loading } from "@/components/loading"

// Import the fal.ai storage utilities
import { uploadToFalStorage } from "@/lib/fal-storage"

export default function ProfilePage() {
  const router = useRouter()
  const { isLoading } = useAuth()

  const [savedImagesState, setSavedImagesState] = useState<any[]>([])
  const [lovedImagesState, setLovedImagesState] = useState<any[]>([])
  const [historyImagesState, setHistoryImagesState] = useState<any[]>([])
  const [userProfileState, setUserProfileState] = useState<any>({
    name: "",
    email: "",
    avatarUrl: "",
    role: "",
  })

  const [activeTab, setActiveTab] = useState("loved")
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Add a new state for the username update
  const [newUsername, setNewUsername] = useState(userProfileState.name)
  const [isUpdatingUsername, setIsUpdatingUsername] = useState(false)

  const {
    savedImages,
    lovedImages,
    historyImages,
    userProfile,
    removeSavedImage,
    removeLovedImage,
    removeFromHistory,
    saveImage,
    loveImage,
    isImageSaved,
    isImageLoved,
    updateUserProfile,
    updatePassword,
    deleteAccount,
  } = useUser()

  const memoizedUpdateUserProfile = useCallback(
    (profileData: any) => {
      setUserProfileState((prevProfile: any) => ({ ...prevProfile, ...profileData }))
    },
    [setUserProfileState],
  )

  const memoizedRemoveSavedImage = useCallback(
    (imageId: string) => {
      setSavedImagesState((prevSavedImages: any[]) => prevSavedImages.filter((image) => image.id !== imageId))
    },
    [setSavedImagesState],
  )

  const memoizedRemoveLovedImage = useCallback(
    (imageId: string) => {
      setLovedImagesState((prevLovedImages: any[]) => prevLovedImages.filter((image) => image.id !== imageId))
    },
    [setLovedImagesState],
  )

  const memoizedRemoveFromHistory = useCallback(
    (imageId: string) => {
      setHistoryImagesState((prevHistoryImages: any[]) => prevHistoryImages.filter((image) => image.id !== imageId))
    },
    [setHistoryImagesState],
  )

  const memoizedSaveImage = useCallback(
    (image: any) => {
      setSavedImagesState((prevSavedImages: any[]) => [...prevSavedImages, image])
    },
    [setSavedImagesState],
  )

  const memoizedLoveImage = useCallback(
    (image: any) => {
      setLovedImagesState((prevLovedImages: any[]) => [...prevLovedImages, image])
    },
    [setLovedImagesState],
  )

  const memoizedIsImageSaved = useCallback(
    (imageId: string) => {
      return savedImagesState.some((image) => image.id === imageId)
    },
    [savedImagesState],
  )

  const memoizedIsImageLoved = useCallback(
    (imageId: string) => {
      return lovedImagesState.some((image) => image.id === imageId)
    },
    [lovedImagesState],
  )

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await apiClient.getProfile()
        if (response.success && response.user) {
          const updatedProfile = {
            name: response.user.name,
            email: response.user.email,
            avatarUrl: response.user.avatar_url || "/placeholder.svg",
            role: response.user.role,
          };
    
          // Update user profile state
          setUserProfileState(updatedProfile);
    
          // Memoized function update
          memoizedUpdateUserProfile(updatedProfile);
    
          // Set additional states if needed
          setNewUsername(response.user.name);
        }
      } catch (error) {
        console.error("Failed to fetch user profile:", error)
      }
    }

    fetchUserData()
  }, [memoizedUpdateUserProfile])

  // In the useEffect for fetching images
  useEffect(() => {
    const fetchImages = async () => {
      try {
        // Add error handling for each API call
        try {
          const lovedResponse = await apiClient.getImages("loved")
          if (lovedResponse.success) {
            setLovedImagesState(
              lovedResponse.images.map((img: any) => ({
                id: img.id,
                imageUrl: img.image_url,
                prompt: img.prompt,
                createdAt: img.created_at,
              })),
            )
          } else {
            console.error("Failed to fetch loved images:", lovedResponse.message)
          }
        } catch (error) {
          console.error("Error fetching loved images:", error)
        }

        try {
          const savedResponse = await apiClient.getImages("saved")
          if (savedResponse.success) {
            setSavedImagesState(
              savedResponse.images.map((img: any) => ({
                id: img.id,
                imageUrl: img.image_url,
                prompt: img.prompt,
                createdAt: img.created_at,
              })),
            )
          } else {
            console.error("Failed to fetch saved images:", savedResponse.message)
          }
        } catch (error) {
          console.error("Error fetching saved images:", error)
        }

        try {
          const historyResponse = await apiClient.getImages()
          if (historyResponse.success) {
            setHistoryImagesState(
              historyResponse.images.map((img: any) => ({
                id: img.id,
                imageUrl: img.image_url,
                prompt: img.prompt,
                createdAt: img.created_at,
              })),
            )
          } else {
            console.error("Failed to fetch history images:", historyResponse.message)
          }
        } catch (error) {
          console.error("Error fetching history images:", error)
        }
      } catch (error) {
        console.error("Failed to fetch images:", error)
      }
    }

    fetchImages()
  }, [])

  const handleDownload = async (imageUrl: string) => {
    try {
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
  

  const handleShare = (imageUrl: string, prompt: string) => {
    if (navigator.share) {
      navigator
        .share({
          title: "AI Generated Image",
          text: prompt,
          url: imageUrl,
        })
        .catch(() => {
          navigator.clipboard.writeText(imageUrl)
          toast({
            title: "Link copied",
            description: "Image URL copied to clipboard",
          })
        })
    } else {
      navigator.clipboard.writeText(imageUrl)
      toast({
        title: "Link copied",
        description: "Image URL copied to clipboard",
      })
    }
  }

  const handleToggleLove = async (image: any) => {
    const isCurrentlyLoved = memoizedIsImageLoved(image.id)

    try {
      // Optimistically update UI
      if (isCurrentlyLoved) {
        memoizedRemoveLovedImage(image.id)
      } else {
        memoizedLoveImage(image)
      }

      // Update backend
      const response = await apiClient.toggleLoveImage(image.id, !isCurrentlyLoved)

      if (!response.success) {
        // Revert UI change if backend update fails
        if (isCurrentlyLoved) {
          memoizedLoveImage(image)
        } else {
          memoizedRemoveLovedImage(image.id)
        }

        toast({
          title: "Error",
          description: response.message || "Failed to update favorite status",
          variant: "destructive",
        })
      } else {
        toast({
          title: isCurrentlyLoved ? "Removed from favorites" : "Added to favorites",
          description: isCurrentlyLoved ? "Image removed from your favorites" : "Image added to your favorites",
        })
      }
    } catch (error) {
      console.error("Error toggling love status:", error)

      // Revert UI change if there's an error
      if (isCurrentlyLoved) {
        memoizedLoveImage(image)
      } else {
        memoizedRemoveLovedImage(image.id)
      }

      toast({
        title: "Error",
        description: "Failed to update favorite status",
        variant: "destructive",
      })
    }
  }

  const handleToggleSave = async (image: any) => {
    const isCurrentlySaved = memoizedIsImageSaved(image.id)

    try {
      // Optimistically update UI
      if (isCurrentlySaved) {
        memoizedRemoveSavedImage(image.id)
      } else {
        memoizedSaveImage(image)
      }

      // Update backend
      const response = await apiClient.toggleSaveImage(image.id, !isCurrentlySaved)

      if (!response.success) {
        // Revert UI change if backend update fails
        if (isCurrentlySaved) {
          memoizedSaveImage(image)
        } else {
          memoizedRemoveSavedImage(image.id)
        }

        toast({
          title: "Error",
          description: response.message || "Failed to update saved status",
          variant: "destructive",
        })
      } else {
        toast({
          title: isCurrentlySaved ? "Removed from collection" : "Added to collection",
          description: isCurrentlySaved ? "Image removed from your collection" : "Image added to your collection",
        })
      }
    } catch (error) {
      console.error("Error toggling save status:", error)

      // Revert UI change if there's an error
      if (isCurrentlySaved) {
        memoizedSaveImage(image)
      } else {
        memoizedRemoveSavedImage(image.id)
      }

      toast({
        title: "Error",
        description: "Failed to update saved status",
        variant: "destructive",
      })
    }
  }

  const handleRemove = (id: string, type: "loved" | "saved") => {
    if (type === "loved") {
      memoizedRemoveLovedImage(id)
      // Update backend
      try {
        apiClient.toggleLoveImage(id, false)
      } catch (error) {
        console.error("Failed to unlove image in backend:", error)
      }
    } else {
      memoizedRemoveSavedImage(id)
      // Update backend
      try {
        apiClient.toggleSaveImage(id, false)
      } catch (error) {
        console.error("Failed to unsave image in backend:", error)
      }
    }

    toast({
      title: "Removed",
      description: `Image removed from your ${type === "loved" ? "favorites" : "collection"}`,
    })
  }

  // Update the handleAvatarUpload function
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsUpdatingAvatar(true)
    const file = e.target.files?.[0]

    if (file) {
      try {
        // First, upload the file to fal.ai storage
        const falUrl = await uploadToFalStorage(file)
        userProfileState.avtarUrl = falUrl;

        // Update backend with the fal.ai URL
        const response = await apiClient.updateProfile({ avatarUrl: falUrl })

        if (response.success) {
          // Update local state with the URL returned from the server
          const serverAvatarUrl = response.user.avatar_url || falUrl
          memoizedUpdateUserProfile({ avatarUrl: serverAvatarUrl })

          toast({
            title: "Profile Updated",
            description: "Your profile photo has been updated successfully",
          })
        } else {
          toast({
            title: "Error",
            description: response.message || "Failed to update profile photo",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("Failed to update avatar:", error)
        toast({
          title: "Error",
          description: "Failed to upload profile photo",
          variant: "destructive",
        })
      } finally {
        setIsUpdatingAvatar(false)
      }
    } else {
      setIsUpdatingAvatar(false)
    }
  }

  // Add a new function to handle username update
  const handleUsernameUpdate = async () => {
    if (!newUsername.trim()) {
      toast({
        title: "Error",
        description: "Username cannot be empty",
        variant: "destructive",
      })
      return
    }

    setIsUpdatingUsername(true)

    try {
      // Update backend
      const response = await apiClient.updateProfile({ name: newUsername })

      if (response.success) {
        memoizedUpdateUserProfile({ name: newUsername })

        toast({
          title: "Username Updated",
          description: "Your username has been updated successfully",
        })
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to update username",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update username",
        variant: "destructive",
      })
    } finally {
      setIsUpdatingUsername(false)
    }
  }

  const handlePasswordUpdate = async () => {
    // Reset error
    setPasswordError("")

    // Validate passwords
    if (!oldPassword) {
      setPasswordError("Current password is required")
      return
    }

    if (!newPassword) {
      setPasswordError("New password is required")
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match")
      return
    }

    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters")
      return
    }

    setIsUpdatingPassword(true)

    try {
      const response = await apiClient.updatePassword(oldPassword, newPassword)

      if (response.success) {
        toast({
          title: "Password Updated",
          description: "Your password has been updated successfully",
        })

        // Reset form
        setOldPassword("")
        setNewPassword("")
        setConfirmPassword("")
      } else {
        setPasswordError(response.message || "Failed to update password. Please try again.")
      }
    } catch (error) {
      setPasswordError("An error occurred. Please try again.")
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true)

    try {
      const response = await apiClient.deleteAccount()

      if (response.success) {
        toast({
          title: "Account Deleted",
          description: "Your account has been deleted successfully",
        })

        // Clear local storage
        localStorage.removeItem("token")
        localStorage.removeItem("savedImages")
        localStorage.removeItem("lovedImages")
        localStorage.removeItem("historyImages")
        localStorage.removeItem("userProfile")

        // Redirect to home page
        router.push("/")
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to delete account. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeletingAccount(false)
      setShowDeleteDialog(false)
    }
  }

  if (isLoading) {
    return <Loading />
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="container flex-1 py-6">
        <div className="mx-auto max-w-4xl space-y-8">
          {/* User Profile Section */}
          <div className="flex flex-col items-center space-y-4 sm:flex-row sm:space-y-0 sm:space-x-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={userProfileState.avatarUrl} alt={userProfileState.name} />
              <AvatarFallback>{userProfileState.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="space-y-2 text-center sm:text-left">
              <h1 className="text-3xl font-bold">{userProfileState.name}</h1>
              <p className="text-muted-foreground">{userProfileState.email}</p>
              <p className="text-xs text-muted-foreground capitalize">Role: {userProfileState.role}</p>
            </div>
          </div>

          {/* Tabs for Loved, Saved, History, and Settings */}
          <Tabs defaultValue="loved" onValueChange={(value) => setActiveTab(value)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="loved" className="flex gap-2">
                <Heart className="h-4 w-4" />
                Loved ({lovedImagesState.length})
              </TabsTrigger>
              <TabsTrigger value="saved" className="flex gap-2">
                <Bookmark className="h-4 w-4" />
                Saved ({savedImagesState.length})
              </TabsTrigger>
              <TabsTrigger value="history" className="flex gap-2">
                <History className="h-4 w-4" />
                History ({historyImagesState.length})
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="loved" className="mt-6">
              {lovedImagesState.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center rounded-md border border-dashed p-8 text-center">
                  <Heart className="mb-2 h-10 w-10 text-muted-foreground" />
                  <h3 className="text-lg font-medium">No loved images yet</h3>
                  <p className="text-sm text-muted-foreground">Images you love will appear here</p>
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {lovedImagesState.map((image) => (
                    <Card key={image.id} className="overflow-hidden">
                      <div className="aspect-square w-full bg-muted">
                        <img
                          src={image.imageUrl || "/placeholder.svg"}
                          alt={image.prompt}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <CardContent className="p-4">
                        <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">{image.prompt}</p>
                        <div className="flex justify-between">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleDownload(image.imageUrl)}
                              title="Download"
                            >
                              <Download className="h-4 w-4" />
                              <span className="sr-only">Download</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleShare(image.imageUrl, image.prompt)}
                              title="Share"
                            >
                              <Share2 className="h-4 w-4" />
                              <span className="sr-only">Share</span>
                            </Button>
                            <Button
                              variant={memoizedIsImageSaved(image.id) ? "default" : "outline"}
                              size="icon"
                              onClick={() => handleToggleSave(image)}
                              title={memoizedIsImageSaved(image.id) ? "Remove from saved" : "Add to saved"}
                            >
                              <Bookmark className={`h-4 w-4 ${memoizedIsImageSaved(image.id) ? "fill-current" : ""}`} />
                              <span className="sr-only">Save</span>
                            </Button>
                          </div>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => handleToggleLove(image)}
                            title="Remove from loved"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Remove</span>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="saved" className="mt-6">
              {savedImagesState.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center rounded-md border border-dashed p-8 text-center">
                  <Bookmark className="mb-2 h-10 w-10 text-muted-foreground" />
                  <h3 className="text-lg font-medium">No saved images yet</h3>
                  <p className="text-sm text-muted-foreground">Images you save will appear here</p>
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {savedImagesState.map((image) => (
                    <Card key={image.id} className="overflow-hidden">
                      <div className="aspect-square w-full bg-muted">
                        <img
                          src={image.imageUrl || "/placeholder.svg"}
                          alt={image.prompt}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <CardContent className="p-4">
                        <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">{image.prompt}</p>
                        <div className="flex justify-between">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleDownload(image.imageUrl)}
                              title="Download"
                            >
                              <Download className="h-4 w-4" />
                              <span className="sr-only">Download</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleShare(image.imageUrl, image.prompt)}
                              title="Share"
                            >
                              <Share2 className="h-4 w-4" />
                              <span className="sr-only">Share</span>
                            </Button>
                            <Button
                              variant={memoizedIsImageLoved(image.id) ? "default" : "outline"}
                              size="icon"
                              onClick={() => handleToggleLove(image)}
                              title={memoizedIsImageLoved(image.id) ? "Remove from loved" : "Add to loved"}
                            >
                              <Heart className={`h-4 w-4 ${memoizedIsImageLoved(image.id) ? "fill-current" : ""}`} />
                              <span className="sr-only">Love</span>
                            </Button>
                          </div>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => handleToggleSave(image)}
                            title="Remove from saved"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Remove</span>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="mt-6">
              {historyImagesState.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center rounded-md border border-dashed p-8 text-center">
                  <History className="mb-2 h-10 w-10 text-muted-foreground" />
                  <h3 className="text-lg font-medium">No generation history yet</h3>
                  <p className="text-sm text-muted-foreground">Images you generate will appear here</p>
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {historyImagesState.map((image) => (
                    <Card key={image.id} className="overflow-hidden">
                      <div className="aspect-square w-full bg-muted">
                        <img
                          src={image.imageUrl || "/placeholder.svg"}
                          alt={image.prompt}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <CardContent className="p-4">
                        <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">{image.prompt}</p>
                        <div className="flex flex-wrap justify-between gap-2">
                          <div className="flex gap-2">
                            <Button
                              variant={memoizedIsImageLoved(image.id) ? "default" : "outline"}
                              size="icon"
                              onClick={() => handleToggleLove(image)}
                              title={memoizedIsImageLoved(image.id) ? "Remove from loved" : "Add to loved"}
                            >
                              <Heart className={`h-4 w-4 ${memoizedIsImageLoved(image.id) ? "fill-current" : ""}`} />
                              <span className="sr-only">Love</span>
                            </Button>
                            <Button
                              variant={memoizedIsImageSaved(image.id) ? "default" : "outline"}
                              size="icon"
                              onClick={() => handleToggleSave(image)}
                              title={memoizedIsImageSaved(image.id) ? "Remove from saved" : "Add to saved"}
                            >
                              <Bookmark className={`h-4 w-4 ${memoizedIsImageSaved(image.id) ? "fill-current" : ""}`} />
                              <span className="sr-only">Save</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleDownload(image.imageUrl)}
                              title="Download"
                            >
                              <Download className="h-4 w-4" />
                              <span className="sr-only">Download</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleShare(image.imageUrl, image.prompt)}
                              title="Share"
                            >
                              <Share2 className="h-4 w-4" />
                              <span className="sr-only">Share</span>
                            </Button>
                          </div>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={async () => {
                              memoizedRemoveFromHistory(image.id)

                              if(isImageSaved(image.id)){
                                handleRemove(image.id, "saved")
                              }
                              if(isImageLoved(image.id)){
                               handleRemove(image.id, "loved")
                              }
                              await apiClient.deleteImage(image.id)
                              toast({
                                title: "Removed",
                                description: "Image removed from your history",
                              })
                            }}
                            title="Remove from history"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Remove</span>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="settings" className="mt-6">
              <div className="grid gap-6">
                {/* Profile Photo Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Upload className="h-5 w-5" />
                      Change Profile Photo
                    </CardTitle>
                    <CardDescription>Update your profile photo</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col items-center gap-4 sm:flex-row">
                      <Avatar className="h-24 w-24">
                        <AvatarImage src={userProfileState.avatarUrl} alt={userProfileState.name} />
                        <AvatarFallback>{userProfileState.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          ref={fileInputRef}
                          onChange={handleAvatarUpload}
                        />
                        <Button onClick={() => fileInputRef.current?.click()} disabled={isUpdatingAvatar}>
                          <Upload className="h-5 w-5" />
                          {isUpdatingAvatar ? "Uploading..." : "Upload Photo"}
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          Click the button above to select a new profile photo.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Username Update Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Change Username
                    </CardTitle>
                    <CardDescription>Update your username</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input id="username" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} />
                      </div>
                    </form>
                  </CardContent>
                  <CardFooter>
                    <Button
                      onClick={handleUsernameUpdate}
                      disabled={isUpdatingUsername || !newUsername.trim() || newUsername === userProfileState.name}
                    >
                      {isUpdatingUsername ? "Updating..." : "Update Username"}
                    </Button>
                  </CardFooter>
                </Card>

                {/* Password Update Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Key className="h-5 w-5" />
                      Update Password
                    </CardTitle>
                    <CardDescription>Change your account password</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="current-password">Current Password</Label>
                        <Input
                          id="current-password"
                          type="password"
                          value={oldPassword}
                          onChange={(e) => setOldPassword(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-password">New Password</Label>
                        <Input
                          id="new-password"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirm New Password</Label>
                        <Input
                          id="confirm-password"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                      </div>
                      {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
                    </form>
                  </CardContent>
                  <CardFooter>
                    <Button onClick={handlePasswordUpdate} disabled={isUpdatingPassword}>
                      {isUpdatingPassword ? "Updating..." : "Update Password"}
                    </Button>
                  </CardFooter>
                </Card>

                {/* Delete Account Section - Only visible for non-admin users */}
                {userProfileState.role !== "admin" && (
                  <Card className="border-destructive">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-destructive">
                        <UserX className="h-5 w-5" />
                        Delete Account
                      </CardTitle>
                      <CardDescription>Permanently delete your account and all your data</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        This action cannot be undone. Once you delete your account, all your data will be permanently
                        removed.
                      </p>
                    </CardContent>
                    <CardFooter>
                      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive">Delete Account</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                              <AlertTriangle className="h-5 w-5" />
                              Are you absolutely sure?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete your account and remove all
                              your data from our servers.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleDeleteAccount}
                              disabled={isDeletingAccount}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {isDeletingAccount ? "Deleting..." : "Delete Account"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </CardFooter>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  )
}
