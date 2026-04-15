'use client'

import { useEffect } from 'react'

/**
 * Zuri Device Fingerprinting (ZDEV-TSK-20260410-025)
 * Generates a persistent device UUID and sets it as a cookie for NextAuth to read.
 */
export default function DeviceFingerprint() {
  useEffect(() => {
    // 1. Check/Generate persistent Device ID in LocalStorage
    let deviceId = localStorage.getItem('zuri_device_id')
    if (!deviceId) {
      deviceId = crypto.randomUUID()
      localStorage.setItem('zuri_device_id', deviceId)
    }

    // 2. Set Device ID as a cookie (valid for 365 days)
    // NextAuth can access this from headers in the authorize/jwt callbacks.
    const expires = new Date()
    expires.setFullYear(expires.getFullYear() + 1)
    
    document.cookie = `x-device-id=${deviceId}; path=/; expires=${expires.toUTCString()}; SameSite=Lax; Secure`
    
    console.log('[Auth] Device registered:', deviceId)
  }, [])

  return null // Invisible component
}
