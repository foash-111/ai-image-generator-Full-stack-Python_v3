"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"

export type ImageItem = {
  id: string
  imageUrl: string
  prompt: string
  createdAt: string
}

export type UserProfile = {
  name: string
  email: string
  avatarUrl: string
  role: "user" | "admin"
}

export type UserContextType = {
  savedImages: ImageItem[]
  lovedImages: ImageItem[]
  historyImages: ImageItem[]
  userProfile: UserProfile
  saveImage: (image: ImageItem) => void
  loveImage: (image: ImageItem) => void
  addToHistory: (image: ImageItem) => void
  removeSavedImage: (id: string) => void
  removeLovedImage: (id: string) => void
  removeFromHistory: (id: string) => void
  isImageSaved: (id: string) => boolean
  isImageLoved: (id: string) => boolean
  updateUserProfile: (profile: Partial<UserProfile>) => void
  updatePassword: (oldPassword: string, newPassword: string) => Promise<boolean>
  deleteAccount: () => Promise<boolean>
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [savedImages, setSavedImages] = useState<ImageItem[]>([])
  const [lovedImages, setLovedImages] = useState<ImageItem[]>([])
  const [historyImages, setHistoryImages] = useState<ImageItem[]>([])
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: "John Doe",
    email: "john.doe@example.com",
    avatarUrl: "/placeholder.svg",
    role: "user", // Default role is 'user'
  })

  // Load saved data from localStorage on component mount
  useEffect(() => {
    const savedImagesData = localStorage.getItem("savedImages")
    const lovedImagesData = localStorage.getItem("lovedImages")
    const historyImagesData = localStorage.getItem("historyImages")
    const userProfileData = localStorage.getItem("userProfile")

    if (savedImagesData) {
      setSavedImages(JSON.parse(savedImagesData))
    }

    if (lovedImagesData) {
      setLovedImages(JSON.parse(lovedImagesData))
    }

    if (historyImagesData) {
      setHistoryImages(JSON.parse(historyImagesData))
    }

    if (userProfileData) {
      setUserProfile(JSON.parse(userProfileData))
    }
  }, [])

  // Save data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("savedImages", JSON.stringify(savedImages))
  }, [savedImages])

  useEffect(() => {
    localStorage.setItem("lovedImages", JSON.stringify(lovedImages))
  }, [lovedImages])

  useEffect(() => {
    localStorage.setItem("historyImages", JSON.stringify(historyImages))
  }, [historyImages])

  useEffect(() => {
    localStorage.setItem("userProfile", JSON.stringify(userProfile))
  }, [userProfile])

  const saveImage = (image: ImageItem) => {
    if (!isImageSaved(image.id)) {
      setSavedImages((prev) => [...prev, image])
    }
  }

  const loveImage = (image: ImageItem) => {
    if (!isImageLoved(image.id)) {
      setLovedImages((prev) => [...prev, image])
    }
  }

  const addToHistory = (image: ImageItem) => {
    // Check if image already exists in history to avoid duplicates
    if (!historyImages.some((item) => item.id === image.id)) {
      setHistoryImages((prev) => [image, ...prev]) // Add to beginning of array
    }
  }

  const removeSavedImage = (id: string) => {
    setSavedImages((prev) => prev.filter((image) => image.id !== id))
  }

  const removeLovedImage = (id: string) => {
    setLovedImages((prev) => prev.filter((image) => image.id !== id))
  }

  const removeFromHistory = (id: string) => {
    setHistoryImages((prev) => prev.filter((image) => image.id !== id))
  }

  const isImageSaved = (id: string) => {
    return savedImages.some((image) => image.id === id)
  }

  const isImageLoved = (id: string) => {
    return lovedImages.some((image) => image.id === id)
  }

  const updateUserProfile = (profile: Partial<UserProfile>) => {
    // Only update if there are actual changes
    setUserProfile((prev) => {
      // Check if any values are actually different
      const hasChanges = Object.entries(profile).some(([key, value]) => prev[key as keyof UserProfile] !== value)

      // Only trigger a re-render if something changed
      return hasChanges ? { ...prev, ...profile } : prev
    })
  }

  const updatePassword = async (oldPassword: string, newPassword: string): Promise<boolean> => {
    // Simulate password update - in a real app, this would call an API
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulate success
        resolve(true)
      }, 1000)
    })
  }

  const deleteAccount = async (): Promise<boolean> => {
    // Simulate account deletion - in a real app, this would call an API
    return new Promise((resolve) => {
      setTimeout(() => {
        // Clear all user data
        setSavedImages([])
        setLovedImages([])
        setHistoryImages([])
        // Reset user profile
        setUserProfile({
          name: "John Doe",
          email: "john.doe@example.com",
          avatarUrl: "/placeholder.svg",
          role: "user",
        })
        resolve(true)
      }, 1000)
    })
  }

  return (
    <UserContext.Provider
      value={{
        savedImages,
        lovedImages,
        historyImages,
        userProfile,
        saveImage,
        loveImage,
        addToHistory,
        removeSavedImage,
        removeLovedImage,
        removeFromHistory,
        isImageSaved,
        isImageLoved,
        updateUserProfile,
        updatePassword,
        deleteAccount,
      }}
    >
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider")
  }
  return context
}
