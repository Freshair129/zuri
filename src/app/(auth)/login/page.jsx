'use client'
 
import { useState, Suspense, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import Link from 'next/link'
 
function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/overview'
 
  const [identity, setIdentity] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
 
  // Mouse Parallax Logic
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
 
  // High-end smooth springs
  const springConfig = { damping: 30, stiffness: 100 }
  const smoothX = useSpring(mouseX, springConfig)
  const smoothY = useSpring(mouseY, springConfig)
 
  const handleMouseMove = (e) => {
    const { clientX, clientY } = e
    const x = (clientX - window.innerWidth / 2) / 25
    const y = (clientY - window.innerHeight / 2) / 25
    mouseX.set(x)
    mouseY.set(y)
  }
 
  async function handleSubmit(e) {
    if (e) e.preventDefault()
    setError('')
    setLoading(true)
 
    try {
      const result = await signIn('credentials', {
        email: identity,
        password,
        redirect: false,
      })
 
      setLoading(false)
 
      if (result?.error) {
        setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง / Invalid email or password')
      } else {
        router.push(callbackUrl)
        router.refresh()
      }
    } catch (err) {
      setLoading(false)
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ / Connection error')
      console.error('[LoginPage]', err)
    }
  }
 
  return (
    <div 
      onMouseMove={handleMouseMove}
      className="font-body text-[#1A1710] selection:bg-brand/30 min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-[#F7F8FA]"
    >
      {/* Background Asset — AI Business Strategy (Light Mode) */}
      <motion.div 
        style={{ 
          x: useTransform(smoothX, (v) => v * 0.2),
          y: useTransform(smoothY, (v) => v * 0.2),
          scale: 1.05
        }}
        className="absolute inset-0 z-0"
      >
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-multiply"
          style={{ backgroundImage: 'url("/images/login-warm-bg.png")' }}
        />
        {/* Soft warmth gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#FFF8F0]/40 via-transparent to-[#FFF8F0]/40" />
      </motion.div>
 
      {/* Content wrapper */}
      <motion.main 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md px-6 z-10"
      >
        {/* Glass Login Card — Warm Minimalist */}
        <div className="glass-login-warm p-10 md:p-12 relative z-10 border-white/80 shadow-xl shadow-brand/5">
          {/* Logo */}
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 bg-gradient-to-br from-brand via-brand to-brand-dark rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-brand/20">
               <span className="font-headline font-bold text-3xl text-white">Z</span>
            </div>
            <h1 className="font-headline text-3xl font-bold text-[#1A1710] mb-2 tracking-tight">Zuri Platform</h1>
            <p className="text-[10px] font-label font-bold uppercase tracking-[0.4em] text-[#4A4435]/60">Silent Supporter Intelligence</p>
          </div>
 
          {/* Error banner */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-8 px-4 py-3 rounded-xl bg-red-50 text-red-600 text-[11px] font-medium text-center border border-red-100"
            >
              {error}
            </motion.div>
          )}
 
          {/* Form */}
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <label className="text-[11px] font-label font-bold uppercase tracking-widest text-[#4A4435]/50 ml-1" htmlFor="identity">Email or Identity</label>
              <input
                className="w-full bg-[#FFFFFF] border border-[#1A1710]/10 rounded-xl px-5 py-4 text-[#1A1710] font-body text-sm focus:outline-none focus:border-brand/50 focus:ring-4 focus:ring-brand/5 transition-all"
                id="identity"
                type="text"
                placeholder="name@company.com"
                value={identity}
                onChange={(e) => setIdentity(e.target.value)}
                required
                disabled={loading}
              />
            </div>
 
            <div className="space-y-1.5">
              <div className="flex items-center justify-between ml-1">
                <label className="text-[11px] font-label font-bold uppercase tracking-widest text-[#4A4435]/50" htmlFor="password">Security Password</label>
              </div>
              <div className="relative group">
                <input
                  className="w-full bg-[#FFFFFF] border border-[#1A1710]/10 rounded-xl px-5 py-4 text-[#1A1710] font-body text-sm focus:outline-none focus:border-brand/50 focus:ring-4 focus:ring-brand/5 transition-all"
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-[#4A4435]/30 hover:text-brand transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>
 
            <div className="pt-4">
              <button
                className="w-full btn-accent-premium text-white font-label font-bold text-xs uppercase tracking-[0.2em] py-5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-brand/20 active:scale-[0.98] transition-all"
                type="submit"
                disabled={loading}
              >
                {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
              </button>
            </div>
          </form>
 
          <div className="mt-8 text-center">
            <Link className="text-[10px] font-label font-bold uppercase tracking-widest text-[#4A4435]/40 hover:text-brand transition-colors" href="/forgot-password">
              Security Recovery / ลืมรหัสผ่าน?
            </Link>
          </div>
 
          <div className="mt-10 pt-8 border-t border-[#1A1710]/5 text-center">
            <p className="font-label text-[10px] text-[#4A4435]/50 uppercase tracking-widest leading-relaxed">
              Don't have an account?{' '}
              <Link className="text-brand font-bold hover:text-brand-dark transition-colors inline-block ml-1" href="/register">
                Contact Admin
              </Link>
            </p>
          </div>
        </div>
 
        <p className="mt-12 text-center font-label text-[0.55rem] uppercase tracking-[0.5em] text-[#4A4435]/30">
          © 2026 ZURI PLATFORM • ALL RIGHTS RESERVED
        </p>
      </motion.main>
    </div>
  )
}
 
import DeviceFingerprint from '@/components/auth/DeviceFingerprint'

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#F7F8FA]"><p className="text-[#1A1710] text-lg">Loading...</p></div>}>
      <DeviceFingerprint />
      <LoginForm />
    </Suspense>
  )
}
