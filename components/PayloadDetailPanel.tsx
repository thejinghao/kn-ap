'use client';

import React from 'react';
import {
  PayloadSection,
  getSectionById,
  getCrossReferencesForSection,
  CrossReference,
  entityColors,
} from '@/lib/onboarding-payload-structure';
import { staticEndpointPresets } from '@/lib/klarna-endpoints';
import { EndpointPreset } from '@/lib/types';
import {
  XMarkIcon,
  ArrowTopRightOnSquareIcon,
  DocumentTextIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';

interface PayloadDetailPanelProps {
  section: PayloadSection | null;
  onClose: () => void;
  onEndpointClick?: (endpoint: EndpointPreset) => void;
  onReferenceClick?: (reference: CrossReference) => void;
  highlightedReferences: CrossReference[];
}

// Method colors for endpoints
const methodColors: Record<string, string> = {
  GET: 'text-blue-600 bg-blue-50 border-blue-200',
  POST: 'text-green-600 bg-green-50 border-green-200',
  PATCH: 'text-amber-600 bg-amber-50 border-amber-200',
  PUT: 'text-orange-600 bg-orange-50 border-orange-200',
  DELETE: 'text-red-600 bg-red-50 border-red-200',
};

export default function PayloadDetailPanel({
  section,
  onClose,
  onEndpointClick,
  onReferenceClick,
  highlightedReferences,
}: PayloadDetailPanelProps) {
  if (!section) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 p-6">
        <div className="text-center">
          <DocumentTextIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-medium mb-1">Click on any section</p>
          <p className="text-xs text-gray-400">
            Select a part of the payload to see its details and relationships
          </p>
        </div>
      </div>
    );
  }

  const colors = entityColors[section.entityType];
  
  // Get related endpoints
  const endpoints = section.relatedEndpoints
    .map(id => staticEndpointPresets.find(e => e.id === id))
    .filter((e): e is EndpointPreset => e !== undefined);

  // Get cross-references for this section
  const references = getCrossReferencesForSection(section.id);
  const outgoingRefs = references.filter(r => r.fromSectionId === section.id);
  const incomingRefs = references.filter(r => r.toSectionId === section.id);

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div
        className="p-4 border-b flex items-start justify-between shrink-0"
        style={{ backgroundColor: colors.bg, borderColor: colors.border }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="px-2 py-0.5 text-xs font-medium rounded capitalize"
              style={{ backgroundColor: colors.border, color: 'white' }}
            >
              {section.entityType}
            </span>
          </div>
          <h3
            className="text-lg font-semibold leading-tight"
            style={{ color: colors.text }}
          >
            {section.name}
          </h3>
          <p className="text-xs mt-1 opacity-80 font-mono" style={{ color: colors.text }}>
            {section.path}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-white/50 transition-colors"
        >
          <XMarkIcon className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Description */}
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Description
          </h4>
          <p className="text-sm text-gray-700 leading-relaxed">
            {section.longDescription || section.description}
          </p>
        </div>

        {/* Documentation Link */}
        {section.documentation && (
          <div>
            <a
              href={section.documentation}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              <ArrowTopRightOnSquareIcon className="w-4 h-4" />
              View Documentation
            </a>
          </div>
        )}

        {/* Outgoing References */}
        {outgoingRefs.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <ArrowRightIcon className="w-3.5 h-3.5" />
              References To
            </h4>
            <div className="space-y-2">
              {outgoingRefs.map(ref => {
                const targetSection = getSectionById(ref.toSectionId);
                if (!targetSection) return null;
                
                const targetColors = entityColors[targetSection.entityType];
                const isHighlighted = highlightedReferences.some(r => r.id === ref.id);
                
                return (
                  <button
                    key={ref.id}
                    onClick={() => onReferenceClick?.(ref)}
                    className={`
                      w-full text-left p-3 rounded-lg border transition-all
                      ${isHighlighted 
                        ? 'ring-2 shadow-sm' 
                        : 'hover:shadow-sm'
                      }
                    `}
                    style={{
                      backgroundColor: targetColors.bg,
                      borderColor: targetColors.border,
                      ...(isHighlighted && { '--tw-ring-color': ref.color } as React.CSSProperties),
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <LinkIcon className="w-4 h-4 shrink-0" style={{ color: targetColors.text }} />
                      <span className="font-medium text-sm" style={{ color: targetColors.text }}>
                        {targetSection.shortName}
                      </span>
                    </div>
                    <div className="mt-1.5 text-xs font-mono opacity-70" style={{ color: targetColors.text }}>
                      {ref.value}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Incoming References */}
        {incomingRefs.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <ArrowLeftIcon className="w-3.5 h-3.5" />
              Referenced By
            </h4>
            <div className="space-y-2">
              {incomingRefs.map(ref => {
                const sourceSection = getSectionById(ref.fromSectionId);
                if (!sourceSection) return null;
                
                const sourceColors = entityColors[sourceSection.entityType];
                const isHighlighted = highlightedReferences.some(r => r.id === ref.id);
                
                return (
                  <button
                    key={ref.id}
                    onClick={() => onReferenceClick?.(ref)}
                    className={`
                      w-full text-left p-3 rounded-lg border transition-all
                      ${isHighlighted 
                        ? 'ring-2 shadow-sm' 
                        : 'hover:shadow-sm'
                      }
                    `}
                    style={{
                      backgroundColor: sourceColors.bg,
                      borderColor: sourceColors.border,
                      ...(isHighlighted && { '--tw-ring-color': ref.color } as React.CSSProperties),
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <LinkIcon className="w-4 h-4 shrink-0" style={{ color: sourceColors.text }} />
                      <span className="font-medium text-sm" style={{ color: sourceColors.text }}>
                        {sourceSection.shortName}
                      </span>
                    </div>
                    <div className="mt-1.5 text-xs font-mono opacity-70" style={{ color: sourceColors.text }}>
                      via {ref.fromPath.split('.').pop()}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Related Endpoints */}
        {endpoints.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Related Endpoints ({endpoints.length})
            </h4>
            <div className="space-y-2">
              {endpoints.map(endpoint => {
                const colorClass = methodColors[endpoint.method] || methodColors.GET;
                
                return (
                  <button
                    key={endpoint.id}
                    onClick={() => onEndpointClick?.(endpoint)}
                    className={`w-full text-left p-3 rounded-lg border text-sm transition-all hover:shadow-sm ${colorClass}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-xs px-1.5 py-0.5 rounded bg-white/50">
                        {endpoint.method}
                      </span>
                      <span className="font-medium truncate">
                        {endpoint.name}
                      </span>
                    </div>
                    <div className="mt-1.5 font-mono text-xs opacity-70 truncate">
                      {endpoint.endpoint}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {endpoints.length === 0 && outgoingRefs.length === 0 && incomingRefs.length === 0 && (
          <div className="text-sm text-gray-500 italic">
            No direct endpoints or references for this section
          </div>
        )}
      </div>

      {/* Footer with path info */}
      <div className="shrink-0 p-3 bg-gray-50 border-t">
        <div className="text-xs text-gray-500">
          <span className="font-medium">JSON Path:</span>{' '}
          <code className="bg-gray-200 px-1.5 py-0.5 rounded text-gray-700">
            {section.path}
          </code>
        </div>
      </div>
    </div>
  );
}
