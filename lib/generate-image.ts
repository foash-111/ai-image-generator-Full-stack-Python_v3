import apiClient from "./api-client"

export async function generateImage(prompt: string): Promise<{ imageUrl: string; imageId?: string }> {
  try {
    console.log("Generating image with prompt:", prompt)

    // With the async approach, we just make a single request and wait for the result
    const response = await apiClient.generateImage(prompt)
    console.log("Generate image response:", response)

    if (!response.success) {
      console.error("Failed to generate image:", response.message)
      throw new Error(response.message || "Failed to generate image")
    }

    if (!response.imageUrl) {
      console.error("No image URL in response:", response)
      throw new Error("No image URL returned from the server")
    }

    console.log("Image generated successfully:", response.imageUrl)
    return {
      imageUrl: response.imageUrl,
      imageId: response.imageId,
    }
  } catch (error) {
    console.error("Error generating image:", error)

    // Provide a more user-friendly error message
    let errorMessage = "Failed to generate image. Please try again later."

    if (error instanceof Error) {
      // If it's a network error, suggest checking the connection
      if (error.message.includes("Network") || error.message.includes("fetch")) {
        errorMessage = "Network error. Please check your internet connection and try again."
      } else if (error.message.includes("500")) {
        errorMessage =
          "Server error. The image generation service might be temporarily unavailable. Please try again later."
      } else {
        errorMessage = error.message
      }
    }

    throw new Error(errorMessage)
  }
}
