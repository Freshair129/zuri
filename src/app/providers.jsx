'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from '@/context/ThemeContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { TenantProvider } from '@/context/TenantContext';

export default function Providers({ children, session }) {
  return (
    <SessionProvider session={session}>
      <TenantProvider>
        <LanguageProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </LanguageProvider>
      </TenantProvider>
    </SessionProvider>
  );
}
