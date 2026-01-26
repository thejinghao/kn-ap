'use client';

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import {
  PayloadSection,
  payloadSections,
  formattedPayloadJson,
  calculateLineNumbers,
  getCrossReferencesForSection,
  CrossReference,
  entityColors,
} from '@/lib/onboarding-payload-structure';
import { EntityType } from '@/lib/klarna-network-structure';

interface PayloadViewerProps {
  selectedSectionId: string | null;
  onSectionSelect: (section: PayloadSection | null) => void;
  highlightedReferences: CrossReference[];
}

// Syntax highlighting for JSON
function highlightJson(json: string): React.ReactNode[] {
  const lines = json.split('\n');
  
  return lines.map((line, lineIndex) => {
    const parts: React.ReactNode[] = [];
    let remaining = line;
    let keyIndex = 0;
    
    // Match patterns for JSON syntax
    const patterns = [
      { regex: /^(\s*)/, type: 'indent' },
      { regex: /"([^"]+)"(?=\s*:)/, type: 'key' },
      { regex: /:\s*/, type: 'colon' },
      { regex: /"([^"]*)"/, type: 'string' },
      { regex: /(\d+(?:\.\d+)?)/, type: 'number' },
      { regex: /(true|false)/, type: 'boolean' },
      { regex: /(null)/, type: 'null' },
      { regex: /([{}\[\],])/, type: 'bracket' },
    ];
    
    while (remaining.length > 0) {
      let matched = false;
      
      // Check for leading whitespace
      const indentMatch = remaining.match(/^(\s+)/);
      if (indentMatch) {
        parts.push(<span key={`${lineIndex}-indent-${keyIndex++}`}>{indentMatch[1]}</span>);
        remaining = remaining.slice(indentMatch[1].length);
        continue;
      }
      
      // Check for JSON key
      const keyMatch = remaining.match(/^"([^"]+)"(\s*:\s*)/);
      if (keyMatch) {
        parts.push(
          <span key={`${lineIndex}-key-${keyIndex++}`} className="text-blue-600 dark:text-blue-400">
            &quot;{keyMatch[1]}&quot;
          </span>
        );
        parts.push(
          <span key={`${lineIndex}-colon-${keyIndex++}`} className="text-gray-600">
            {keyMatch[2]}
          </span>
        );
        remaining = remaining.slice(keyMatch[0].length);
        matched = true;
        continue;
      }
      
      // Check for string value
      const stringMatch = remaining.match(/^"([^"]*)"/);
      if (stringMatch) {
        parts.push(
          <span key={`${lineIndex}-str-${keyIndex++}`} className="text-green-600 dark:text-green-400">
            &quot;{stringMatch[1]}&quot;
          </span>
        );
        remaining = remaining.slice(stringMatch[0].length);
        matched = true;
        continue;
      }
      
      // Check for number
      const numMatch = remaining.match(/^(\d+(?:\.\d+)?)/);
      if (numMatch) {
        parts.push(
          <span key={`${lineIndex}-num-${keyIndex++}`} className="text-orange-600 dark:text-orange-400">
            {numMatch[1]}
          </span>
        );
        remaining = remaining.slice(numMatch[0].length);
        matched = true;
        continue;
      }
      
      // Check for boolean/null
      const boolMatch = remaining.match(/^(true|false|null)/);
      if (boolMatch) {
        parts.push(
          <span key={`${lineIndex}-bool-${keyIndex++}`} className="text-purple-600 dark:text-purple-400">
            {boolMatch[1]}
          </span>
        );
        remaining = remaining.slice(boolMatch[0].length);
        matched = true;
        continue;
      }
      
      // Check for brackets/braces
      const bracketMatch = remaining.match(/^([{}\[\],])/);
      if (bracketMatch) {
        parts.push(
          <span key={`${lineIndex}-bracket-${keyIndex++}`} className="text-gray-500">
            {bracketMatch[1]}
          </span>
        );
        remaining = remaining.slice(1);
        matched = true;
        continue;
      }
      
      // Default: take one character
      parts.push(<span key={`${lineIndex}-char-${keyIndex++}`}>{remaining[0]}</span>);
      remaining = remaining.slice(1);
    }
    
    return parts;
  });
}

// Helper to lighten a hex color by a percentage
function lightenColor(color: string, percent: number): string {
  // Convert hex to RGB
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Lighten by moving towards white (255)
  const newR = Math.min(255, Math.round(r + (255 - r) * (percent / 100)));
  const newG = Math.min(255, Math.round(g + (255 - g) * (percent / 100)));
  const newB = Math.min(255, Math.round(b + (255 - b) * (percent / 100)));
  
  // Convert back to hex
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
}

// Get color for entity type
function getEntityColor(entityType: EntityType): { bg: string; border: string; bgHover: string; bgLight: string } {
  const colors = entityColors[entityType];
  return {
    bg: colors.bg,
    border: colors.border,
    bgHover: colors.bg,
    bgLight: lightenColor(colors.bg, 40), // 40% lighter for referenced sections
  };
}

export default function PayloadViewer({
  selectedSectionId,
  onSectionSelect,
  highlightedReferences,
}: PayloadViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [linePositions, setLinePositions] = useState<Map<string, DOMRect>>(new Map());
  
  // Calculate line numbers for sections
  const lineNumbers = useMemo(() => calculateLineNumbers(), []);
  
  // Split JSON into lines
  const jsonLines = useMemo(() => formattedPayloadJson.split('\n'), []);
  const highlightedLines = useMemo(() => highlightJson(formattedPayloadJson), []);
  
  // Build a map of line -> section for click handling
  const lineSectionMap = useMemo(() => {
    const map = new Map<number, PayloadSection>();
    
    payloadSections.forEach(section => {
      const range = lineNumbers.get(section.id);
      if (range) {
        // Only map the first line of each section for click detection
        // to avoid nested sections stealing clicks
        for (let line = range.start; line <= range.end; line++) {
          // Check if this line is already mapped to a more specific (smaller) section
          const existing = map.get(line);
          if (!existing) {
            map.set(line, section);
          } else {
            // Keep the smaller/more specific section
            const existingRange = lineNumbers.get(existing.id);
            const newRange = range;
            if (existingRange && (newRange.end - newRange.start) < (existingRange.end - existingRange.start)) {
              map.set(line, section);
            }
          }
        }
      }
    });
    
    return map;
  }, [lineNumbers]);
  
  // Get section for a line, preferring more specific sections
  const getSectionForLine = useCallback((lineNum: number): PayloadSection | null => {
    // Find all sections that contain this line
    const containingSections = payloadSections.filter(section => {
      const range = lineNumbers.get(section.id);
      return range && lineNum >= range.start && lineNum <= range.end;
    });
    
    if (containingSections.length === 0) return null;
    
    // Return the most specific (smallest range) section
    return containingSections.reduce((smallest, current) => {
      const smallestRange = lineNumbers.get(smallest.id);
      const currentRange = lineNumbers.get(current.id);
      if (!smallestRange || !currentRange) return smallest;
      
      const smallestSize = smallestRange.end - smallestRange.start;
      const currentSize = currentRange.end - currentRange.start;
      return currentSize < smallestSize ? current : smallest;
    });
  }, [lineNumbers]);
  
  // Handle line click
  const handleLineClick = useCallback((lineNum: number) => {
    const section = getSectionForLine(lineNum);
    onSectionSelect(section);
  }, [getSectionForLine, onSectionSelect]);
  
  // Check if a line is in the selected section
  const isLineInSelectedSection = useCallback((lineNum: number): boolean => {
    if (!selectedSectionId) return false;
    const range = lineNumbers.get(selectedSectionId);
    return range ? lineNum >= range.start && lineNum <= range.end : false;
  }, [selectedSectionId, lineNumbers]);
  
  // Get the entity type for a line based on section
  const getLineEntityType = useCallback((lineNum: number): EntityType | null => {
    const section = getSectionForLine(lineNum);
    return section?.entityType || null;
  }, [getSectionForLine]);
  
  // Check if line is part of a highlighted reference (but not the selected section)
  const isLineInReferencedSection = useCallback((lineNum: number): CrossReference | null => {
    // If this line is in the selected section, don't treat it as a referenced section
    if (isLineInSelectedSection(lineNum)) {
      return null;
    }
    
    for (const ref of highlightedReferences) {
      // Find sections involved
      const fromSection = payloadSections.find(s => s.id === ref.fromSectionId);
      const toSection = payloadSections.find(s => s.id === ref.toSectionId);
      
      const fromRange = fromSection ? lineNumbers.get(fromSection.id) : null;
      const toRange = toSection ? lineNumbers.get(toSection.id) : null;
      
      if (fromRange && lineNum >= fromRange.start && lineNum <= fromRange.end) {
        return ref;
      }
      if (toRange && lineNum >= toRange.start && lineNum <= toRange.end) {
        return ref;
      }
    }
    return null;
  }, [highlightedReferences, lineNumbers, isLineInSelectedSection]);
  
  // Update line positions for SVG lines
  useEffect(() => {
    if (highlightedReferences.length === 0) {
      setLinePositions(new Map());
      return;
    }
    
    const newPositions = new Map<string, DOMRect>();
    
    highlightedReferences.forEach(ref => {
      const fromSection = payloadSections.find(s => s.id === ref.fromSectionId);
      const toSection = payloadSections.find(s => s.id === ref.toSectionId);
      
      if (fromSection && toSection) {
        const fromRange = lineNumbers.get(fromSection.id);
        const toRange = lineNumbers.get(toSection.id);
        
        if (fromRange && toRange) {
          const fromEl = lineRefs.current.get(fromRange.start);
          const toEl = lineRefs.current.get(toRange.start);
          
          if (fromEl && toEl && containerRef.current) {
            const containerRect = containerRef.current.getBoundingClientRect();
            const fromRect = fromEl.getBoundingClientRect();
            const toRect = toEl.getBoundingClientRect();
            
            // Store positions relative to container
            newPositions.set(`${ref.id}-from`, new DOMRect(
              fromRect.right - containerRect.left,
              fromRect.top - containerRect.top + fromRect.height / 2,
              fromRect.width,
              fromRect.height
            ));
            newPositions.set(`${ref.id}-to`, new DOMRect(
              toRect.right - containerRect.left,
              toRect.top - containerRect.top + toRect.height / 2,
              toRect.width,
              toRect.height
            ));
          }
        }
      }
    });
    
    setLinePositions(newPositions);
  }, [highlightedReferences, lineNumbers]);
  
  // Scroll selected section into view
  useEffect(() => {
    if (selectedSectionId) {
      const range = lineNumbers.get(selectedSectionId);
      if (range) {
        const el = lineRefs.current.get(range.start);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [selectedSectionId, lineNumbers]);
  
  return (
    <div 
      ref={containerRef}
      className="relative h-full overflow-auto bg-gray-50 font-mono text-sm"
    >
      {/* SVG overlay for reference lines */}
      <svg 
        className="absolute inset-0 pointer-events-none z-10"
        style={{ width: '100%', height: `${jsonLines.length * 24 + 48}px` }}
      >
        <defs>
          {highlightedReferences.map(ref => (
            <marker
              key={`marker-${ref.id}`}
              id={`arrow-${ref.id}`}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill={ref.color} />
            </marker>
          ))}
        </defs>
        
        {highlightedReferences.map(ref => {
          const fromPos = linePositions.get(`${ref.id}-from`);
          const toPos = linePositions.get(`${ref.id}-to`);
          
          if (!fromPos || !toPos) return null;
          
          // Calculate bezier curve control points
          const startX = fromPos.x + 20;
          const startY = fromPos.y;
          const endX = toPos.x + 20;
          const endY = toPos.y;
          
          // Control point offset based on distance
          const distance = Math.abs(endY - startY);
          const cpOffset = Math.min(100, distance * 0.3);
          
          const path = `M ${startX} ${startY} 
                        C ${startX + cpOffset} ${startY}, 
                          ${endX + cpOffset} ${endY}, 
                          ${endX} ${endY}`;
          
          return (
            <g key={ref.id}>
              <path
                d={path}
                fill="none"
                stroke={ref.color}
                strokeWidth="2"
                strokeDasharray="5,5"
                markerEnd={`url(#arrow-${ref.id})`}
                opacity="0.7"
              />
              {/* Start dot */}
              <circle cx={startX} cy={startY} r="4" fill={ref.color} />
            </g>
          );
        })}
      </svg>
      
      {/* JSON content with line numbers */}
      <div className="p-4">
        <table className="w-full border-collapse">
          <tbody>
            {jsonLines.map((line, index) => {
              const lineNum = index + 1;
              const isSelected = isLineInSelectedSection(lineNum);
              const referencedSectionRef = isLineInReferencedSection(lineNum);
              
              // Get the entity type and colors for this line
              // This will work for both selected and referenced sections
              const entityType = getLineEntityType(lineNum);
              const colors = entityType ? getEntityColor(entityType) : null;
              
              // Determine background color
              let backgroundColor = 'transparent';
              if (isSelected && colors) {
                // Primary/focused section - full color
                backgroundColor = colors.bg;
              } else if (referencedSectionRef && colors) {
                // Referenced section - lighter color (10% lighter)
                backgroundColor = colors.bgLight;
              }
              
              return (
                <tr 
                  key={lineNum}
                  ref={el => {
                    if (el) lineRefs.current.set(lineNum, el as unknown as HTMLDivElement);
                  }}
                  onClick={() => handleLineClick(lineNum)}
                  className="cursor-pointer transition-all duration-150 group"
                  style={{
                    backgroundColor,
                  }}
                >
                  <td 
                    className="w-12 text-right pr-4 text-gray-400 select-none align-top py-0.5"
                    style={{ lineHeight: '20px' }}
                  >
                    {lineNum}
                  </td>
                  <td 
                    className={`
                      py-0.5 pr-4 whitespace-pre
                      ${!isSelected && !referencedSectionRef ? 'group-hover:bg-gray-100' : ''}
                    `}
                    style={{ lineHeight: '20px' }}
                  >
                    {highlightedLines[index]}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
