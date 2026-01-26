'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Cog6ToothIcon,
  XMarkIcon,
  CubeTransparentIcon,
  ChevronDownIcon,
  RectangleGroupIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import EnvironmentPanel from './EnvironmentPanel';
import { useEnvironment } from '@/lib/env-context';

export default function Header() {
  const [showEnvPanel, setShowEnvPanel] = useState(false);
  const [showStructureMenu, setShowStructureMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { variables } = useEnvironment();
  const pathname = usePathname();

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowStructureMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isStructurePage = pathname?.startsWith('/account_structure');

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-300">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <h1 className="text-base font-semibold text-gray-900">
                  Klarna Network for Acquiring Partners
                </h1>
              </Link>
              
              {/* Navigation */}
              <nav className="flex items-center gap-1 ml-2">
                {/* API Tester Link */}
                <Link
                  href="/"
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${
                    pathname === '/'
                      ? 'text-gray-900 font-semibold'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <span>API Tester</span>
                </Link>
                
                {/* Account Structure Dropdown */}
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setShowStructureMenu(!showStructureMenu)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${
                      isStructurePage
                        ? 'text-gray-900 font-semibold'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <CubeTransparentIcon className="w-4 h-4" />
                    <span>Account Structure</span>
                    <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform ${showStructureMenu ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {showStructureMenu && (
                    <div className="absolute left-0 top-full mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                      <Link
                        href="/account_structure"
                        onClick={() => setShowStructureMenu(false)}
                        className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                          pathname === '/account_structure'
                            ? 'bg-gray-50 text-gray-900'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <RectangleGroupIcon className="w-4 h-4 text-gray-500" />
                        <div>
                          <div className="font-medium">Entity Diagram</div>
                          <div className="text-xs text-gray-500">Interactive account structure</div>
                        </div>
                      </Link>
                      <Link
                        href="/account_structure/onboarding"
                        onClick={() => setShowStructureMenu(false)}
                        className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                          pathname === '/account_structure/onboarding'
                            ? 'bg-gray-50 text-gray-900'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <DocumentTextIcon className="w-4 h-4 text-gray-500" />
                        <div>
                          <div className="font-medium">Onboarding Payload</div>
                          <div className="text-xs text-gray-500">Explore the payload structure</div>
                        </div>
                      </Link>
                    </div>
                  )}
                </div>
              </nav>
            </div>
            
            {/* Environment Variables Icon */}
            <button
              onClick={() => setShowEnvPanel(!showEnvPanel)}
              className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Environment Variables"
            >
              <Cog6ToothIcon className="h-5 w-5" />
              {Object.keys(variables).length > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[10px] font-semibold bg-klarna-black text-white rounded-full min-w-[18px] text-center">
                  {Object.keys(variables).length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Environment Panel Modal */}
      {showEnvPanel && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center pt-16 px-4 bg-black/50" onClick={() => setShowEnvPanel(false)}>
          <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[calc(100vh-8rem)] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-900">Environment Variables</h2>
              <button
                onClick={() => setShowEnvPanel(false)}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto">
              <EnvironmentPanel isModal={true} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
