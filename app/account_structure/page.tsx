'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { 
  ViewType, 
  NetworkEntity,
} from '@/lib/klarna-network-structure';
import { EndpointPreset } from '@/lib/types';
import DiagramViewToggle from '@/components/DiagramViewToggle';
import EntityDetailPanel from '@/components/EntityDetailPanel';
import {
  InformationCircleIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';

// Dynamically import the diagram component to avoid SSR issues with React Flow
const KlarnaNetworkDiagram = dynamic(
  () => import('@/components/KlarnaNetworkDiagram'),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-sm text-gray-500">Loading diagram...</p>
        </div>
      </div>
    ),
  }
);

export default function AccountStructurePage() {
  const router = useRouter();
  const [view, setView] = useState<ViewType>('acquirer');
  const [selectedEntity, setSelectedEntity] = useState<NetworkEntity | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  const handleEntitySelect = useCallback((entity: NetworkEntity | null) => {
    setSelectedEntity(entity);
    if (entity) {
      setIsPanelOpen(true);
    }
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedEntity(null);
  }, []);

  const handleEndpointClick = useCallback((endpoint: EndpointPreset) => {
    // Navigate to main page with the endpoint selected
    // Store the endpoint ID in sessionStorage for the main page to pick up
    sessionStorage.setItem('selectedEndpointId', endpoint.id);
    router.push('/');
  }, [router]);

  const handleViewChange = useCallback((newView: ViewType) => {
    setView(newView);
    setSelectedEntity(null);
  }, []);

  return (
    <div className="h-[calc(100vh-57px)] flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-gray-900">
            Account Structure
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
          <Link
            href="/account_structure/onboarding"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
          >
            <DocumentTextIcon className="w-4 h-4" />
            <span>Onboarding Payload</span>
          </Link>
          <div className="h-6 w-px bg-gray-200" />
          <DiagramViewToggle 
            currentView={view} 
            onViewChange={handleViewChange} 
          />
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border-b border-blue-100 px-4 py-2">
        <div className="flex items-center gap-2 text-sm text-blue-700">
          <InformationCircleIcon className="w-4 h-4 shrink-0" />
          <span>
            {view === 'partner' 
              ? 'Partner View shows how a merchant\'s account is structured with Payment Products, Business Entities, Brands, and Stores.'
              : 'Acquirer View shows how an Acquiring Partner manages Payment Profiles, Acquiring Accounts, and Settlement configurations.'
            }
          </span>
          <a
            href="https://docs.klarna.com/klarna-network-distribution/onboard-and-manage-your-partners/accounts-types-and-structure/how-partner-accounts-work/"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-blue-600 hover:text-blue-800 hover:underline whitespace-nowrap"
          >
            Learn more →
          </a>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Diagram Area */}
        <div className="flex-1 min-w-0">
          <KlarnaNetworkDiagram
            view={view}
            selectedEntityId={selectedEntity?.id || null}
            onEntitySelect={handleEntitySelect}
          />
        </div>

        {/* Detail Panel */}
        <div 
          className={`
            border-l bg-white transition-all duration-300 ease-in-out
            ${isPanelOpen ? 'w-[420px]' : 'w-0'}
          `}
        >
          {isPanelOpen && (
            <EntityDetailPanel
              entity={selectedEntity}
              view={view}
              onClose={handleClosePanel}
              onEndpointClick={handleEndpointClick}
            />
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white border-t px-4 py-2">
        <div className="flex items-center gap-6 text-xs text-gray-600">
          <span className="font-medium text-gray-700">Legend:</span>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-[#EBF5FF] border border-[#3B82F6]" />
            <span>Account</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-[#F0FDF4] border border-[#22C55E]" />
            <span>Product</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-[#FEF3C7] border border-[#F59E0B]" />
            <span>Entity</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-[#FCE7F3] border border-[#EC4899]" />
            <span>Store/Brand</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-[#E0E7FF] border border-[#6366F1]" />
            <span>Profile</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-[#F3E8FF] border border-[#A855F7]" />
            <span>Config</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-[#ECFDF5] border border-[#10B981]" />
            <span>Credential</span>
          </div>
          <div className="ml-auto flex items-center gap-1 text-gray-400">
            <svg className="w-8 h-3" viewBox="0 0 32 12">
              <line x1="0" y1="6" x2="24" y2="6" stroke="#94a3b8" strokeWidth="2" />
              <polygon points="24,2 32,6 24,10" fill="#94a3b8" />
            </svg>
            <span>Relationship</span>
          </div>
        </div>
      </div>
    </div>
  );
}
