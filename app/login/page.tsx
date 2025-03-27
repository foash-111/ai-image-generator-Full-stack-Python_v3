"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import apiClient from "@/lib/api-client"
import { toast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

// Declare global Google type
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void
          renderButton: (element: HTMLElement, config: any) => void
          prompt: () => void
        }
      }
    }
  }
}

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [googleScriptLoaded, setGoogleScriptLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const googleButtonRef = useRef<HTMLDivElement>(null)

  // Initialize Google Sign-In
  useEffect(() => {
    console.log("Loading Google Sign-In API script")

    // Check if script is already loaded
    const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]')
    if (existingScript) {
      console.log("Google script already exists, initializing directly")
      setGoogleScriptLoaded(true)
      return
    }

    // Load Google Sign-In API script
    const script = document.createElement("script")
    script.src = "https://accounts.google.com/gsi/client"
    script.async = true
    script.defer = true
    script.onload = () => {
      console.log("Google script loaded successfully")
      setGoogleScriptLoaded(true)
    }
    script.onerror = (error) => {
      console.error("Error loading Google script:", error)
    }

    document.body.appendChild(script)

    return () => {
      // Only remove the script if we added it
      if (!existingScript && document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [])

  // Initialize Google button when script is loaded
  useEffect(() => {
    if (!googleScriptLoaded) return

    const initializeGoogleButton = () => {
      if (!window.google) {
        console.error("Google API not available after script load")
        return
      }

      // Wait for the button container to be available
      if (!googleButtonRef.current) {
        console.log("Google button container not ready yet, waiting...")
        return
      }

      console.log("Initializing Google button with client ID:", process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID)
      console.log("Button container:", googleButtonRef.current)

      try {
        window.google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
        })

        // Clear the container first to prevent duplicate buttons
        googleButtonRef.current.innerHTML = ""

        // Render the Google Sign-In button
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: "outline",
          size: "large",
          width: 240,
        })

        console.log("Google button rendered successfully")
      } catch (error) {
        console.error("Error initializing Google button:", error)
      }
    }

    // Try to initialize immediately
    initializeGoogleButton()

    // Also set up an interval to retry a few times if the container isn't ready yet
    const retryInterval = setInterval(() => {
      if (googleButtonRef.current) {
        initializeGoogleButton()
        clearInterval(retryInterval)
      }
    }, 500)

    // Clean up interval after a reasonable timeout (5 seconds)
    const timeout = setTimeout(() => {
      clearInterval(retryInterval)
    }, 5000)

    return () => {
      clearInterval(retryInterval)
      clearTimeout(timeout)
    }
  }, [googleScriptLoaded])

  const handleGoogleResponse = async (response: any) => {
    console.log("Google response received:", response)
    setIsLoading(true)
    setError(null)

    try {
      const result = await apiClient.googleAuth(response.credential)

      if (result.success) {
        toast({
          title: "Success",
          description: "Logged in successfully",
        })
        router.push("/dashboard")
      } else {
        setError(result.message || "Failed to login with Google")
        toast({
          title: "Error",
          description: result.message || "Failed to login with Google",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Google auth error:", error)
      setError("An error occurred during Google login")
      toast({
        title: "Error",
        description: "An error occurred during Google login",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
  
    console.log("Login attempt with:", { email, password });
    console.log("API URL:", process.env.NEXT_PUBLIC_API_URL);
  
    try {
      console.log("Calling apiClient.login...");
      const result = await apiClient.login(email, password);
      console.log("Login result:", result);
  
      if (result.success) {
        toast({
          title: "Success",
          description: "Logged in successfully",
        });
        router.push("/dashboard");
      } else {
        // Set backend error message as the error state
        setError(result.message || "Invalid credentials");
        toast({
          title: "Error",
          description: result.message || "Invalid credentials",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("An error occurred during login. Please try again.");
      toast({
        title: "Error",
        description: "An error occurred during login",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  

  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <Link href="/" className="absolute left-4 top-4 md:left-8 md:top-8">
        <Button variant="ghost" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </Link>

      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>Enter your credentials to access your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Display error message if there is one */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Credential login form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="/reset-password" className="text-xs text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Login"}
            </Button>
          </form>

          {/* Divider with "or" text */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          {/* Social login options */}
          <div className="flex flex-col space-y-3">
            <div ref={googleButtonRef} className="flex justify-center min-h-[40px]"></div>
            {(!googleScriptLoaded || !window.google) && (
              <div className="text-sm text-center text-muted-foreground">Loading Google Sign-In...</div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col">
          <div className="text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-primary hover:underline">
              Sign up
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
