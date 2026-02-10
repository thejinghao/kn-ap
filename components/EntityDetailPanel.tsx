'use client';

import React from 'react';
import { 
  ViewType,
  NetworkEntity, 
  entityColors, 
  getRelatedEndpoints 
} from '@/lib/klarna-network-structure';
import { staticEndpointPresets } from '@/lib/endpoints';
import { EndpointPreset } from '@/lib/types';
import {
  XMarkIcon,
  ArrowTopRightOnSquareIcon,
  DocumentTextIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

interface EntityDetailPanelProps {
  entity: NetworkEntity | null;
  view?: ViewType;
  onClose: () => void;
  onEndpointClick?: (endpoint: EndpointPreset) => void;
}

// Group endpoints by operation type
function categorizeEndpoint(endpoint: EndpointPreset): 'create' | 'read' | 'update' | 'delete' {
  const method = endpoint.method;
  const name = endpoint.name.toLowerCase();
  
  if (method === 'POST' && !name.includes('disable')) return 'create';
  if (method === 'DELETE' || name.includes('disable')) return 'delete';
  if (method === 'PATCH' || method === 'PUT') return 'update';
  return 'read';
}

const operationIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  create: PlusIcon,
  read: EyeIcon,
  update: PencilIcon,
  delete: TrashIcon,
};

const operationColors: Record<string, string> = {
  create: 'text-green-600 bg-green-50 border-green-200',
  read: 'text-blue-600 bg-blue-50 border-blue-200',
  update: 'text-amber-600 bg-amber-50 border-amber-200',
  delete: 'text-red-600 bg-red-50 border-red-200',
};

export default function EntityDetailPanel({ 
  entity, 
  view,
  onClose,
  onEndpointClick 
}: EntityDetailPanelProps) {
  if (!entity) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 p-6">
        <div className="text-center">
          <DocumentTextIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm">Click on a node to see details</p>
        </div>
      </div>
    );
  }

  const colors = entityColors[entity.type];
  const endpointIds = getRelatedEndpoints(entity.id);
  const endpoints = endpointIds
    .map(id => staticEndpointPresets.find(e => e.id === id))
    .filter((e): e is EndpointPreset => e !== undefined);

  // Group endpoints by operation
  const groupedEndpoints = endpoints.reduce((acc, endpoint) => {
    const category = categorizeEndpoint(endpoint);
    if (!acc[category]) acc[category] = [];
    acc[category].push(endpoint);
    return acc;
  }, {} as Record<string, EndpointPreset[]>);

  const operationOrder = ['create', 'read', 'update', 'delete'];

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div 
        className="p-4 border-b flex items-start justify-between"
        style={{ backgroundColor: colors.bg, borderColor: colors.border }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span 
              className="px-2 py-0.5 text-xs font-medium rounded capitalize"
              style={{ backgroundColor: colors.border, color: 'white' }}
            >
              {entity.type}
            </span>
          </div>
          <h3 
            className="text-lg font-semibold truncate"
            style={{ color: colors.text }}
          >
            {(view && entity.displayNameByView?.[view]) ?? entity.name}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-white/50 transition-colors"
        >
          <XMarkIcon className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Description */}
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Description
          </h4>
          <p className="text-sm text-gray-700 leading-relaxed">
            {entity.longDescription || entity.description}
          </p>
        </div>

        {/* Documentation Link */}
        {entity.documentation && (
          <div>
            <a
              href={entity.documentation}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              <ArrowTopRightOnSquareIcon className="w-4 h-4" />
              View Documentation
            </a>
          </div>
        )}

        {/* Endpoints */}
        {endpoints.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Related Endpoints ({endpoints.length})
            </h4>
            <div className="space-y-3">
              {operationOrder.map(operation => {
                const ops = groupedEndpoints[operation];
                if (!ops || ops.length === 0) return null;

                const Icon = operationIcons[operation];
                const colorClass = operationColors[operation];

                return (
                  <div key={operation}>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`w-4 h-4 ${colorClass.split(' ')[0]}`} />
                      <span className="text-xs font-medium text-gray-600 uppercase">
                        {operation}
                      </span>
                    </div>
                    <div className="space-y-1.5 pl-6">
                      {ops.map(endpoint => (
                        <button
                          key={endpoint.id}
                          onClick={() => onEndpointClick?.(endpoint)}
                          className={`w-full text-left p-2 rounded border text-xs transition-all hover:shadow-sm ${colorClass}`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold shrink-0">
                              {endpoint.method}
                            </span>
                            <span className="font-medium truncate">
                              {endpoint.name}
                            </span>
                          </div>
                          <div className="mt-1 font-mono text-[10px] opacity-70 truncate">
                            {endpoint.endpoint}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
