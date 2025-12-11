/**
 * Image Generator Hook
 *
 * Core state management and API calls for image generation
 */

import { generateImage, upscaleImage } from '@/lib/api'
import {
  ASPECT_RATIOS,
  DEFAULT_NEGATIVE_PROMPT,
  DEFAULT_PROMPT,
  PROVIDER_CONFIGS,
  type ProviderType,
  getDefaultModel,
  getModelsByProvider,
  loadSettings,
  saveSettings,
} from '@/lib/constants'
import { encryptAndStoreToken, loadAllTokens } from '@/lib/crypto'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

export function useImageGenerator() {
  const [tokens, setTokens] = useState<Record<ProviderType, string>>({
    gitee: '',
    huggingface: '',
    modelscope: '',
  })
  const [provider, setProvider] = useState<ProviderType>(
    () => loadSettings().provider ?? 'huggingface'
  )
  const [model, setModel] = useState(() => loadSettings().model ?? 'z-image-turbo')
  const [prompt, setPrompt] = useState(() => loadSettings().prompt ?? DEFAULT_PROMPT)
  const [negativePrompt, setNegativePrompt] = useState(
    () => loadSettings().negativePrompt ?? DEFAULT_NEGATIVE_PROMPT
  )
  const [width, setWidth] = useState(() => loadSettings().width ?? 1024)
  const [height, setHeight] = useState(() => loadSettings().height ?? 1024)
  const [steps, setSteps] = useState(() => loadSettings().steps ?? 9)
  const [loading, setLoading] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(() =>
    localStorage.getItem('lastImageUrl')
  )
  const [status, setStatus] = useState('Ready.')
  const [elapsed, setElapsed] = useState(0)
  const [selectedRatio, setSelectedRatio] = useState(() => loadSettings().selectedRatio ?? '1:1')
  const [uhd, setUhd] = useState(() => loadSettings().uhd ?? false)
  const [upscale8k] = useState(() => loadSettings().upscale8k ?? false)
  const [showInfo, setShowInfo] = useState(false)
  const [isBlurred, setIsBlurred] = useState(() => localStorage.getItem('isBlurred') === 'true')
  const [isUpscaled, setIsUpscaled] = useState(false)
  const [isUpscaling, setIsUpscaling] = useState(false)
  const initialized = useRef(false)

  // Get current token for selected provider
  const currentToken = tokens[provider]

  // Get models for current provider
  const availableModels = getModelsByProvider(provider)

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true
      loadAllTokens().then(setTokens)
    }
  }, [])

  // Update model when provider changes
  useEffect(() => {
    const models = getModelsByProvider(provider)
    if (!models.find((m) => m.id === model)) {
      setModel(getDefaultModel(provider))
    }
  }, [provider, model])

  useEffect(() => {
    if (initialized.current) {
      saveSettings({
        prompt,
        negativePrompt,
        width,
        height,
        steps,
        selectedRatio,
        uhd,
        upscale8k,
        provider,
        model,
      })
    }
  }, [prompt, negativePrompt, width, height, steps, selectedRatio, uhd, upscale8k, provider, model])

  useEffect(() => {
    if (imageUrl) {
      localStorage.setItem('lastImageUrl', imageUrl)
    } else {
      localStorage.removeItem('lastImageUrl')
    }
  }, [imageUrl])

  useEffect(() => {
    localStorage.setItem('isBlurred', String(isBlurred))
  }, [isBlurred])

  useEffect(() => {
    if (!loading) return
    setElapsed(0)
    const timer = setInterval(() => setElapsed((e) => e + 0.1), 100)
    return () => clearInterval(timer)
  }, [loading])

  const saveToken = async (p: ProviderType, token: string) => {
    setTokens((prev) => ({ ...prev, [p]: token }))
    await encryptAndStoreToken(p, token)
    if (token) toast.success(`${PROVIDER_CONFIGS[p].name} token saved`)
  }

  const addStatus = (msg: string) => {
    setStatus((prev) => `${prev}\n${msg}`)
  }

  const handleRatioSelect = (ratio: (typeof ASPECT_RATIOS)[number]) => {
    setSelectedRatio(ratio.label)
    const preset = uhd ? ratio.presets[1] : ratio.presets[0]
    setWidth(preset.w)
    setHeight(preset.h)
  }

  const handleUhdToggle = (enabled: boolean) => {
    setUhd(enabled)
    const ratio = ASPECT_RATIOS.find((r) => r.label === selectedRatio)
    if (ratio) {
      const preset = enabled ? ratio.presets[1] : ratio.presets[0]
      setWidth(preset.w)
      setHeight(preset.h)
    }
  }

  const handleDownload = () => {
    if (!imageUrl) return
    const a = document.createElement('a')
    a.href = imageUrl
    a.download = `zenith-${Date.now()}.jpg`
    a.click()
  }

  const handleUpscale = async () => {
    if (!imageUrl || isUpscaling || isUpscaled) return
    setIsUpscaling(true)
    addStatus('Upscaling to 4x...')

    const result = await upscaleImage(imageUrl, 4, tokens.huggingface || undefined)

    if (result.success && result.data.url) {
      setImageUrl(result.data.url)
      setIsUpscaled(true)
      addStatus('4x upscale complete!')
      toast.success('Image upscaled to 4x!')
    } else {
      addStatus(`Upscale failed: ${result.success ? 'No URL returned' : result.error}`)
      toast.error('Upscale failed')
    }

    setIsUpscaling(false)
  }

  const handleDelete = () => {
    setImageUrl(null)
    setIsUpscaled(false)
    setIsBlurred(false)
    setShowInfo(false)
    toast.success('Image deleted')
  }

  const handleGenerate = async () => {
    const providerConfig = PROVIDER_CONFIGS[provider]
    if (providerConfig.requiresAuth && !currentToken) {
      toast.error(`Please configure your ${providerConfig.name} token first`)
      return
    }

    setLoading(true)
    setImageUrl(null)
    setIsUpscaled(false)
    setIsBlurred(false)
    setShowInfo(false)
    setStatus('Initializing...')

    try {
      addStatus(`Sending request to ${providerConfig.name}...`)

      const result = await generateImage(
        {
          provider,
          prompt,
          negativePrompt,
          width,
          height,
          steps,
          model,
        },
        { token: currentToken || undefined }
      )

      if (!result.success) {
        throw new Error(result.error)
      }

      let generatedUrl =
        result.data.url ||
        (result.data.b64_json ? `data:image/png;base64,${result.data.b64_json}` : undefined)

      if (!generatedUrl) throw new Error('No image returned')
      addStatus('Image generated!')

      // Auto upscale to 8K if enabled
      if (upscale8k && generatedUrl.startsWith('http')) {
        addStatus('Upscaling to 8K...')
        const upResult = await upscaleImage(generatedUrl, 4, tokens.huggingface || undefined)

        if (upResult.success && upResult.data.url) {
          generatedUrl = upResult.data.url
          addStatus('8K upscale complete!')
        } else {
          addStatus(`8K upscale failed: ${upResult.success ? 'No URL' : upResult.error}`)
          toast.error('8K upscale failed, showing original image')
        }
      }

      setImageUrl(generatedUrl ?? null)
      toast.success('Image generated!')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An error occurred'
      addStatus(`Error: ${msg}`)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return {
    // State
    tokens,
    currentToken,
    provider,
    model,
    availableModels,
    prompt,
    negativePrompt,
    width,
    height,
    steps,
    loading,
    imageUrl,
    status,
    elapsed,
    selectedRatio,
    uhd,
    showInfo,
    isBlurred,
    isUpscaled,
    isUpscaling,
    // Setters
    setProvider,
    setModel,
    setPrompt,
    setNegativePrompt,
    setWidth,
    setHeight,
    setSteps,
    setShowInfo,
    setIsBlurred,
    // Handlers
    saveToken,
    handleRatioSelect,
    handleUhdToggle,
    handleDownload,
    handleUpscale,
    handleDelete,
    handleGenerate,
  }
}
