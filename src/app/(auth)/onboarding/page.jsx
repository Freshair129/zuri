// Created At: 2026-04-10 04:50:00 +07:00 (v1.0.0)
// Previous version: 2026-04-10 04:50:00 +07:00 (v1.0.0)
// Last Updated: 2026-04-10 05:10:00 +07:00 (v1.1.0)

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Check, Rocket, School, User, Sparkles } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { completeOnboarding } from './actions';
import { useRouter } from 'next/navigation';
import OnboardingTour from '@/components/onboarding/OnboardingTour';

const STEPS = [
  { id: 'account', title: 'Account', icon: User },
  { id: 'school', title: 'School', icon: School },
  { id: 'connect', title: 'Connect', icon: Rocket }
];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showTour, setShowTour] = useState(false);
  const [newTenant, setNewTenant] = useState(null);
  const router = useRouter();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    tenantName: '',
    industry: 'culinary'
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const nextStep = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
  const prevStep = () => setStep(s => Math.max(s - 1, 0));

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);

    const data = new FormData();
    Object.entries(formData).forEach(([k, v]) => data.append(k, v));

    const result = await completeOnboarding(data);
    
    if (result.success) {
      setNewTenant({
        slug: result.tenantSlug,
        name: result.tenantName
      });
      setStep(STEPS.length); // Success view
    } else {
      setError(result.error);
      setLoading(false);
    }
  };

  const handleGoToDashboard = () => {
    if (newTenant?.slug) {
      const isDev = window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1');
      if (isDev) {
        // In local development, we use query params as simulated subdomains in middleware.js
        router.push(`/overview?tenant=${newTenant.slug}`);
      } else {
        // Production: redirect to subdomain.
        window.location.href = `https://${newTenant.slug}.zuri.app/overview`;
      }
    } else {
      router.push('/login');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF8F0] to-[#FDE8D0] flex items-center justify-center p-4 selection:bg-orange-100">
      
      {/* Background patterns */}
      <div className="absolute inset-0 thai-pattern-overlay opacity-20 pointer-events-none" />

      <div className="w-full max-w-xl relative">
        {/* Branding Header */}
        <div className="text-center mb-10">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center justify-center gap-2 mb-4"
          >
            <div className="w-10 h-10 bg-[#E8820C] rounded-xl flex items-center justify-center shadow-lg">
              <Sparkles className="text-white w-6 h-6" />
            </div>
            <span className="text-2xl font-bold text-gray-900 tracking-tight">Zuri</span>
          </motion.div>
          <h1 className="text-3xl font-bold text-gray-900 leading-tight">Welcome to Zuri</h1>
          <p className="text-gray-500 mt-2 font-medium">Set up your workspace in just 3 steps</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-between mb-10 px-6 relative">
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-200 -translate-y-1/2 -z-10 mx-6 block w-[calc(100%-48px)]" />
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            const isActive = step >= idx;
            const isCurrent = step === idx;
            return (
              <div key={s.id} className="flex flex-col items-center gap-2">
                <motion.div 
                  animate={{ 
                    backgroundColor: isActive ? '#E8820C' : '#FFFFFF',
                    borderColor: isActive ? '#E8820C' : '#E5E7EB',
                    scale: isCurrent ? 1.1 : 1
                  }}
                  className={`w-10 h-10 rounded-full border-2 flex items-center justify-center relative transition-all shadow-sm ${isActive ? 'text-white' : 'text-gray-400'}`}
                >
                  {step > idx ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                </motion.div>
                <span className={`text-xs font-bold tracking-wide uppercase ${isActive ? 'text-[#E8820C]' : 'text-gray-400'}`}>
                  {s.title}
                </span>
              </div>
            );
          })}
        </div>

        {/* Form Container */}
        <div className="glass-login-warm p-8 md:p-10 min-h-[400px] flex flex-col">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div 
                key="step0"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="space-y-6 flex-grow"
              >
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-gray-800">Account Details</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="First Name" name="firstName" value={formData.firstName} onChange={handleInputChange} placeholder="John" />
                    <Input label="Last Name" name="lastName" value={formData.lastName} onChange={handleInputChange} placeholder="Doe" />
                  </div>
                  <Input label="Work Email" type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="john@school.com" />
                  <Input label="Password" type="password" name="password" value={formData.password} onChange={handleInputChange} placeholder="••••••••" />
                </div>
                <div className="pt-4 flex justify-end">
                  <Button variant="amber" onClick={nextStep} className="px-8 py-3 rounded-xl font-bold uppercase tracking-wider text-sm">
                    Next Step <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="space-y-6 flex-grow"
              >
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-gray-800">Business Details</h2>
                  <Input label="School / Salon Name" name="tenantName" value={formData.tenantName} onChange={handleInputChange} placeholder="The Grand Culinary School" />
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Industry</label>
                    <select 
                      name="industry"
                      value={formData.industry}
                      onChange={handleInputChange}
                      className="w-full h-12 px-4 bg-white/50 border border-gray-100 rounded-xl outline-none focus:border-[#E8820C] transition-all"
                    >
                      <option value="culinary">Culinary School</option>
                      <option value="beauty">Beauty & Salon</option>
                      <option value="fitness">Fitness Studio</option>
                    </select>
                  </div>
                </div>
                <div className="pt-4 flex justify-between">
                  <Button variant="secondary" onClick={prevStep} className="px-6 rounded-xl font-bold">
                    <ChevronLeft className="w-4 h-4" /> Back
                  </Button>
                  <Button variant="amber" onClick={nextStep} className="px-8 rounded-xl font-bold uppercase tracking-wider text-sm">
                    Next Step <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="space-y-6 text-center flex-grow flex flex-col justify-center"
              >
                <div className="py-6">
                  <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Rocket className="w-10 h-10 text-[#E8820C] animate-bounce" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800">Ready for Launch?</h2>
                  <p className="text-gray-500 mt-2">
                    Click below to provision your workspace. This will set up your database, initial inventory, and AI agents.
                  </p>
                </div>
                {error && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}
                <div className="pt-4 flex justify-between">
                  <Button variant="secondary" onClick={prevStep} className="px-6 rounded-xl font-bold" disabled={loading}>
                    Back
                  </Button>
                  <Button variant="amber" onClick={handleSubmit} loading={loading} className="px-10 rounded-xl font-bold uppercase tracking-wider text-md py-4">
                    Provision My Workspace
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                key="success"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="space-y-8 text-center flex-grow flex flex-col justify-center"
              >
                <div>
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Check className="w-10 h-10 text-green-600" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-800">Setup Complete!</h2>
                  <p className="text-gray-500 mt-4 leading-relaxed">
                    Your workspace for <strong>{newTenant?.name || formData.tenantName}</strong> is ready. 
                    The industry-specific tools and initial database have been provisioned.
                  </p>
                </div>
                <div className="pt-4 space-y-3">
                  <Button variant="amber" onClick={() => setShowTour(true)} className="w-full rounded-xl font-bold uppercase tracking-wider text-md py-4 shadow-lg shadow-orange-200">
                    Take a Quick Tour
                  </Button>
                  <button 
                    onClick={handleGoToDashboard}
                    className="text-gray-400 text-sm font-bold hover:text-[#E8820C] transition-colors uppercase tracking-widest"
                  >
                    Skip to Dashboard
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Tour Overlay */}
        <AnimatePresence>
          {showTour && <OnboardingTour onComplete={handleGoToDashboard} />}
        </AnimatePresence>

        {/* Footer info */}
        <p className="text-center text-xs text-gray-400 mt-8">
          By continuing, you agree to our <span className="underline decoration-orange-200">Terms of Service</span> and <span className="underline decoration-orange-200">Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
}
