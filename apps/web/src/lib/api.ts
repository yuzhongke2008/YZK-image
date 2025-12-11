/**
 * Unified API Client
 *
 * Provides a unified interface for image generation across providers
 */

import type {
  GenerateErrorResponse,
  GenerateRequest,
  GenerateSuccessResponse,
  UpscaleRequest,
  UpscaleResponse,
} from '@z-image/shared'
import { PROVIDER_CONFIGS, type ProviderType } from './constants'

const API_URL = import.meta.env.VITE_API_URL || ''

/** API response type */
export type ApiResponse<T> = { success: true; data: T } | { success: false; error: string }

/** Generate image request options */
export interface GenerateOptions {
  provider: ProviderType
  prompt: string
  negativePrompt?: string
  width: number
  height: number
  steps?: number
  seed?: number
  model?: string
}

/** Auth token for API calls */
export interface AuthToken {
  token?: string
}

/**
 * Generate image using the unified API
 */
export async function generateImage(
  options: GenerateOptions,
  auth: AuthToken
): Promise<ApiResponse<GenerateSuccessResponse>> {
  const { provider, prompt, negativePrompt, width, height, steps, seed, model } = options
  const { token } = auth

  const providerConfig = PROVIDER_CONFIGS[provider]
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }

  if (token && providerConfig) {
    headers[providerConfig.authHeader] = token
  }

  const body: GenerateRequest = {
    provider,
    model: model || 'z-image-turbo',
    prompt,
    negativePrompt,
    width,
    height,
    steps,
    seed,
  }

  try {
    const response = await fetch(`${API_URL}/api/generate`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    const data = await response.json()

    if (!response.ok) {
      const errorData = data as GenerateErrorResponse
      return { success: false, error: errorData.error || 'Failed to generate image' }
    }

    return { success: true, data: data as GenerateSuccessResponse }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Network error',
    }
  }
}

/**
 * Upscale image using RealESRGAN
 */
export async function upscaleImage(
  url: string,
  scale = 4,
  hfToken?: string
): Promise<ApiResponse<UpscaleResponse>> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }

  if (hfToken) {
    headers['X-HF-Token'] = hfToken
  }

  const body: UpscaleRequest = { url, scale }

  try {
    const response = await fetch(`${API_URL}/api/upscale`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to upscale image' }
    }

    return { success: true, data: data as UpscaleResponse }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Network error',
    }
  }
}
