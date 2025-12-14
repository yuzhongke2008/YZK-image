import type { ImageDetails } from '@z-image/shared'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Check,
  Download,
  Eye,
  EyeOff,
  ImageIcon,
  Info,
  Loader2,
  Maximize2,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ImageComparison } from '@/components/ui/ImageComparison'
import { upscaleImage } from '@/lib/api'

interface ImageResultCardProps {
  imageDetails: ImageDetails | null
  loading: boolean
  elapsed: number
  showInfo: boolean
  isBlurred: boolean
  isUpscaled: boolean
  isUpscaling: boolean
  setShowInfo: (v: boolean) => void
  setIsBlurred: (v: boolean) => void
  handleUpscale: () => void
  handleDownload: () => void
  handleDelete: () => void
}

export function ImageResultCard({
  imageDetails,
  loading,
  elapsed,
  showInfo,
  isBlurred,
  isUpscaled,
  isUpscaling: externalIsUpscaling,
  setShowInfo,
  setIsBlurred,
  handleUpscale: externalHandleUpscale,
  handleDownload,
  handleDelete,
}: ImageResultCardProps) {
  // Comparison mode state
  const [isComparing, setIsComparing] = useState(false)
  const [tempUpscaledUrl, setTempUpscaledUrl] = useState<string | null>(null)
  const [isUpscalingLocal, setIsUpscalingLocal] = useState(false)
  const [displayUrl, setDisplayUrl] = useState<string | null>(null)

  // Fullscreen preview state
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [scale, setScale] = useState(1)

  // Use display URL if set (after applying upscale), otherwise original
  const currentImageUrl = displayUrl || imageDetails?.url

  // Combined upscaling state
  const isUpscaling = externalIsUpscaling || isUpscalingLocal

  // Handle upscale with comparison
  const handleUpscaleWithCompare = async () => {
    if (!currentImageUrl || isUpscaling || isUpscaled) return

    setIsUpscalingLocal(true)
    try {
      const result = await upscaleImage(currentImageUrl, 4)

      if (result.success && result.data.url) {
        setTempUpscaledUrl(result.data.url)
        setIsComparing(true)
        toast.success('4x upscale complete! Drag slider to compare.')
      } else if (!result.success) {
        toast.error(result.error || 'Upscale failed')
      }
    } catch (err) {
      toast.error('Upscale failed')
    } finally {
      setIsUpscalingLocal(false)
    }
  }

  // Confirm upscaled image
  const handleConfirmUpscale = useCallback(() => {
    if (tempUpscaledUrl) {
      setDisplayUrl(tempUpscaledUrl)
      setTempUpscaledUrl(null)
      setIsComparing(false)
      // Call external handler to update parent state
      externalHandleUpscale()
      toast.success('Upscaled image applied!')
    }
  }, [tempUpscaledUrl, externalHandleUpscale])

  // Cancel comparison
  const handleCancelComparison = useCallback(() => {
    setTempUpscaledUrl(null)
    setIsComparing(false)
  }, [])

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setScale((s) => Math.min(s * 1.5, 8))
  }, [])

  const handleZoomOut = useCallback(() => {
    setScale((s) => Math.max(s / 1.5, 1))
  }, [])

  const handleResetZoom = useCallback(() => {
    setScale(1)
  }, [])

  return (
    <>
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-zinc-500 text-sm font-normal">Result</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800 group">
            {imageDetails ? (
              <>
                {isComparing && tempUpscaledUrl && currentImageUrl ? (
                  /* Comparison mode in card */
                  <div className="relative">
                    <ImageComparison
                      beforeImage={currentImageUrl}
                      afterImage={tempUpscaledUrl}
                      beforeLabel="Original"
                      afterLabel="4x Upscaled"
                      className="w-full"
                    />
                  </div>
                ) : (
                  /* Normal image display */
                  <img
                    src={currentImageUrl || ''}
                    alt="Generated"
                    className={`w-full transition-all duration-300 ${isBlurred ? 'blur-xl' : ''}`}
                  />
                )}

                {/* Floating Toolbar */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none">
                  <div className="pointer-events-auto flex items-center gap-1 p-1.5 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 shadow-2xl transition-opacity duration-300 opacity-100 md:opacity-0 md:group-hover:opacity-100">
                    {isComparing ? (
                      /* Comparison mode toolbar */
                      <>
                        <button
                          type="button"
                          onClick={handleCancelComparison}
                          title="Cancel"
                          className="flex items-center justify-center w-10 h-10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all"
                        >
                          <X className="w-5 h-5" />
                        </button>
                        <div className="w-px h-5 bg-white/10" />
                        <span className="px-2 text-xs text-white/60">Drag to compare</span>
                        <div className="w-px h-5 bg-white/10" />
                        <button
                          type="button"
                          onClick={handleConfirmUpscale}
                          title="Apply upscaled image"
                          className="flex items-center justify-center w-10 h-10 rounded-xl text-green-400 hover:text-green-300 hover:bg-green-500/10 transition-all"
                        >
                          <Check className="w-5 h-5" />
                        </button>
                      </>
                    ) : (
                      /* Normal mode toolbar */
                      <>
                        {/* Info */}
                        <button
                          type="button"
                          onClick={() => setShowInfo(!showInfo)}
                          title="Details"
                          className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all ${
                            showInfo
                              ? 'bg-orange-600 text-white'
                              : 'text-white/70 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          <Info className="w-5 h-5" />
                        </button>
                        <div className="w-px h-5 bg-white/10" />
                        {/* Fullscreen */}
                        <button
                          type="button"
                          onClick={() => setIsFullscreen(true)}
                          title="Fullscreen"
                          className="flex items-center justify-center w-10 h-10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all"
                        >
                          <Maximize2 className="w-5 h-5" />
                        </button>
                        <div className="w-px h-5 bg-white/10" />
                        {/* 4x Upscale */}
                        <button
                          type="button"
                          onClick={handleUpscaleWithCompare}
                          disabled={isUpscaling || isUpscaled}
                          title={
                            isUpscaling
                              ? 'Upscaling...'
                              : isUpscaled
                                ? 'Already upscaled'
                                : '4x Upscale'
                          }
                          className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all ${
                            isUpscaled
                              ? 'text-orange-400 bg-orange-500/10'
                              : 'text-white/70 hover:text-white hover:bg-white/10'
                          } disabled:cursor-not-allowed`}
                        >
                          {isUpscaling ? (
                            <Loader2 className="w-5 h-5 animate-spin text-orange-400" />
                          ) : (
                            <span className="text-xs font-bold">4x</span>
                          )}
                        </button>
                        <div className="w-px h-5 bg-white/10" />
                        {/* Blur Toggle */}
                        <button
                          type="button"
                          onClick={() => setIsBlurred(!isBlurred)}
                          title="Toggle Blur"
                          className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all ${
                            isBlurred
                              ? 'text-orange-400 bg-white/10'
                              : 'text-white/70 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          {isBlurred ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                        <div className="w-px h-5 bg-white/10" />
                        {/* Download */}
                        <button
                          type="button"
                          onClick={handleDownload}
                          title="Download"
                          className="flex items-center justify-center w-10 h-10 rounded-xl transition-all text-white/70 hover:text-white hover:bg-white/10"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                        {/* Delete */}
                        <button
                          type="button"
                          onClick={handleDelete}
                          title="Delete"
                          className="flex items-center justify-center w-10 h-10 rounded-xl transition-all text-white/70 hover:text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Info Panel */}
                {showInfo && !isComparing && (
                  <div className="absolute top-3 left-3 right-3 p-3 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 text-xs text-zinc-300 space-y-1">
                    <div>
                      <span className="text-zinc-500">Provider:</span> {imageDetails.provider}
                    </div>
                    <div>
                      <span className="text-zinc-500">Model:</span> {imageDetails.model}
                    </div>
                    <div>
                      <span className="text-zinc-500">Dimensions:</span> {imageDetails.dimensions}
                    </div>
                    <div>
                      <span className="text-zinc-500">Duration:</span> {imageDetails.duration}
                    </div>
                    <div>
                      <span className="text-zinc-500">Seed:</span> {imageDetails.seed}
                    </div>
                    <div>
                      <span className="text-zinc-500">Steps:</span> {imageDetails.steps}
                    </div>
                    <div>
                      <span className="text-zinc-500">Upscaled:</span>{' '}
                      {isUpscaled ? 'Yes (4x)' : 'No'}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="aspect-square flex flex-col items-center justify-center text-zinc-600">
                {loading ? (
                  <>
                    <div className="w-12 h-12 border-4 border-zinc-800 border-t-orange-500 rounded-full animate-spin mb-3" />
                    <span className="text-zinc-400 font-mono text-lg">{elapsed.toFixed(1)}s</span>
                    <span className="text-zinc-600 text-sm mt-1">Creating your image...</span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-12 h-12 text-zinc-700 mb-2" />
                    <span className="text-zinc-600 text-sm">Your image will appear here</span>
                  </>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Fullscreen Preview Modal */}
      <AnimatePresence>
        {isFullscreen && currentImageUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center"
            onClick={() => {
              setIsFullscreen(false)
              setScale(1)
            }}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => {
                setIsFullscreen(false)
                setScale(1)
              }}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
            >
              <X size={24} />
            </button>

            {/* Image */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                transform: `scale(${scale})`,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={currentImageUrl}
                alt="Preview"
                className={`max-w-[90vw] max-h-[80vh] object-contain rounded-lg shadow-2xl transition-all duration-300 ${
                  isBlurred ? 'blur-xl' : ''
                }`}
                draggable={false}
              />
            </motion.div>

            {/* Bottom toolbar */}
            <div
              className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              role="toolbar"
            >
              <div className="pointer-events-auto flex items-center gap-1 p-1.5 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 shadow-2xl">
                {/* Info */}
                <button
                  type="button"
                  onClick={() => setShowInfo(!showInfo)}
                  title="Details"
                  className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all ${
                    showInfo
                      ? 'bg-orange-600 text-white'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Info className="w-5 h-5" />
                </button>
                <div className="w-px h-5 bg-white/10" />

                {/* Zoom controls */}
                <button
                  type="button"
                  onClick={handleZoomOut}
                  disabled={scale <= 1}
                  title="Zoom out"
                  className="flex items-center justify-center w-10 h-10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ZoomOut className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={handleResetZoom}
                  title="Reset zoom"
                  className="flex items-center justify-center px-2 h-10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all text-xs font-medium min-w-[3rem]"
                >
                  {Math.round(scale * 100)}%
                </button>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  disabled={scale >= 8}
                  title="Zoom in"
                  className="flex items-center justify-center w-10 h-10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ZoomIn className="w-5 h-5" />
                </button>
                <div className="w-px h-5 bg-white/10" />

                {/* Blur Toggle */}
                <button
                  type="button"
                  onClick={() => setIsBlurred(!isBlurred)}
                  title="Toggle Blur"
                  className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all ${
                    isBlurred
                      ? 'text-orange-400 bg-white/10'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {isBlurred ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
                <div className="w-px h-5 bg-white/10" />

                {/* Download */}
                <button
                  type="button"
                  onClick={handleDownload}
                  title="Download"
                  className="flex items-center justify-center w-10 h-10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all"
                >
                  <Download className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Info overlay in fullscreen */}
            {showInfo && imageDetails && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute top-20 left-4 p-4 rounded-xl bg-zinc-900/90 border border-zinc-700 text-sm text-zinc-300 space-y-2 max-w-xs"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between">
                  <span className="text-zinc-500">Provider</span>
                  <span>{imageDetails.provider}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Model</span>
                  <span>{imageDetails.model}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Size</span>
                  <span>{imageDetails.dimensions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Duration</span>
                  <span>{imageDetails.duration}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Seed</span>
                  <span className="font-mono">{imageDetails.seed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Upscaled</span>
                  <span>{isUpscaled ? 'Yes (4x)' : 'No'}</span>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
