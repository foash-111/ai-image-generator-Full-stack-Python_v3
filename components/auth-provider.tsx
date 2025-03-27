"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import apiClient from "@/lib/api-client"
import { useUser } from "@/lib/user-context"

type AuthContextType = {
  isAuthenticated: boolean
  isLoading: boolean
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const { updateUserProfile } = useUser()

  useEffect(() => {
    // Add a flag to prevent multiple simultaneous auth checks
    let isMounted = true

    const checkAuth = async () => {
      if (!isMounted) return
      setIsLoading(true)
      try {
        // Check if we have a token
        const token = localStorage.getItem("token")
        if (!token) {
          console.log("No token found, user is not authenticated")
          setIsAuthenticated(false)

          // Redirect to login if trying to access protected routes
          if (isProtectedRoute(pathname)) {
            console.log("Redirecting to login from protected route:", pathname)
            router.push("/login")
          }

          setIsLoading(false)
          return
        }

        console.log("Token found, verifying with backend...")

        // Verify token by fetching user profile
        try {
          const response = await apiClient.getProfile()

          // Check if component is still mounted before updating state
          if (!isMounted) return

          console.log("Profile response:", response)

          if (response.success && response.user) {
            console.log("User authenticated successfully")
            setIsAuthenticated(true)

            // Update user profile in context
            updateUserProfile({
              name: response.user.name,
              email: response.user.email,
              avatarUrl: response.user.avatar_url || "/placeholder.svg",
              role: response.user.role,
            })

            // Redirect to dashboard if on auth pages
            if (isAuthRoute(pathname)) {
              console.log("Redirecting to dashboard from auth route")
              router.push("/dashboard")
            }
          } else {
            console.log("Invalid token or user not found")
            handleAuthFailure()
          }
        } catch (error) {
          if (!isMounted) return
          console.error("Error verifying token:", error)
          handleAuthFailure()
        }
      } catch (error) {
        if (!isMounted) return
        console.error("Auth check failed:", error)
        handleAuthFailure()
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    const handleAuthFailure = () => {
      setIsAuthenticated(false)
      localStorage.removeItem("token")

      // Redirect to login if trying to access protected routes
      if (isProtectedRoute(pathname)) {
        router.push("/login")
      }
    }

    checkAuth()

    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false
    }
  }, [pathname]) // Remove router and updateUserProfile from dependencies

  const logout = async () => {
    console.log("Logging out user")
    await apiClient.logout()
    setIsAuthenticated(false)
    router.push("/")
  }

  return <AuthContext.Provider value={{ isAuthenticated, isLoading, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

// Helper functions
function isProtectedRoute(pathname: string) {
  return (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/profile") ||
    pathname === "/dashboard" ||
    pathname === "/profile"
  )
}

function isAuthRoute(pathname: string) {
  return pathname === "/login" || pathname === "/signup"
}
