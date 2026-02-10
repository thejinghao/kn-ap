'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  ChevronDownIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  DocumentArrowUpIcon,
  DocumentArrowDownIcon,
  XMarkIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { useEnvironment } from '@/lib/env-context';
import { EnvironmentVariable } from '@/lib/types';

// Source badge colors
const SOURCE_STYLES: Record<string, string> = {
  vercel: 'bg-black text-white',
  env_file: 'bg-purple-100 text-purple-700',
  user: 'bg-blue-100 text-blue-700',
  response: 'bg-green-100 text-green-700',
};

const SOURCE_LABELS: Record<string, string> = {
  vercel: 'Vercel',
  env_file: 'EnvFile',
  user: 'User',
  response: 'Response',
};

interface EditingState {
  name: string;
  value: string;
  isNew: boolean;
}

interface EnvironmentPanelProps {
  isModal?: boolean;
}

export default function EnvironmentPanel({ isModal = false }: EnvironmentPanelProps) {
  const {
    getAllVariables,
    setVariable,
    deleteVariable,
    resetVariable,
    importEnvFile,
    exportEnvFile,
    isLoading,
    variables: variablesMap,
  } = useEnvironment();

  const [isCollapsed, setIsCollapsed] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importContent, setImportContent] = useState('');

  // Get filtered variables
  const variables = useMemo(() => {
    const allVars = getAllVariables();
    if (!searchQuery.trim()) return allVars;
    
    const query = searchQuery.toLowerCase();
    return allVars.filter(v => 
      v.name.toLowerCase().includes(query) ||
      v.value.toLowerCase().includes(query)
    );
  }, [getAllVariables, searchQuery]);

  // Start editing a variable
  const startEditing = useCallback((variable: EnvironmentVariable) => {
    setEditing({
      name: variable.name,
      value: variable.value,
      isNew: false,
    });
  }, []);

  // Start adding a new variable
  const startAddNew = useCallback(() => {
    setEditing({
      name: '',
      value: '',
      isNew: true,
    });
  }, []);

  // Save edited variable
  const saveEditing = useCallback(() => {
    if (!editing) return;
    
    if (!editing.name.trim()) {
      return; // Don't save empty name
    }
    
    setVariable(editing.name.trim(), editing.value, {
      source: 'user',
    });
    setEditing(null);
  }, [editing, setVariable]);

  // Cancel editing
  const cancelEditing = useCallback(() => {
    setEditing(null);
  }, []);

  // Handle export
  const handleExport = useCallback(() => {
    const content = exportEnvFile();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'environment.env';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [exportEnvFile]);

  // Handle import
  const handleImport = useCallback(() => {
    if (importContent.trim()) {
      importEnvFile(importContent);
      setImportContent('');
      setShowImportModal(false);
    }
  }, [importContent, importEnvFile]);

  // Check if a variable has a base default (from Vercel or .env.local)
  const isBaseDefault = (name: string): boolean => {
    const baseVar = variablesMap[name];
    return baseVar?.source === 'vercel' || baseVar?.source === 'env_file';
  };

  // Close import modal with ESC key
  useEffect(() => {
    function handleEscKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && showImportModal) {
        setShowImportModal(false);
        setImportContent('');
      }
    }
    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, [showImportModal]);

  if (isLoading) {
    if (isModal) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="animate-pulse bg-gray-200 rounded h-5 w-16" />
        </div>
      );
    }
    return (
      <div className="bg-white rounded-lg shadow mb-4">
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="font-semibold text-gray-900">Environment Variables</span>
          <div className="animate-pulse bg-gray-200 rounded h-5 w-16" />
        </div>
      </div>
    );
  }

  // Modal mode - render without card wrapper
  if (isModal) {
    return (
      <>
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search variables..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-klarna-pink focus:border-transparent"
              />
            </div>
            
            {/* Actions */}
            <button
              onClick={startAddNew}
              title="Add new variable"
              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <PlusIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              title="Import .env file"
              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <DocumentArrowUpIcon className="h-5 w-5" />
            </button>
            <button
              onClick={handleExport}
              title="Export to .env file"
              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <DocumentArrowDownIcon className="h-5 w-5" />
            </button>
          </div>

          {/* New variable form */}
          {editing?.isNew && (
            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Variable name"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-klarna-pink focus:border-transparent"
                  autoFocus
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Value"
                  value={editing.value}
                  onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                  className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-klarna-pink focus:border-transparent"
                />
                <button
                  onClick={saveEditing}
                  className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                  title="Save"
                >
                  <CheckIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={cancelEditing}
                  className="p-1 text-gray-500 hover:bg-gray-100 rounded transition-colors"
                  title="Cancel"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}

          {/* Variables table */}
          <div className="border border-gray-200 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
            {variables.length === 0 ? (
              <div className="text-sm text-gray-500 text-center py-8">
                {searchQuery ? 'No variables match your search' : 'No environment variables'}
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b border-gray-200">
                      Variable Name
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b border-gray-200 w-24">
                      Source
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b border-gray-200">
                      Value
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 border-b border-gray-200 w-24">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {variables.map((variable) => (
                    <tr key={variable.name} className="group hover:bg-gray-50 transition-colors">
                      {/* Editing inline */}
                      {editing && !editing.isNew && editing.name === variable.name ? (
                        <>
                          <td className="px-3 py-1.5 font-mono text-xs text-gray-700">
                            {variable.name}
                          </td>
                          <td className="px-3 py-1.5">
                            <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${SOURCE_STYLES[variable.source]}`}>
                              {SOURCE_LABELS[variable.source]}
                            </span>
                          </td>
                          <td className="px-3 py-1.5">
                            <input
                              type="text"
                              value={editing.value}
                              onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                              className="w-full px-2 py-0.5 text-xs font-mono border border-gray-200 rounded focus:ring-2 focus:ring-klarna-pink focus:border-transparent"
                              autoFocus
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <div className="flex items-center justify-end gap-0.5">
                              <button
                                onClick={saveEditing}
                                className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                                title="Save"
                              >
                                <CheckIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="p-1 text-gray-500 hover:bg-gray-100 rounded transition-colors"
                                title="Cancel"
                              >
                                <XMarkIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-3 py-1.5 font-mono text-xs text-gray-700 max-w-[200px] truncate" title={variable.name}>
                            {variable.name}
                          </td>
                          <td className="px-3 py-1.5">
                            <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${SOURCE_STYLES[variable.source]}`}>
                              {SOURCE_LABELS[variable.source]}
                            </span>
                          </td>
                          <td className="px-3 py-1.5 font-mono text-xs text-gray-600 max-w-[300px] truncate" title={variable.value}>
                            {variable.value}
                          </td>
                          <td className="px-3 py-1.5">
                            <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => startEditing(variable)}
                                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                title="Edit"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              {variable.source !== 'vercel' && variable.source !== 'env_file' && (
                                <button
                                  onClick={() => deleteVariable(variable.name)}
                                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="Delete"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              )}
                              {variable.source === 'user' && isBaseDefault(variable.name) && (
                                <button
                                  onClick={() => resetVariable(variable.name)}
                                  className="p-1 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                                  title="Reset to default"
                                >
                                  <ArrowPathIcon className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Usage hint */}
          <div className="pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Use <code className="px-1 py-0.5 bg-gray-100 rounded text-klarna-pink">{'{{variable_name}}'}</code> in path, headers, or body to reference variables.
            </p>
          </div>
        </div>

        {/* Import Modal */}
        {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Import Environment Variables</h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-600 mb-3">
                Paste your .env file content below. Format: <code>key = value</code>
              </p>
              <textarea
                value={importContent}
                onChange={(e) => setImportContent(e.target.value)}
                placeholder="acquiring_partner_api_key = klarna_test_api_...&#10;partner_account_id = krn:partner:..."
                className="w-full h-48 px-3 py-2 text-sm font-mono border border-gray-200 rounded-lg focus:ring-2 focus:ring-klarna-pink focus:border-transparent resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={!importContent.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-klarna-pink hover:bg-klarna-pink-dark rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Import
              </button>
            </div>
          </div>
        </div>
        )}
      </>
    );
  }

  // Card mode - default rendering with collapsible header
  return (
    <div className="bg-white rounded-lg shadow mb-4">
      {/* Header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-t-lg"
      >
        <span className="flex items-center gap-2">
          <span className="font-semibold text-gray-900">Environment Variables</span>
          <span className="px-2 py-0.5 text-xs font-medium bg-klarna-black text-white rounded-full">
            {Object.keys(variablesMap).length}
          </span>
        </span>
        <ChevronDownIcon
          className={`h-5 w-5 text-gray-500 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
        />
      </button>

      {!isCollapsed && (
        <div className="px-4 pb-4">
          {/* Toolbar */}
          <div className="flex items-center gap-2 mb-3">
            {/* Search */}
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search variables..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-klarna-pink focus:border-transparent"
              />
            </div>
            
            {/* Actions */}
            <button
              onClick={startAddNew}
              title="Add new variable"
              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <PlusIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              title="Import .env file"
              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <DocumentArrowUpIcon className="h-5 w-5" />
            </button>
            <button
              onClick={handleExport}
              title="Export to .env file"
              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <DocumentArrowDownIcon className="h-5 w-5" />
            </button>
          </div>

          {/* New variable form */}
          {editing?.isNew && (
            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Variable name"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-klarna-pink focus:border-transparent"
                  autoFocus
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Value"
                  value={editing.value}
                  onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                  className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-klarna-pink focus:border-transparent"
                />
                <button
                  onClick={saveEditing}
                  className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                  title="Save"
                >
                  <CheckIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={cancelEditing}
                  className="p-1 text-gray-500 hover:bg-gray-100 rounded transition-colors"
                  title="Cancel"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}

          {/* Variables table */}
          <div className="border border-gray-200 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
            {variables.length === 0 ? (
              <div className="text-sm text-gray-500 text-center py-8">
                {searchQuery ? 'No variables match your search' : 'No environment variables'}
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b border-gray-200">
                      Variable Name
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b border-gray-200 w-24">
                      Source
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b border-gray-200">
                      Value
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 border-b border-gray-200 w-24">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {variables.map((variable) => (
                    <tr key={variable.name} className="group hover:bg-gray-50 transition-colors">
                      {/* Editing inline */}
                      {editing && !editing.isNew && editing.name === variable.name ? (
                        <>
                          <td className="px-3 py-1.5 font-mono text-xs text-gray-700">
                            {variable.name}
                          </td>
                          <td className="px-3 py-1.5">
                            <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${SOURCE_STYLES[variable.source]}`}>
                              {SOURCE_LABELS[variable.source]}
                            </span>
                          </td>
                          <td className="px-3 py-1.5">
                            <input
                              type="text"
                              value={editing.value}
                              onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                              className="w-full px-2 py-0.5 text-xs font-mono border border-gray-200 rounded focus:ring-2 focus:ring-klarna-pink focus:border-transparent"
                              autoFocus
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <div className="flex items-center justify-end gap-0.5">
                              <button
                                onClick={saveEditing}
                                className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                                title="Save"
                              >
                                <CheckIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="p-1 text-gray-500 hover:bg-gray-100 rounded transition-colors"
                                title="Cancel"
                              >
                                <XMarkIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-3 py-1.5 font-mono text-xs text-gray-700 max-w-[200px] truncate" title={variable.name}>
                            {variable.name}
                          </td>
                          <td className="px-3 py-1.5">
                            <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${SOURCE_STYLES[variable.source]}`}>
                              {SOURCE_LABELS[variable.source]}
                            </span>
                          </td>
                          <td className="px-3 py-1.5 font-mono text-xs text-gray-600 max-w-[300px] truncate" title={variable.value}>
                            {variable.value}
                          </td>
                          <td className="px-3 py-1.5">
                            <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => startEditing(variable)}
                                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                title="Edit"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              {variable.source !== 'vercel' && variable.source !== 'env_file' && (
                                <button
                                  onClick={() => deleteVariable(variable.name)}
                                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="Delete"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              )}
                              {variable.source === 'user' && isBaseDefault(variable.name) && (
                                <button
                                  onClick={() => resetVariable(variable.name)}
                                  className="p-1 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                                  title="Reset to default"
                                >
                                  <ArrowPathIcon className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Usage hint */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Use <code className="px-1 py-0.5 bg-gray-100 rounded text-klarna-pink">{'{{variable_name}}'}</code> in path, headers, or body to reference variables.
            </p>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Import Environment Variables</h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-600 mb-3">
                Paste your .env file content below. Format: <code>key = value</code>
              </p>
              <textarea
                value={importContent}
                onChange={(e) => setImportContent(e.target.value)}
                placeholder="acquiring_partner_api_key = klarna_test_api_...&#10;partner_account_id = krn:partner:..."
                className="w-full h-48 px-3 py-2 text-sm font-mono border border-gray-200 rounded-lg focus:ring-2 focus:ring-klarna-pink focus:border-transparent resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={!importContent.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-klarna-pink hover:bg-klarna-pink-dark rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
