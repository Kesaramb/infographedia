'use client'

import { useState, useCallback } from 'react'

/**
 * Optimistic UI hook for like/save toggle actions.
 *
 * Updates the UI immediately, then calls the server.
 * Rolls back on failure.
 */
export function useOptimisticToggle(
  initialState: boolean,
  initialCount: number
) {
  const [isActive, setIsActive] = useState(initialState)
  const [count, setCount] = useState(initialCount)

  const toggle = useCallback(
    async (serverAction?: () => Promise<boolean>) => {
      // Optimistic update
      const wasActive = isActive
      const prevCount = count
      setIsActive(!wasActive)
      setCount(wasActive ? prevCount - 1 : prevCount + 1)

      if (serverAction) {
        try {
          const success = await serverAction()
          if (!success) {
            // Rollback
            setIsActive(wasActive)
            setCount(prevCount)
          }
        } catch {
          // Rollback on error
          setIsActive(wasActive)
          setCount(prevCount)
        }
      }
    },
    [isActive, count]
  )

  return { isActive, count, toggle }
}
