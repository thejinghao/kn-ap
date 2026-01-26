'use client';

import React, { useState, useEffect } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { PresetSelectorProps, EndpointPreset, HttpMethod, CategoryInfo } from '@/lib/types';

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: 'bg-method-get',
  POST: 'bg-method-post',
  PATCH: 'bg-method-patch',
  PUT: 'bg-method-put',
  DELETE: 'bg-method-delete',
};

interface FolderStructure {
  name: string;
  path: string;
  presets: EndpointPreset[];
  subfolders: FolderStructure[];
}

export default function PresetSelector({
  selectedPreset,
  onSelectPreset,
}: PresetSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [categoriesWithPresets, setCategoriesWithPresets] = useState<Array<CategoryInfo & { presets: EndpointPreset[] }>>([]);
  const [hierarchy, setHierarchy] = useState<FolderStructure | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load endpoints from API on mount
  useEffect(() => {
    async function loadEndpoints() {
      try {
        const response = await fetch('/api/endpoints');
        const data = await response.json();
        
        if (data.success) {
          setCategoriesWithPresets(data.categories);
          setHierarchy(data.hierarchy);
          console.log(`✓ Loaded ${data.totalEndpoints} API endpoints`);
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

  // Helper to collect all presets from hierarchy
  const getAllPresetsFromHierarchy = (structure: FolderStructure | null): EndpointPreset[] => {
    if (!structure) return [];
    const presets = [...structure.presets];
    for (const subfolder of structure.subfolders) {
      presets.push(...getAllPresetsFromHierarchy(subfolder));
    }
    return presets;
  };

  // Helper to filter hierarchy based on search term
  const filterHierarchy = (structure: FolderStructure, term: string): FolderStructure | null => {
    const lowerTerm = term.toLowerCase();
    
    // Filter presets in this folder
    const filteredPresets = structure.presets.filter(
      (preset) =>
        preset.name.toLowerCase().includes(lowerTerm) ||
        preset.description.toLowerCase().includes(lowerTerm) ||
        preset.endpoint.toLowerCase().includes(lowerTerm)
    );
    
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

  const filteredHierarchy = searchTerm && hierarchy 
    ? filterHierarchy(hierarchy, searchTerm)
    : hierarchy;

  const handleSelectChange = (presetId: string) => {
    if (presetId === 'custom') {
      onSelectPreset({
        id: 'custom',
        name: 'Custom Request',
        description: 'Enter your own endpoint',
        method: 'GET',
        endpoint: '',
        category: 'other',
      });
    } else {
      const allPresets = getAllPresetsFromHierarchy(hierarchy);
      const preset = allPresets.find((p) => p.id === presetId);
      if (preset) {
        onSelectPreset(preset);
      }
    }
    setIsOpen(false);
  };

  // Get selected preset info for display
  const allPresets = getAllPresetsFromHierarchy(hierarchy);
  const selectedPresetData = selectedPreset === 'custom' 
    ? { id: 'custom', name: 'Custom Request (manual entry)', method: 'GET' as HttpMethod, endpoint: '' }
    : allPresets.find((p) => p.id === selectedPreset);

  // Recursive function to render folder structure
  const renderFolderStructure = (structure: FolderStructure, depth: number): React.ReactNode => {
    const isRootCollection = depth === 0; // Skip rendering root collection name
    
    return (
      <React.Fragment key={structure.path}>
        {/* Folder header - only show for non-root folders */}
        {!isRootCollection && (
          <div 
            className="sticky top-0 px-3 py-2 bg-gray-50 border-b border-gray-200 font-semibold text-sm text-klarna-black"
            style={{ paddingLeft: `${12 + depth * 12}px` }}
          >
            {structure.name}
          </div>
        )}
        
        {/* Presets in this folder */}
        {structure.presets.map((preset: EndpointPreset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => handleSelectChange(preset.id)}
            className={`w-full px-3 py-3 text-left hover:bg-gray-50 border-b border-gray-100 ${
              selectedPreset === preset.id ? 'bg-gray-100' : ''
            }`}
            style={{ paddingLeft: `${12 + (isRootCollection ? 0 : depth + 1) * 12}px` }}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 text-xs font-semibold text-white rounded min-w-[60px] text-center ${METHOD_COLORS[preset.method]}`}>
                  {preset.method}
                </span>
                <span className="font-medium text-gray-900">{preset.name}</span>
              </div>
              <p className="text-xs font-mono text-gray-500 pl-[76px]">
                {preset.endpoint}
              </p>
            </div>
          </button>
        ))}
        
        {/* Recursively render subfolders */}
        {structure.subfolders.map(subfolder => renderFolderStructure(subfolder, depth + 1))}
      </React.Fragment>
    );
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Endpoint</h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-gray-300 border-t-klarna-black rounded-full"></div>
          <span className="ml-3 text-gray-600">Loading endpoints...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      <h2 className="text-lg font-semibold text-gray-900 mb-3">Endpoint</h2>

      <div className="space-y-3">
        {/* Search Field */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search endpoints..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent"
          />
        </div>

        {/* Custom Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="w-full px-3 py-2.5 text-left border border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent"
          >
            {selectedPresetData ? (
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 text-xs font-semibold text-white rounded ${METHOD_COLORS[selectedPresetData.method]}`}>
                  {selectedPresetData.method}
                </span>
                <span className="font-medium text-gray-900 truncate">{selectedPresetData.name}</span>
              </div>
            ) : (
              <span className="text-gray-500">Select Endpoint</span>
            )}
            <svg
              className={`absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {isOpen && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setIsOpen(false)}
              />
              
              {/* Menu */}
              <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
                {/* Custom option */}
                <button
                  type="button"
                  onClick={() => handleSelectChange('custom')}
                  className="w-full px-3 py-3 text-left hover:bg-gray-50 border-b border-gray-100"
                >
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-xs font-semibold text-white rounded bg-gray-400">
                      CUSTOM
                    </span>
                    <span className="text-gray-900">Custom Request (manual entry)</span>
                  </div>
                </button>

                {/* Hierarchical folder structure */}
                {filteredHierarchy && renderFolderStructure(filteredHierarchy, 0)}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
