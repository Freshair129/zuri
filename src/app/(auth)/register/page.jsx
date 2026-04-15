'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Register Page
 * Redirects to the enhanced onboarding flow (M5 MT-4)
 */
export default function RegisterPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/onboarding');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-[#E8820C] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#E8820C] font-bold animate-pulse">Launching Onboard Flow...</p>
      </div>
    </div>
  );
}
