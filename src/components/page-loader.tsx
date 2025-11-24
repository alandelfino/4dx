import { useEffect, useRef, useState } from 'react'

type PageLoaderProps = {
  active?: boolean
  height?: number
  className?: string
}

// Simple top-of-page progress bar that simulates page loading for ~1s on mount.
export function PageLoader({ active = true, height = 2, className = '' }: PageLoaderProps) {
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<number | null>(null)
  const completeRef = useRef<number | null>(null)

  useEffect(() => {
    if (!active) return
    setVisible(true)
    setProgress(10)

    // Simulate gradual progress up to ~90%
    timerRef.current = window.setInterval(() => {
      setProgress((p) => Math.min(90, p + 8 + Math.random() * 12))
    }, 120)

    // Complete after ~1s
    completeRef.current = window.setTimeout(() => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      setProgress(100)
      // Small delay to let the bar reach 100% and then fade out
      window.setTimeout(() => setVisible(false), 300)
    }, 1000)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      if (completeRef.current) {
        clearTimeout(completeRef.current)
        completeRef.current = null
      }
      // Finish on unmount to avoid lingering
      setProgress(100)
      window.setTimeout(() => setVisible(false), 200)
    }
  }, [active])

  if (!visible) return null

  return (
    <div className={`fixed left-0 right-0 top-0 z-50 pointer-events-none ${className}`}>
      <div
        className="h-[2px] bg-blue-500 dark:bg-blue-400"
        style={{ width: `${progress}%`, height }}
      />
    </div>
  )
}

export default PageLoader