'use client';

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { LockClosedIcon } from '@heroicons/react/24/outline';

interface EnvironmentVariable {
  name: string;
  value: string;
  isSecret?: boolean;
  source: 'vercel' | 'env_file' | 'user' | 'response';
  description?: string;
}

interface DropdownPosition {
  top: number;
  left: number;
}

interface VariableAutocompleteDropdownProps {
  isOpen: boolean;
  variables: EnvironmentVariable[];
  selectedIndex: number;
  position: DropdownPosition | null;
  onSelect: (variable: EnvironmentVariable) => void;
  onClose: () => void;
}

const SOURCE_COLORS = {
  vercel: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  env_file: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  user: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  response: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
};

const SOURCE_LABELS = {
  vercel: 'Vercel',
  env_file: 'Env File',
  user: 'User',
  response: 'Response',
};

export function VariableAutocompleteDropdown({
  isOpen,
  variables,
  selectedIndex,
  position,
  onSelect,
  onClose,
}: VariableAutocompleteDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLDivElement>(null);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [selectedIndex]);

  // Handle click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen || !position) {
    return null;
  }

  const content = (
    <div
      ref={dropdownRef}
      className="variable-autocomplete-dropdown fixed bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl overflow-hidden"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: '400px',
        maxHeight: '300px',
        zIndex: 1000,
      }}
      role="listbox"
      aria-label="Environment variables"
    >
      {/* Variable list */}
      <div className="overflow-y-auto max-h-[260px] custom-scrollbar">
        {variables.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
            No matching variables
          </div>
        ) : (
          variables.map((variable, index) => {
            const isSelected = index === selectedIndex;
            const valuePreview = variable.isSecret
              ? '••••••'
              : variable.value.length > 30
              ? `${variable.value.substring(0, 30)}...`
              : variable.value;

            return (
              <div
                key={variable.name}
                ref={isSelected ? selectedItemRef : null}
                className={`px-4 py-3 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-blue-50 dark:bg-blue-900/30'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
                onClick={() => onSelect(variable)}
                role="option"
                aria-selected={isSelected}
              >
                {/* Variable name with lock icon */}
                <div className="flex items-center gap-2 mb-1">
                  <code className="text-sm font-mono font-semibold text-gray-900 dark:text-gray-100">
                    {variable.name}
                  </code>
                  {variable.isSecret && (
                    <LockClosedIcon className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                  )}
                  <span
                    className={`ml-auto px-2 py-0.5 rounded text-xs font-medium ${
                      SOURCE_COLORS[variable.source]
                    }`}
                  >
                    {SOURCE_LABELS[variable.source]}
                  </span>
                </div>

                {/* Description */}
                {variable.description && (
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                    {variable.description}
                  </div>
                )}

                {/* Value preview */}
                <div className="text-xs font-mono text-gray-500 dark:text-gray-500">
                  {valuePreview}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer with keyboard hints */}
      {variables.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-2 bg-gray-50 dark:bg-gray-800/50">
          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-4">
            <span>↑↓ Navigate</span>
            <span>Enter/Tab Select</span>
            <span>Esc Close</span>
          </div>
        </div>
      )}
    </div>
  );

  // Render to document.body to prevent clipping
  return createPortal(content, document.body);
}
