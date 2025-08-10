"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import type { LoadingState, ApiError } from '@/types'

interface UseApiDataOptions<T> {
  initialData?: T
  enabledCondition?: boolean
  onSuccess?: (data: T) => void
  onError?: (error: ApiError) => void
  retryCount?: number
  retryDelay?: number
}

interface UseApiDataReturn<T> extends LoadingState {
  data: T | null
  refetch: () => Promise<void>
  retry: () => Promise<void>
}

export function useApiData<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList = [],
  options: UseApiDataOptions<T> = {}
): UseApiDataReturn<T> {
  const {
    initialData = null,
    enabledCondition = true,
    onSuccess,
    onError,
    retryCount = 3,
    retryDelay = 1000
  } = options

  const [data, setData] = useState<T | null>(initialData)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const abortControllerRef = useRef<AbortController | null>(null)
  const retryCountRef = useRef(0)

  const fetchData = useCallback(async (isRetry = false) => {
    if (!enabledCondition) {
      setIsLoading(false)
      return
    }

    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()

    try {
      setIsLoading(true)
      setError(null)

      const result = await fetcher()
      
      // Check if request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return
      }

      setData(result)
      retryCountRef.current = 0 // Reset retry count on success
      
      onSuccess?.(result)
    } catch (err) {
      // Don't set error if request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return
      }

      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      const apiError: ApiError = { 
        message: errorMessage,
        code: 'FETCH_ERROR',
        details: err instanceof Error ? { stack: err.stack } : {}
      }

      // Retry logic
      if (!isRetry && retryCountRef.current < retryCount) {
        retryCountRef.current++
        setTimeout(() => {
          fetchData(true)
        }, retryDelay * retryCountRef.current) // Exponential backoff
        return
      }

      setError(errorMessage)
      onError?.(apiError)
      
      console.error('API fetch error:', apiError)
    } finally {
      setIsLoading(false)
    }
  }, [fetcher, enabledCondition, onSuccess, onError, retryCount, retryDelay])

  const refetch = useCallback(async () => {
    retryCountRef.current = 0
    await fetchData(false)
  }, [fetchData])

  const retry = useCallback(async () => {
    await fetchData(true)
  }, [fetchData])

  useEffect(() => {
    fetchData()

    // Cleanup function to abort pending requests
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, deps)

  return {
    data,
    isLoading,
    error,
    refetch,
    retry
  }
}

// Specialized hooks for common data types
export function usePriceData() {
  return useApiData(
    async () => {
      const response = await fetch('/api/prices')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return response.json()
    },
    [],
    {
      onError: (error) => {
        console.error('Failed to fetch price data:', error)
      }
    }
  )
}

export function useDailySummary() {
  return useApiData(
    async () => {
      const response = await fetch('/api/prices?type=daily')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return response.json()
    },
    [],
    {
      onError: (error) => {
        console.error('Failed to fetch daily summary:', error)
      }
    }
  )
}

export function useMonthlySummary() {
  return useApiData(
    async () => {
      const response = await fetch('/api/prices?type=monthly')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return response.json()
    },
    [],
    {
      onError: (error) => {
        console.error('Failed to fetch monthly summary:', error)
      }
    }
  )
}

// Cache management for frequently accessed data
class ApiCache {
  private cache = new Map<string, { data: unknown; timestamp: number; ttl: number }>()

  set<T>(key: string, data: T, ttl = 5 * 60 * 1000) { // 5 minutes default TTL
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }

    const isExpired = Date.now() - entry.timestamp > entry.ttl
    
    if (isExpired) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  clear() {
    this.cache.clear()
  }

  delete(key: string) {
    this.cache.delete(key)
  }
}

export const apiCache = new ApiCache()

// Hook with caching support
export function useCachedApiData<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  deps: React.DependencyList = [],
  cacheTtl = 5 * 60 * 1000 // 5 minutes
) {
  return useApiData(
    async () => {
      // Check cache first
      const cachedData = apiCache.get<T>(cacheKey)
      if (cachedData) {
        return cachedData
      }

      // Fetch and cache
      const data = await fetcher()
      apiCache.set(cacheKey, data, cacheTtl)
      return data
    },
    deps,
    {
      onError: (error) => {
        console.error(`Cached API error for ${cacheKey}:`, error)
      }
    }
  )
}