'use client';

import React, { useState, useMemo } from 'react';
import { ChevronRightIcon, ChevronDownIcon, PlusCircleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { SaveableField } from '@/lib/types';

interface JsonViewerProps {
  data: unknown;
  depth?: number;
  defaultExpanded?: number;
  onSaveValue?: (path: string, value: unknown) => void;
  saveableFields?: SaveableField[];
  savedVariables?: Set<string>;
}

interface JsonNodeProps {
  keyName?: string;
  value: unknown;
  depth: number;
  defaultExpanded: number;
  isLast: boolean;
  path: string;
  onSaveValue?: (path: string, value: unknown) => void;
  saveableFields?: SaveableField[];
  savedVariables?: Set<string>;
}

function JsonNode({ keyName, value, depth, defaultExpanded, isLast, path, onSaveValue, saveableFields, savedVariables }: JsonNodeProps) {
  const [isExpanded, setIsExpanded] = useState(depth < defaultExpanded);
  const [isHovered, setIsHovered] = useState(false);
  const indent = depth * 16;

  // Determine the type of value
  const valueType = useMemo(() => {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }, [value]);

  // Check if this field is saveable (auto-suggested)
  const isSaveableField = useMemo(() => {
    if (!saveableFields) return false;
    return saveableFields.some(f => f.path === path);
  }, [saveableFields, path]);

  // Check if this field has been saved
  const isSaved = useMemo(() => {
    if (!savedVariables || !saveableFields) return false;
    const field = saveableFields.find(f => f.path === path);
    return field ? savedVariables.has(field.suggestedName) : false;
  }, [savedVariables, saveableFields, path]);

  // Render save button for primitive values
  const renderSaveButton = () => {
    if (!onSaveValue) return null;
    if (valueType === 'object' || valueType === 'array') return null;
    
    // Show saved indicator
    if (isSaved) {
      return (
        <span className="ml-1 text-green-500" title="Saved as variable">
          <CheckCircleIcon className="w-3.5 h-3.5 inline" />
        </span>
      );
    }
    
    // Show save button on hover or for auto-suggested fields
    if (isHovered || isSaveableField) {
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSaveValue(path, value);
          }}
          className={`ml-1 p-0.5 rounded transition-colors ${
            isSaveableField 
              ? 'text-green-500 hover:text-green-700 hover:bg-green-50' 
              : 'text-gray-400 hover:text-klarna-pink hover:bg-gray-100'
          }`}
          title="Save as environment variable"
        >
          <PlusCircleIcon className="w-3.5 h-3.5" />
        </button>
      );
    }
    
    return null;
  };

  // Render primitive values
  const renderPrimitive = () => {
    const comma = !isLast ? ',' : '';
    
    switch (valueType) {
      case 'null':
        return <span className="text-gray-500">null{comma}</span>;
      case 'boolean':
        return <span className="text-blue-600">{String(value)}{comma}</span>;
      case 'number':
        return <span className="text-blue-600">{String(value)}{comma}</span>;
      case 'string':
        return <span className="text-green-600">&quot;{String(value)}&quot;{comma}</span>;
      default:
        return <span className="text-gray-600">{String(value)}{comma}</span>;
    }
  };

  // Render key prefix if exists
  const renderKey = () => {
    if (keyName === undefined) return null;
    return (
      <>
        <span className={`${isSaveableField ? 'text-green-700 font-medium' : 'text-purple-600'}`}>&quot;{keyName}&quot;</span>
        <span className="text-gray-500">: </span>
      </>
    );
  };

  // Handle primitives
  if (valueType !== 'object' && valueType !== 'array') {
    return (
      <div 
        className={`flex items-center group ${isSaveableField ? 'bg-green-50/50 -mx-1 px-1 rounded' : ''}`}
        style={{ paddingLeft: indent }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {renderKey()}
        {renderPrimitive()}
        {renderSaveButton()}
      </div>
    );
  }

  // Handle arrays and objects
  const isArray = valueType === 'array';
  const entries = isArray 
    ? (value as unknown[]).map((v, i) => [String(i), v] as [string, unknown])
    : Object.entries(value as Record<string, unknown>);
  const isEmpty = entries.length === 0;
  const openBracket = isArray ? '[' : '{';
  const closeBracket = isArray ? ']' : '}';
  const comma = !isLast ? ',' : '';

  // Empty array/object
  if (isEmpty) {
    return (
      <div className="flex" style={{ paddingLeft: indent }}>
        {renderKey()}
        <span className="text-gray-500">{openBracket}{closeBracket}{comma}</span>
      </div>
    );
  }

  // Collapsed view
  if (!isExpanded) {
    const count = entries.length;
    const countText = isArray ? `${count} items` : `${count} keys`;
    
    return (
      <div
        className="flex items-center cursor-pointer hover:bg-gray-50 rounded -ml-1 pl-1"
        style={{ paddingLeft: indent - 4 }}
        onClick={() => setIsExpanded(true)}
      >
        <ChevronRightIcon className="w-3 h-3 text-gray-400 mr-1 flex-shrink-0" />
        {renderKey()}
        <span className="text-gray-500">{openBracket}</span>
        <span className="text-gray-400 text-xs ml-1">{countText}</span>
        <span className="text-gray-500">{closeBracket}{comma}</span>
      </div>
    );
  }

  // Expanded view
  return (
    <div>
      <div
        className="flex items-center cursor-pointer hover:bg-gray-50 rounded -ml-1 pl-1"
        style={{ paddingLeft: indent - 4 }}
        onClick={() => setIsExpanded(false)}
      >
        <ChevronDownIcon className="w-3 h-3 text-gray-400 mr-1 flex-shrink-0" />
        {renderKey()}
        <span className="text-gray-500">{openBracket}</span>
      </div>
      {entries.map(([key, val], index) => {
        const childPath = isArray 
          ? `${path}[${key}]`
          : path ? `${path}.${key}` : key;
        return (
          <JsonNode
            key={key}
            keyName={isArray ? undefined : key}
            value={val}
            depth={depth + 1}
            defaultExpanded={defaultExpanded}
            isLast={index === entries.length - 1}
            path={childPath}
            onSaveValue={onSaveValue}
            saveableFields={saveableFields}
            savedVariables={savedVariables}
          />
        );
      })}
      <div style={{ paddingLeft: indent }}>
        <span className="text-gray-500">{closeBracket}{comma}</span>
      </div>
    </div>
  );
}

export default function JsonViewer({ 
  data, 
  depth = 0, 
  defaultExpanded = 2,
  onSaveValue,
  saveableFields,
  savedVariables,
}: JsonViewerProps) {
  return (
    <div className="font-mono text-sm leading-relaxed">
      <JsonNode
        value={data}
        depth={depth}
        defaultExpanded={defaultExpanded}
        isLast={true}
        path=""
        onSaveValue={onSaveValue}
        saveableFields={saveableFields}
        savedVariables={savedVariables}
      />
    </div>
  );
}
