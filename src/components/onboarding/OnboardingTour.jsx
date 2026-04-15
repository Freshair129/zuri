// Created At: 2026-04-10 12:50:00 +07:00 (v1.0.0)
// Previous version: —
// Last Updated: 2026-04-10 12:50:00 +07:00 (v1.0.0)

'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight, Info, Sparkles, Layout, Database, MessageSquare } from 'lucide-react'
import Button from '@/components/ui/Button'

/**
 * Onboarding Tour Component — MT-4 UI Polish
 * 
 * A premium guided walkthrough for first-time tenants.
 * Highlights key areas of the Zuri platform using glassmorphism and smooth motion.
 */

const TOUR_STEPS = [
  {
    title: 'Welcome to your Workspace',
    description: 'We have provisioned your database with industry-specific seed data, including sample products and POS configurations.',
    icon: Sparkles,
  },
  {
    title: 'The Smart Sidebar',
    description: 'Access CRM, POS, and Kitchen modules from the left panel. Each module is fully isolated to your tenant subdomain.',
    icon: Layout,
  },
  {
    title: 'AI Insights',
    description: 'Your Daily Briefs will appear here. The AI is already processing data to give you actionable insights by tomorrow morning.',
    icon: MessageSquare,
  },
  {
    title: 'Connect Channels',
    description: 'Head to Settings > Integrations to link your LINE Official Account and Facebook Pages to start the AI automation.',
    icon: Database,
  }
]

export default function OnboardingTour({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0)

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(s => s + 1)
    } else {
      onComplete()
    }
  }

  const StepIcon = TOUR_STEPS[currentStep].icon

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-gray-900/40 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-lg bg-white/90 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden relative"
      >
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-[#E8820C] to-transparent opacity-50" />

        <div className="p-8 md:p-10">
          <div className="flex justify-between items-start mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center">
                <StepIcon className="w-6 h-6 text-[#E8820C]" />
              </div>
              <div>
                <span className="text-xs font-bold text-[#E8820C] uppercase tracking-widest">
                  Quick Tour {currentStep + 1}/{TOUR_STEPS.length}
                </span>
                <h3 className="text-xl font-bold text-gray-900">{TOUR_STEPS[currentStep].title}</h3>
              </div>
            </div>
            <button 
              onClick={onComplete}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.p 
              key={currentStep}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="text-gray-600 leading-relaxed text-lg"
            >
              {TOUR_STEPS[currentStep].description}
            </motion.p>
          </AnimatePresence>

          <div className="mt-10 flex items-center justify-between">
            {/* Step Indicators */}
            <div className="flex gap-1.5">
              {TOUR_STEPS.map((_, idx) => (
                <div 
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentStep ? 'w-8 bg-[#E8820C]' : 'w-1.5 bg-gray-200'}`}
                />
              ))}
            </div>

            <Button 
              variant="amber" 
              onClick={handleNext} 
              className="px-8 py-3 rounded-xl font-bold text-sm shadow-lg shadow-orange-100 group"
            >
              {currentStep === TOUR_STEPS.length - 1 ? 'Finish' : 'Next'}
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </div>
        </div>

        <div className="px-8 py-4 bg-orange-50/50 border-t border-orange-100 flex items-center gap-2">
          <Info className="w-4 h-4 text-[#E8820C]" />
          <span className="text-[10px] font-bold text-orange-800 uppercase tracking-tight">
            Pro Tip: You can always access the help center from the sidebar.
          </span>
        </div>
      </motion.div>
    </motion.div>
  )
}
