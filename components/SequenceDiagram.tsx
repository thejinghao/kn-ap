'use client';

import React, { useState, useCallback } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface Party {
  id: string;
  label: string;
  color: 'blue' | 'pink' | 'amber' | 'green';
}

export interface SequenceStep {
  id: string;
  from: string;
  to: string;
  label: string;
  sublabel?: string;
  type: 'call' | 'response' | 'event' | 'redirect';
  isLive?: boolean;
  liveAction?: () => Promise<void>;
}

interface SequenceDiagramProps {
  parties: Party[];
  steps: SequenceStep[];
  title?: string;
}

// ============================================================================
// COLOR MAPS
// ============================================================================

const PARTY_COLORS: Record<Party['color'], { bg: string; border: string; text: string; dot: string }> = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-400', text: 'text-blue-700', dot: 'bg-blue-400' },
  pink: { bg: 'bg-pink-50', border: 'border-pink-300', text: 'text-pink-700', dot: 'bg-pink-400' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-400', text: 'text-amber-700', dot: 'bg-amber-400' },
  green: { bg: 'bg-green-50', border: 'border-green-400', text: 'text-green-700', dot: 'bg-green-400' },
};

const STEP_TYPE_STYLES: Record<SequenceStep['type'], { color: string; dash: string }> = {
  call: { color: '#374151', dash: '' },
  response: { color: '#6B7280', dash: '4,3' },
  event: { color: '#7C3AED', dash: '2,2' },
  redirect: { color: '#DC2626', dash: '6,3' },
};

// ============================================================================
// COMPONENT
// ============================================================================

export default function SequenceDiagram({ parties, steps, title }: SequenceDiagramProps) {
  const [currentStep, setCurrentStep] = useState(-1);
  const [isRunningLive, setIsRunningLive] = useState(false);

  const nextStep = useCallback(async () => {
    const nextIdx = currentStep + 1;
    if (nextIdx >= steps.length) return;

    const step = steps[nextIdx];
    setCurrentStep(nextIdx);

    if (step.isLive && step.liveAction) {
      setIsRunningLive(true);
      try {
        await step.liveAction();
      } catch {
        // Live action failed - still advance
      }
      setIsRunningLive(false);
    }
  }, [currentStep, steps]);

  const reset = useCallback(() => {
    setCurrentStep(-1);
    setIsRunningLive(false);
  }, []);

  // Build party index map for positioning
  const partyIndex = new Map(parties.map((p, i) => [p.id, i]));
  const colCount = parties.length;

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      {title && (
        <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</span>
        </div>
      )}

      {/* Party Headers */}
      <div
        className="grid gap-2 px-4 pt-3 pb-2"
        style={{ gridTemplateColumns: `repeat(${colCount}, 1fr)` }}
      >
        {parties.map((party) => {
          const colors = PARTY_COLORS[party.color];
          return (
            <div
              key={party.id}
              className={`${colors.bg} ${colors.border} border rounded-md px-2 py-1.5 text-center`}
            >
              <div className={`text-xs font-semibold ${colors.text}`}>{party.label}</div>
            </div>
          );
        })}
      </div>

      {/* Lifelines + Steps */}
      <div className="relative px-4 pb-4" style={{ overflow: 'visible' }}>
        {/* Vertical lifelines */}
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${colCount}, 1fr)` }}
        >
          {parties.map((party) => {
            const colors = PARTY_COLORS[party.color];
            return (
              <div key={party.id} className="flex justify-center">
                <div
                  className={`w-px ${colors.dot} opacity-30`}
                  style={{ height: `${steps.length * 48 + 8}px` }}
                />
              </div>
            );
          })}
        </div>

        {/* Steps overlay */}
        <div className="absolute inset-x-4 top-0" style={{ paddingTop: '4px', overflow: 'visible' }}>
          {steps.map((step, idx) => {
            const fromIdx = partyIndex.get(step.from) ?? 0;
            const toIdx = partyIndex.get(step.to) ?? 0;
            const isActive = idx === currentStep;
            const isCompleted = idx < currentStep;
            const isFuture = idx > currentStep;

            // Calculate horizontal positions as percentages
            const colWidth = 100 / colCount;
            const fromCenter = fromIdx * colWidth + colWidth / 2;
            const toCenter = toIdx * colWidth + colWidth / 2;
            const leftPct = Math.min(fromCenter, toCenter);
            const rightPct = 100 - Math.max(fromCenter, toCenter);
            const goesRight = toIdx > fromIdx;
            const isSelf = fromIdx === toIdx;

            const typeStyle = STEP_TYPE_STYLES[step.type];

            return (
              <div
                key={step.id}
                className={`relative transition-all duration-300 ${
                  isFuture ? 'opacity-30' : 'opacity-100'
                }`}
                style={{ height: '48px', overflow: 'visible' }}
              >
                {/* Step number + label — positioned at left edge, extends freely */}
                <div
                  className={`absolute flex items-start gap-1 transition-all duration-300 ${
                    isActive ? 'scale-[1.02]' : ''
                  }`}
                  style={{
                    top: '2px',
                    left: `${leftPct}%`,
                    whiteSpace: 'nowrap',
                    zIndex: isActive ? 10 : 1,
                  }}
                >
                  {/* Step badge */}
                  <div
                    className={`shrink-0 w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px] font-bold transition-colors ${
                      isCompleted
                        ? 'bg-green-500 text-white'
                        : isActive
                          ? 'bg-gray-900 text-white ring-2 ring-gray-900/20'
                          : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {isCompleted ? '\u2713' : idx + 1}
                  </div>

                  {/* Label */}
                  <div>
                    <span
                      className={`text-[10px] leading-none ${
                        isActive ? 'font-semibold text-gray-900' : 'text-gray-600'
                      }`}
                    >
                      {step.label}
                      {step.isLive && (
                        <span className="ml-1 inline-block px-0.5 py-px text-[8px] font-bold rounded bg-green-100 text-green-700 uppercase align-middle">live</span>
                      )}
                    </span>
                    {step.sublabel && (
                      <div className="text-[9px] text-gray-400 leading-none mt-0.5">
                        {step.sublabel}
                      </div>
                    )}
                  </div>
                </div>

                {/* Arrow line (SVG) */}
                {!isSelf && (
                  <svg
                    className="absolute pointer-events-none"
                    style={{
                      top: '28px',
                      left: `${leftPct}%`,
                      right: `${rightPct}%`,
                      height: '12px',
                      width: `${Math.abs(toCenter - fromCenter)}%`,
                    }}
                    preserveAspectRatio="none"
                    viewBox="0 0 100 12"
                  >
                    <line
                      x1={goesRight ? 2 : 98}
                      y1="6"
                      x2={goesRight ? 92 : 8}
                      y2="6"
                      stroke={isActive ? typeStyle.color : isCompleted ? '#22C55E' : '#D1D5DB'}
                      strokeWidth={isActive ? 2 : 1.5}
                      strokeDasharray={typeStyle.dash}
                    />
                    {/* Arrowhead */}
                    <polygon
                      points={goesRight ? '92,2 100,6 92,10' : '8,2 0,6 8,10'}
                      fill={isActive ? typeStyle.color : isCompleted ? '#22C55E' : '#D1D5DB'}
                    />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Controls */}
      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center gap-3">
        <button
          onClick={nextStep}
          disabled={currentStep >= steps.length - 1 || isRunningLive}
          className="bg-gray-900 text-white px-4 py-1.5 rounded text-xs font-bold hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {currentStep === -1 ? 'Start' : isRunningLive ? 'Running...' : 'Next Step'}
        </button>
        <button
          onClick={reset}
          className="text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded text-xs font-medium transition-colors"
        >
          Reset
        </button>
        <div className="flex-1" />
        <span className="text-xs text-gray-400">
          {currentStep === -1 ? '0' : currentStep + 1} / {steps.length}
        </span>
      </div>
    </div>
  );
}
