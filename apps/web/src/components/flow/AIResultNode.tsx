import { memo, useEffect, useState, useRef } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Sparkles, Download, Trash2, Eye, EyeOff } from 'lucide-react'
import { loadAllTokens } from '@/lib/crypto'
import { loadSettings, type ProviderType } from '@/lib/constants'

import type { GeneratedImage } from '@/lib/flow-storage'

export type AIResultNodeData = {
  prompt: string
  width: number
  height: number
  aspectRatio: string
  model: string
  seed?: number
  imageUrl?: string // Pre-loaded image URL (for restored nodes)
  duration?: number // Generation time (for restored nodes)
  onImageGenerated?: (nodeId: string, image: GeneratedImage) => void
  onDelete?: (id: string) => void
}

async function generateImageApi(
  prompt: string,
  width: number,
  height: number,
  provider: ProviderType,
  token: string,
  model: string,
  seed?: number
): Promise<string> {
  const baseUrl = import.meta.env.VITE_API_URL || ''
  const { PROVIDER_CONFIGS } = await import('@/lib/constants')
  const providerConfig = PROVIDER_CONFIGS[provider]

  const res = await fetch(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { [providerConfig.authHeader]: token }),
    },
    body: JSON.stringify({
      provider,
      prompt,
      model,
      width,
      height,
      steps: 9,
      ...(typeof seed === 'number' ? { seed } : {}),
    }),
  })

  const text = await res.text()
  if (!text) throw new Error('Empty response from server')

  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(`Invalid response: ${text.slice(0, 100)}`)
  }

  if (!res.ok) throw new Error(data.error || 'Failed to generate')
  return data.url || `data:image/png;base64,${data.b64_json}`
}

function AIResultNode({ id, data }: NodeProps) {
  const {
    prompt,
    width,
    height,
    aspectRatio,
    model,
    seed,
    imageUrl: preloadedUrl,
    duration: preloadedDuration,
    onImageGenerated,
    onDelete,
  } = data as AIResultNodeData
  const [imageUrl, setImageUrl] = useState<string | null>(preloadedUrl || null)
  const [loading, setLoading] = useState(!preloadedUrl)
  const [error, setError] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(preloadedDuration || 0)
  const [isBlurred, setIsBlurred] = useState(false)
  const startTimeRef = useRef(0)
  const generatingRef = useRef(false)

  // Timer for elapsed time
  useEffect(() => {
    if (!loading) return
    const interval = setInterval(() => {
      setElapsed((Date.now() - startTimeRef.current) / 1000)
    }, 100)
    return () => clearInterval(interval)
  }, [loading])

  useEffect(() => {
    // Skip generation if image is already loaded (restored node)
    if (preloadedUrl) return

    // Prevent double execution from React StrictMode
    if (generatingRef.current) return
    generatingRef.current = true
    ;(async () => {
      startTimeRef.current = Date.now()
      const settings = loadSettings()
      const provider = (settings.provider as ProviderType) ?? 'huggingface'
      const selectedModel = settings.model || 'z-image-turbo'

      const tokens = await loadAllTokens()
      const token = tokens[provider]

      const { PROVIDER_CONFIGS } = await import('@/lib/constants')
      if (PROVIDER_CONFIGS[provider].requiresAuth && !token) {
        setError('No API Token')
        setLoading(false)
        return
      }

      try {
        const url = await generateImageApi(prompt, width, height, provider, token, selectedModel, seed)
        setImageUrl(url)
        setLoading(false)
        const duration = (Date.now() - startTimeRef.current) / 1000
        onImageGenerated?.(id, {
          id,
          url,
          prompt,
          aspectRatio,
          timestamp: Date.now(),
          model,
          seed,
          duration,
          isBlurred: false,
          isUpscaled: false,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate')
        setLoading(false)
      }
    })()
  }, [prompt, width, height, aspectRatio, model, seed, id, onImageGenerated])

  const handleDownload = () => {
    if (!imageUrl) return
    const a = document.createElement('a')
    a.href = imageUrl
    a.download = `zenith-${Date.now()}.png`
    a.click()
  }

  return (
    <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-700 rounded-xl p-4 min-w-[280px] shadow-2xl">
      <Handle type="target" position={Position.Top} className="!bg-orange-500" />

      <div className="relative w-[256px] h-[256px] rounded-lg overflow-hidden bg-zinc-800 mb-3 group">
        {loading ? (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-zinc-700 border-t-orange-500 rounded-full animate-spin mb-3" />
            <span className="text-zinc-400 font-mono text-lg">{elapsed.toFixed(1)}s</span>
            <span className="text-zinc-600 text-sm mt-1">Creating your image...</span>
          </div>
        ) : error ? (
          <div className="w-full h-full flex items-center justify-center p-4">
            <span className="text-red-400 text-sm text-center">{error}</span>
          </div>
        ) : (
          <>
            <img
              src={imageUrl!}
              alt="Generated"
              className={`w-full h-full object-cover transition-all duration-300 ${isBlurred ? 'blur-xl' : ''}`}
            />
            {/* Floating Toolbar */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-none">
              <div className="pointer-events-auto flex items-center gap-1 p-1 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 shadow-2xl transition-opacity duration-300 opacity-0 group-hover:opacity-100">
                <button
                  onClick={() => setIsBlurred(!isBlurred)}
                  title="Toggle Blur"
                  className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${
                    isBlurred
                      ? 'text-orange-400 bg-white/10'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {isBlurred ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <div className="w-px h-4 bg-white/10" />
                <button
                  onClick={handleDownload}
                  title="Download"
                  className="flex items-center justify-center w-8 h-8 rounded-lg transition-all text-white/70 hover:text-white hover:bg-white/10"
                >
                  <Download className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-white/10" />
                <button
                  onClick={() => onDelete?.(id)}
                  title="Delete"
                  className="flex items-center justify-center w-8 h-8 rounded-lg transition-all text-white/70 hover:text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <Sparkles size={12} className="text-yellow-500" />
        <span>{model}</span>
        {!loading && !error && <span className="text-zinc-600">• {elapsed.toFixed(1)}s</span>}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-zinc-600" />
    </div>
  )
}

export default memo(AIResultNode)
