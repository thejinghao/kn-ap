'use client';

import React, { useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import type { Party, StepTemplate, StepDetail, SequenceDiagramRef, SequenceDiagramState } from '@/lib/types/payment-flow';

// Re-export types for convenience
export type { Party, StepTemplate, StepDetail, SequenceDiagramRef, SequenceDiagramState };

// ============================================================================
// COLOR MAPS
// ============================================================================

const PARTY_COLORS: Record<Party['color'], { bg: string; border: string; text: string; dot: string }> = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-400', text: 'text-blue-700', dot: 'bg-blue-400' },
  pink: { bg: 'bg-pink-50', border: 'border-pink-300', text: 'text-pink-700', dot: 'bg-pink-400' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-400', text: 'text-amber-700', dot: 'bg-amber-400' },
  green: { bg: 'bg-green-50', border: 'border-green-400', text: 'text-green-700', dot: 'bg-green-400' },
};

const STEP_TYPE_STYLES: Record<StepTemplate['type'], { color: string; dash: string }> = {
  call: { color: '#374151', dash: '' },
  response: { color: '#6B7280', dash: '4,3' },
  event: { color: '#7C3AED', dash: '2,2' },
  redirect: { color: '#DC2626', dash: '6,3' },
};

// ============================================================================
// HEADERS DISPLAY COMPONENT
// ============================================================================

function HeadersDisplay({ headers }: { headers: Record<string, string> }) {
  const [open, setOpen] = useState(false);
  const entries = Object.entries(headers);
  if (entries.length === 0) return null;

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wider bg-transparent border-none cursor-pointer px-0 py-0.5 hover:text-gray-700"
      >
        <span className="transition-transform" style={{ display: 'inline-block', transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>&#9654;</span>
        Headers ({entries.length})
      </button>
      {open && (
        <div className="bg-gray-50 border border-gray-200 rounded p-2 mt-1 font-mono text-[11px] leading-relaxed overflow-x-auto">
          {entries.map(([key, value]) => (
            <div key={key} className="flex gap-2">
              <span className="text-gray-500 shrink-0">{key}:</span>
              <span className="text-gray-800 break-all">{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// STEP INSPECTOR COMPONENT
// ============================================================================

export function StepInspector({ stepId, label, detail }: { stepId: string | null; label: string | null; detail: StepDetail | null }) {
  if (!stepId || !detail) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 text-center text-xs text-gray-400">
        Click a completed step to inspect its details
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Step Inspector</span>
        {label && <span className="text-xs text-gray-400 ml-2">&mdash; {label}</span>}
      </div>
      <div className="p-4">
        {detail.type === 'code' && (
          <div>
            <span className="inline-block px-1.5 py-0.5 text-[10px] font-bold rounded bg-gray-100 text-gray-600 uppercase mb-2">{detail.language}</span>
            <pre className="bg-gray-900 text-green-400 text-xs p-3 rounded-md overflow-x-auto font-mono leading-relaxed whitespace-pre-wrap">{detail.code}</pre>
          </div>
        )}
        {detail.type === 'api-request' && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-blue-700">{detail.method}</span>
              <code className="text-xs text-gray-700 font-mono">{detail.path}</code>
            </div>
            {detail.headers && <HeadersDisplay headers={detail.headers} />}
            {detail.body != null && (
              <pre className="bg-gray-900 text-amber-300 text-xs p-3 rounded-md overflow-x-auto font-mono leading-relaxed whitespace-pre-wrap">
                {typeof detail.body === 'string' ? detail.body : JSON.stringify(detail.body, null, 2)}
              </pre>
            )}
          </div>
        )}
        {detail.type === 'api-response' && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded ${
                detail.status >= 200 && detail.status < 300 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {detail.status}
              </span>
              <span className="text-xs text-gray-500">Response</span>
            </div>
            {detail.headers && <HeadersDisplay headers={detail.headers} />}
            <pre className="bg-gray-900 text-emerald-300 text-xs p-3 rounded-md overflow-x-auto font-mono leading-relaxed whitespace-pre-wrap">
              {typeof detail.body === 'string' ? detail.body : JSON.stringify(detail.body, null, 2)}
            </pre>
          </div>
        )}
        {detail.type === 'event' && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded bg-purple-100 text-purple-700">EVENT</span>
              <code className="text-xs text-gray-700 font-mono">{detail.name}</code>
            </div>
            {detail.data != null && (
              <pre className="bg-gray-900 text-purple-300 text-xs p-3 rounded-md overflow-x-auto font-mono leading-relaxed whitespace-pre-wrap">
                {typeof detail.data === 'string' ? detail.data : JSON.stringify(detail.data, null, 2)}
              </pre>
            )}
          </div>
        )}
        {detail.type === 'info' && (
          <div className="text-sm text-gray-600">{detail.message}</div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// SEQUENCE DIAGRAM PROPS
// ============================================================================

interface SequenceDiagramProps {
  parties: Party[];
  steps: StepTemplate[];
  title?: string;
  onStepSelect?: (stepId: string | null, detail: StepDetail | null, label: string | null) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

const SequenceDiagram = forwardRef<SequenceDiagramRef, SequenceDiagramProps>(
  function SequenceDiagram({ parties, steps, title, onStepSelect }, ref) {
    const [activatedSteps, setActivatedSteps] = useState<Map<string, StepDetail | undefined>>(new Map());
    const [activeStepId, setActiveStepId] = useState<string | null>(null);
    const [selectedStepId, setSelectedStepId] = useState<string | null>(null);

    const handleStepClick = useCallback((stepId: string) => {
      if (!activatedSteps.has(stepId)) return; // Can't click future steps
      setSelectedStepId(stepId);
      const detail = activatedSteps.get(stepId) ?? null;
      const step = steps.find(s => s.id === stepId);
      onStepSelect?.(stepId, detail, step?.label ?? null);
    }, [activatedSteps, steps, onStepSelect]);

    useImperativeHandle(ref, () => ({
      activateStep(stepId: string, detail?: StepDetail) {
        setActivatedSteps(prev => {
          const next = new Map(prev);
          // Mark all previous steps as activated (if not already)
          const stepIndex = steps.findIndex(s => s.id === stepId);
          for (let i = 0; i < stepIndex; i++) {
            if (!next.has(steps[i].id)) {
              next.set(steps[i].id, undefined);
            }
          }
          next.set(stepId, detail);
          return next;
        });
        setActiveStepId(stepId);
        setSelectedStepId(stepId);
        const step = steps.find(s => s.id === stepId);
        onStepSelect?.(stepId, detail ?? null, step?.label ?? null);
      },

      reset() {
        setActivatedSteps(new Map());
        setActiveStepId(null);
        setSelectedStepId(null);
        onStepSelect?.(null, null, null);
      },

      getState(): SequenceDiagramState {
        const obj: Record<string, StepDetail | null> = {};
        activatedSteps.forEach((v, k) => { obj[k] = v ?? null; });
        return { activatedSteps: obj, activeStepId, selectedStepId };
      },

      restoreState(state: SequenceDiagramState) {
        const map = new Map<string, StepDetail | undefined>();
        for (const [k, v] of Object.entries(state.activatedSteps)) {
          map.set(k, v ?? undefined);
        }
        setActivatedSteps(map);
        setActiveStepId(state.activeStepId);
        setSelectedStepId(state.selectedStepId);
        if (state.selectedStepId) {
          const detail = state.activatedSteps[state.selectedStepId] ?? null;
          const step = steps.find(s => s.id === state.selectedStepId);
          onStepSelect?.(state.selectedStepId, detail, step?.label ?? null);
        }
      },
    }), [activatedSteps, activeStepId, selectedStepId, steps, onStepSelect]);

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
                    style={{ height: `${steps.length * 56 + 8}px` }}
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
              const isActivated = activatedSteps.has(step.id);
              const isActive = step.id === activeStepId;
              const isSelected = step.id === selectedStepId;
              const isCompleted = isActivated && !isActive;
              const isFuture = !isActivated;

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
                  } ${isActivated ? 'cursor-pointer' : ''}`}
                  style={{ height: '56px', overflow: 'visible' }}
                  onClick={() => handleStepClick(step.id)}
                >
                  {/* Step number + label */}
                  <div
                    className={`absolute flex items-center gap-1 transition-all duration-300 ${
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
                          isSelected
                            ? 'font-semibold text-blue-600'
                            : isActive
                              ? 'font-semibold text-gray-900'
                              : 'text-gray-600'
                        }`}
                      >
                        {step.label}
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
                        top: '36px',
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

        {/* Progress bar */}
        <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {activatedSteps.size} / {steps.length} steps
          </span>
          {activatedSteps.size === steps.length && (
            <span className="text-xs font-semibold text-green-600">Complete</span>
          )}
        </div>
      </div>
    );
  }
);

export default SequenceDiagram;
