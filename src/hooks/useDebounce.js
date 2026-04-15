import { useState, useEffect } from 'react'

/**
 * Debounces a value by the given delay.
 *
 * @param {*} value - The value to debounce
 * @param {number} delay - Delay in milliseconds (default 300)
 * @returns {*} The debounced value
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}
