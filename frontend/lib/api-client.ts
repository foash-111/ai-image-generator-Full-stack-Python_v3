// API client for interacting with the backend
class ApiClient {
  private token: string | null = null
  private baseUrl: string = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
  private retryCount = 3
  private retryDelay = 1000 // 1 second

  constructor() {
    // Initialize token from localStorage if available
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("token")
    }
    console.log("API Client initialized with base URL:", this.baseUrl)
  }

  // Set the authentication token
  setToken(token: string) {
    this.token = token
    if (typeof window !== "undefined") {
      localStorage.setItem("token", token)
    }
  }

  // Clear the authentication token
  clearToken() {
    this.token = null
    if (typeof window !== "undefined") {
      localStorage.removeItem("token")
    }
  }

  // Get the headers for API requests
  private getHeaders() {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
       "Access-Control-Allow-Origin": "http://localhost:3000",
    }

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`
    }

    return headers
  }

  // Helper function to retry a fetch request
  private async retryFetch(url: string, options: RequestInit, attempt = 1): Promise<Response> {
    try {
      const response = await fetch(url, options)
      return response
    } catch (error) {
      if (attempt >= this.retryCount) {
        throw error
      }
      console.log(`Retry attempt ${attempt} for ${url}`)
      await new Promise((resolve) => setTimeout(resolve, this.retryDelay))
      return this.retryFetch(url, options, attempt + 1)
    }
  }

  // Make a GET request
  async get(url: string) {
    console.log(`Making GET request to ${this.baseUrl}${url}`)
    try {
      const response = await this.retryFetch(`${this.baseUrl}${url}`, {
        method: "GET",
        headers: this.getHeaders(),
      })

      if (!response.ok) {
        console.error(`HTTP error ${response.status}: ${response.statusText}`)
        return {
          success: false,
          message: `HTTP error ${response.status}: ${response.statusText}`,
          status: response.status,
        }
      }

      const contentType = response.headers.get("content-type")
      if (contentType && contentType.includes("application/json")) {
        const jsonResponse = await response.json()
        console.log(`GET response:`, jsonResponse)
        return jsonResponse
      } else {
        const textResponse = await response.text()
        console.log(`GET text response:`, textResponse)
        return { success: false, message: "Unexpected response format" }
      }
    } catch (error) {
      console.error(`Error in GET to ${url}:`, error)
      return {
        success: false,
        message: "Network or parsing error",
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  // Make a POST request
  async post(url: string, data: any) {
    console.log(`Making POST request to ${this.baseUrl}${url}`, data);
  
    try {
      const response = await this.retryFetch(`${this.baseUrl}${url}`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });
  
      console.log(`Response status:`, response.status);
  
      // Extract backend error message if available
      const contentType = response.headers.get("content-type");
      let errorMessage = `HTTP error ${response.status}: ${response.statusText}`;
  
      if (contentType && contentType.includes("application/json")) {
        const jsonResponse = await response.json();
        console.log("JSON response:", jsonResponse);
  
        if (!response.ok) {
          errorMessage = jsonResponse.message || errorMessage;
          return { success: false, message: errorMessage, status: response.status };
        }
  
        return jsonResponse;
      } else {
        const textResponse = await response.text();
        console.log("Text response:", textResponse);
        return { success: false, message: textResponse || "Unexpected response format" };
      }
    } catch (error) {
      console.error(`Error in POST to ${url}:`, error);
      return {
        success: false,
        message: "Network or parsing error",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
  

  // Make a PUT request
  async put(url: string, data: any) {
    console.log(`Making PUT request to ${this.baseUrl}${url}`, data)
    try {
      const response = await this.retryFetch(`${this.baseUrl}${url}`, {
        method: "PUT",
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        console.error(`HTTP error ${response.status}: ${response.statusText}`)
        return {
          success: false,
          message: `HTTP error ${response.status}: ${response.statusText}`,
          status: response.status,
        }
      }

      const contentType = response.headers.get("content-type")
      if (contentType && contentType.includes("application/json")) {
        const jsonResponse = await response.json()
        console.log(`PUT response:`, jsonResponse)
        return jsonResponse
      } else {
        const textResponse = await response.text()
        console.log(`PUT text response:`, textResponse)
        return { success: false, message: "Unexpected response format" }
      }
    } catch (error) {
      console.error(`Error in PUT to ${url}:`, error)
      return {
        success: false,
        message: "Network or parsing error",
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  // Make a DELETE request
  async delete(url: string) {
    console.log(`Making DELETE request to ${this.baseUrl}${url}`)
    try {
      const response = await this.retryFetch(`${this.baseUrl}${url}`, {
        method: "DELETE",
        headers: this.getHeaders(),
      })

      if (!response.ok) {
        console.error(`HTTP error ${response.status}: ${response.statusText}`)
        return {
          success: false,
          message: `HTTP error ${response.status}: ${response.statusText}`,
          status: response.status,
        }
      }

      const contentType = response.headers.get("content-type")
      if (contentType && contentType.includes("application/json")) {
        const jsonResponse = await response.json()
        console.log(`DELETE response:`, jsonResponse)
        return jsonResponse
      } else {
        const textResponse = await response.text()
        console.log(`DELETE text response:`, textResponse)
        return { success: false, message: "Unexpected response format" }
      }
    } catch (error) {
      console.error(`Error in DELETE to ${url}:`, error)
      return {
        success: false,
        message: "Network or parsing error",
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  // Authentication methods
  async signup(name: string, email: string, password: string) {
    const response = await this.post("/api/auth/signup", { name, email, password })

    if (response.success && response.token) {
      this.setToken(response.token)
    }

    return response
  }

  async login(email: string, password: string) {
    console.log("API client login called with email:", email);
    console.log("Using base URL:", this.baseUrl);
  
    try {
      const response = await this.post("/api/auth/login", { email, password });
      console.log("Login response:", response);
  
      if (response.success && response.token) {
        console.log("Setting token:", response.token);
        this.setToken(response.token);
      }
  
      return response;
    } catch (error) {
      console.error("API client login error:", error);
      return {
        success: false,
        message: "Login failed due to network error",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
  
  async googleAuth(token: string) {
    const response = await this.post("/api/auth/google", { token })

    if (response.success && response.token) {
      this.setToken(response.token)
    }

    return response
  }

  async logout() {
    this.clearToken()
    return { success: true }
  }

  // Add these methods to the ApiClient class

  async requestPasswordReset(email: string) {
    return this.post("/api/auth/reset-password", { email })
  }

  async confirmPasswordReset(token: string, newPassword: string) {
    return this.post("/api/auth/reset-password-confirm", { token, newPassword })
  }

  // User profile methods
  async getProfile() {
    return this.get("/api/user/profile")
  }

  async updateProfile(data: { name?: string; avatarUrl?: string }) {
    console.log(`Making PUT request to update profile:`, data)
    try {
      const response = await this.retryFetch(`${this.baseUrl}/api/user/profile`, {
        method: "PUT",
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        console.error(`HTTP error ${response.status}: ${response.statusText}`)
        return {
          success: false,
          message: `HTTP error ${response.status}: ${response.statusText}`,
          status: response.status,
        }
      }

      const contentType = response.headers.get("content-type")
      if (contentType && contentType.includes("application/json")) {
        const jsonResponse = await response.json()
        console.log(`Profile update response:`, jsonResponse)
        return jsonResponse
      } else {
        const textResponse = await response.text()
        console.log(`Profile update text response:`, textResponse)
        return { success: false, message: "Unexpected response format" }
      }
    } catch (error) {
      console.error(`Error updating profile:`, error)
      return {
        success: false,
        message: "Network or parsing error",
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  async updatePassword(currentPassword: string, newPassword: string) {
    return this.put("/api/user/password", { currentPassword, newPassword })
  }

  async deleteAccount() {
    return this.delete("/api/user/account")
  }

  // Image methods
  async getImages(filter?: "all" | "loved" | "saved") {
    const url = filter && filter !== "all" ? `/api/images?filter=${filter}` : "/api/images"
    return this.get(url)
  }

  async getImage(id: string) {
    return this.get(`/api/images/${id}`)
  }

  async createImage(imageUrl: string, prompt: string) {
    return this.post("/api/images", { imageUrl, prompt })
  }

  async deleteImage(id: string) {
    return this.delete(`/api/images/${id}`)
  }

  async toggleLoveImage(id: string, isLoved: boolean) {
    return this.put(`/api/images/${id}/love`, { isLoved })
  }

  async toggleSaveImage(id: string, isSaved: boolean) {
    return this.put(`/api/images/${id}/save`, { isSaved })
  }

  async generateImage(prompt: string) {
    return this.post("/api/images/generate", { prompt })
  }
}

// Create and export a singleton instance
const apiClient = new ApiClient()
export default apiClient
