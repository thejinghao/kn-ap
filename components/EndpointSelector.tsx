'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { EndpointPreset, HttpMethod } from '@/lib/types';

interface EndpointSelectorProps {
  selectedEndpoint: EndpointPreset | null;
  onSelectEndpoint: (preset: EndpointPreset) => void;
  onUseCustom: () => void;
}

interface FolderStructure {
  name: string;
  path: string;
  presets: EndpointPreset[];
  subfolders: FolderStructure[];
}

// Method badge colors
const METHOD_BADGE_STYLES: Record<HttpMethod, string> = {
  GET: 'bg-blue-100 text-blue-700',
  POST: 'bg-green-100 text-green-700',
  PATCH: 'bg-yellow-100 text-yellow-700',
  PUT: 'bg-yellow-100 text-yellow-700',
  DELETE: 'bg-red-100 text-red-700',
};

export default function EndpointSelector({
  selectedEndpoint,
  onSelectEndpoint,
  onUseCustom,
}: EndpointSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [hierarchy, setHierarchy] = useState<FolderStructure | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dropdownPosition, setDropdownPosition] = useState<'top' | 'bottom'>('top');
  const [maxHeight, setMaxHeight] = useState(500);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load endpoints from API on mount
  useEffect(() => {
    async function loadEndpoints() {
      try {
        const response = await fetch('/api/endpoints');
        const data = await response.json();
        
        if (data.success) {
          setHierarchy(data.hierarchy);
          console.log(`✓ Loaded ${data.totalEndpoints} API endpoints with hierarchy`);
        } else {
          console.error('Failed to load endpoints:', data.error);
        }
      } catch (error) {
        console.error('Error fetching endpoints:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadEndpoints();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calculate dropdown position and max height when opening
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceAbove = triggerRect.top;
      const spaceBelow = viewportHeight - triggerRect.bottom;
      
      // Reserve some padding from viewport edges
      const padding = 8;
      const availableSpaceAbove = spaceAbove - padding;
      const availableSpaceBelow = spaceBelow - padding;
      
      // Preferred max height for dropdown
      const preferredMaxHeight = 500;
      
      // Decide whether to open upward or downward
      if (availableSpaceAbove >= preferredMaxHeight) {
        // Plenty of space above, open upward
        setDropdownPosition('top');
        setMaxHeight(preferredMaxHeight);
      } else if (availableSpaceBelow >= preferredMaxHeight) {
        // Plenty of space below, open downward
        setDropdownPosition('bottom');
        setMaxHeight(preferredMaxHeight);
      } else if (availableSpaceBelow > availableSpaceAbove) {
        // More space below, open downward with constrained height
        setDropdownPosition('bottom');
        setMaxHeight(Math.max(200, availableSpaceBelow));
      } else {
        // More space above, open upward with constrained height
        setDropdownPosition('top');
        setMaxHeight(Math.max(200, availableSpaceAbove));
      }
    }
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Helper to filter hierarchy based on search term
  const filterHierarchy = (structure: FolderStructure, term: string): FolderStructure | null => {
    const lowerTerm = term.toLowerCase();
    
    // Filter presets in this folder
    let filteredPresets = structure.presets.filter((preset) => {
      if (!term) return true;
      return (
        preset.name.toLowerCase().includes(lowerTerm) ||
        preset.endpoint.toLowerCase().includes(lowerTerm) ||
        preset.description.toLowerCase().includes(lowerTerm)
      );
    });
    
    // Recursively filter subfolders
    const filteredSubfolders = structure.subfolders
      .map(subfolder => filterHierarchy(subfolder, term))
      .filter((subfolder): subfolder is FolderStructure => subfolder !== null);
    
    // Include this folder if it has matching presets or matching subfolders
    if (filteredPresets.length > 0 || filteredSubfolders.length > 0) {
      return {
        ...structure,
        presets: filteredPresets,
        subfolders: filteredSubfolders,
      };
    }
    
    return null;
  };

  const filteredHierarchy = hierarchy ? filterHierarchy(hierarchy, searchTerm) : null;

  const handleSelectPreset = (preset: EndpointPreset) => {
    onSelectEndpoint(preset);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleUseCustom = () => {
    onUseCustom();
    setIsOpen(false);
    setSearchTerm('');
  };

  // Recursive function to render folder structure
  const renderFolderStructure = (structure: FolderStructure, depth: number): React.ReactNode => {
    const isRootCollection = depth === 0; // Skip rendering root collection name
    const hasContent = structure.presets.length > 0 || structure.subfolders.length > 0;
    
    if (!hasContent) return null;
    
    return (
      <React.Fragment key={structure.path}>
        {/* Folder header - only show for non-root folders */}
        {!isRootCollection && (
          <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-200" style={{ paddingLeft: `${12 + depth * 8}px` }}>
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
              {structure.name}
            </span>
          </div>
        )}
        
        {/* Presets in this folder */}
        {structure.presets.map((preset: EndpointPreset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => handleSelectPreset(preset)}
            className={`w-full flex items-start gap-2 px-3 py-2 text-left border-b border-gray-100 hover:bg-gray-50 transition-colors ${
              selectedEndpoint?.id === preset.id ? 'bg-gray-100' : ''
            }`}
            style={{ paddingLeft: `${12 + (isRootCollection ? 0 : depth + 1) * 8}px` }}
          >
            <span
              className={`inline-flex items-center justify-center w-[60px] py-0.5 text-xs font-medium rounded flex-shrink-0 ${METHOD_BADGE_STYLES[preset.method]}`}
            >
              {preset.method}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900">
                {preset.name}
              </div>
              <div className="text-xs text-gray-500 font-mono mt-0.5 truncate">
                {preset.endpoint}
              </div>
            </div>
          </button>
        ))}
        
        {/* Recursively render subfolders */}
        {structure.subfolders.map(subfolder => renderFolderStructure(subfolder, depth + 1))}
      </React.Fragment>
    );
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="w-full flex items-center justify-between px-3 py-2 text-sm text-left bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <span className="text-gray-500">Loading endpoints...</span>
        ) : selectedEndpoint ? (
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-medium text-gray-900 truncate">
              {selectedEndpoint.name}
            </span>
            <span className="text-xs text-gray-500 truncate hidden sm:inline">
              {selectedEndpoint.method} {selectedEndpoint.endpoint}
            </span>
          </div>
        ) : (
          <span className="text-gray-500">Select an endpoint...</span>
        )}
        <ChevronDownIcon
          className={`w-4 h-4 text-gray-400 flex-shrink-0 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Panel - Dynamic Position */}
      {isOpen && (
        <div 
          className={`absolute left-0 right-0 z-50 bg-white border border-gray-300 rounded shadow-lg flex flex-col ${
            dropdownPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
          style={{ maxHeight: `${maxHeight}px` }}
        >
          {/* Search Header */}
          <div className="p-2 border-b border-gray-200 flex-shrink-0">
            {/* Search Input */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search endpoints..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="overflow-y-auto flex-1 custom-scrollbar">
            {filteredHierarchy && renderFolderStructure(filteredHierarchy, 0)}

            {/* No results */}
            {!filteredHierarchy && (
              <div className="p-4 text-center text-sm text-gray-500">
                No endpoints found matching your search.
              </div>
            )}
          </div>

          {/* Footer - Use Custom Endpoint */}
          <div className="p-2 border-t border-gray-200 flex-shrink-0">
            <button
              type="button"
              onClick={handleUseCustom}
              className="w-full px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
            >
              Use Custom Endpoint
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
