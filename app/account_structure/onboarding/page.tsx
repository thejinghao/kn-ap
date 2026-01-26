'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import PayloadViewer from '@/components/PayloadViewer';
import PayloadDetailPanel from '@/components/PayloadDetailPanel';
import {
  PayloadSection,
  payloadSections,
  getCrossReferencesForSection,
  CrossReference,
  entityColors,
  getSectionById,
} from '@/lib/onboarding-payload-structure';
import { EndpointPreset } from '@/lib/types';
import {
  InformationCircleIcon,
  ArrowLeftIcon,
  CubeTransparentIcon,
} from '@heroicons/react/24/outline';

export default function OnboardingPayloadPage() {
  const router = useRouter();
  const [selectedSection, setSelectedSection] = useState<PayloadSection | null>(null);
  const [highlightedReferences, setHighlightedReferences] = useState<CrossReference[]>([]);

  // Handle section selection
  const handleSectionSelect = useCallback((section: PayloadSection | null) => {
    setSelectedSection(section);
    
    // Highlight all references involving this section
    if (section) {
      const refs = getCrossReferencesForSection(section.id);
      setHighlightedReferences(refs);
    } else {
      setHighlightedReferences([]);
    }
  }, []);

  // Handle closing the panel
  const handleClosePanel = useCallback(() => {
    setSelectedSection(null);
    setHighlightedReferences([]);
  }, []);

  // Handle endpoint click - navigate to API tester
  const handleEndpointClick = useCallback((endpoint: EndpointPreset) => {
    sessionStorage.setItem('selectedEndpointId', endpoint.id);
    router.push('/');
  }, [router]);

  // Handle reference click - highlight and navigate to target section
  const handleReferenceClick = useCallback((reference: CrossReference) => {
    // Determine which section to navigate to
    const targetSectionId = reference.fromSectionId === selectedSection?.id
      ? reference.toSectionId
      : reference.fromSectionId;
    
    const targetSection = getSectionById(targetSectionId);
    if (targetSection) {
      setSelectedSection(targetSection);
      
      // Update highlighted references to show connections from new section
      const refs = getCrossReferencesForSection(targetSectionId);
      setHighlightedReferences(refs);
    }
  }, [selectedSection]);

  return (
    <div className="h-[calc(100vh-57px)] flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/account_structure')}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            <span>Account Structure</span>
          </button>
          <div className="h-6 w-px bg-gray-200" />
          <div className="flex items-center gap-2">
            <CubeTransparentIcon className="w-5 h-5 text-blue-600" />
            <h1 className="text-lg font-semibold text-gray-900">
              Onboarding Payload Explorer
            </h1>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border-b border-blue-100 px-4 py-2 shrink-0">
        <div className="flex items-center gap-2 text-sm text-blue-700">
          <InformationCircleIcon className="w-4 h-4 shrink-0" />
          <span>
            This is the payload structure for{' '}
            <a 
              href="https://docs.klarna.com/klarna-network-distribution/api/klarna-management-api/#tag/Onboard/operation/onboard"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold hover:underline"
            >
              POST /v2/distribution/onboard
            </a>{' '}
            - used to onboard a merchant with multiple payment accounts.
          </span>
        </div>
      </div>

      {/* Main Content - Split View */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Payload Viewer (60%) */}
        <div className="w-[60%] min-w-0 border-r">
          <PayloadViewer
            selectedSectionId={selectedSection?.id || null}
            onSectionSelect={handleSectionSelect}
            highlightedReferences={highlightedReferences}
          />
        </div>

        {/* Right: Detail Panel (40%) */}
        <div className="w-[40%] min-w-0">
          <PayloadDetailPanel
            section={selectedSection}
            onClose={handleClosePanel}
            onEndpointClick={handleEndpointClick}
            onReferenceClick={handleReferenceClick}
            highlightedReferences={highlightedReferences}
          />
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white border-t px-4 py-2 shrink-0">
        <div className="flex items-center gap-6 text-xs text-gray-600">
          <span className="font-medium text-gray-700">Legend:</span>
          <div className="flex items-center gap-1">
            <div 
              className="w-3 h-3 rounded border-2" 
              style={{ backgroundColor: entityColors.account.bg, borderColor: entityColors.account.border }}
            />
            <span>Account</span>
          </div>
          <div className="flex items-center gap-1">
            <div 
              className="w-3 h-3 rounded border-2" 
              style={{ backgroundColor: entityColors.product.bg, borderColor: entityColors.product.border }}
            />
            <span>Product</span>
          </div>
          <div className="flex items-center gap-1">
            <div 
              className="w-3 h-3 rounded border-2" 
              style={{ backgroundColor: entityColors.entity.bg, borderColor: entityColors.entity.border }}
            />
            <span>Business Entity</span>
          </div>
          <div className="flex items-center gap-1">
            <div 
              className="w-3 h-3 rounded border-2" 
              style={{ backgroundColor: entityColors.store.bg, borderColor: entityColors.store.border }}
            />
            <span>Brand/Store</span>
          </div>
          <div className="flex items-center gap-1">
            <div 
              className="w-3 h-3 rounded border-2" 
              style={{ backgroundColor: entityColors.profile.bg, borderColor: entityColors.profile.border }}
            />
            <span>Profile</span>
          </div>
          <div className="flex items-center gap-1">
            <div 
              className="w-3 h-3 rounded border-2" 
              style={{ backgroundColor: entityColors.config.bg, borderColor: entityColors.config.border }}
            />
            <span>Config</span>
          </div>
          <div className="ml-auto flex items-center gap-2 text-gray-400">
            <svg className="w-8 h-3" viewBox="0 0 32 12">
              <line x1="0" y1="6" x2="24" y2="6" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4,2" />
              <polygon points="24,2 32,6 24,10" fill="#94a3b8" />
            </svg>
            <span>Cross-reference</span>
          </div>
        </div>
      </div>
    </div>
  );
}
