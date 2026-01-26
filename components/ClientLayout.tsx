'use client';

import React from 'react';
import { EnvironmentProvider } from '@/lib/env-context';
import HeaderWrapper from './HeaderWrapper';

interface ClientLayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <EnvironmentProvider>
      <HeaderWrapper />
      <main className="pt-[57px]">
        {children}
      </main>
    </EnvironmentProvider>
  );
}
