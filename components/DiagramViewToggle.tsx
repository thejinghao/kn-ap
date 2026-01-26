'use client';

import React from 'react';
import { ViewType } from '@/lib/klarna-network-structure';
import {
  BuildingStorefrontIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline';

interface DiagramViewToggleProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

const views: { id: ViewType; label: string; description: string; icon: typeof BuildingStorefrontIcon }[] = [
  {
    id: 'partner',
    label: 'Partner View',
    description: 'Merchant account structure',
    icon: BuildingStorefrontIcon,
  },
  {
    id: 'acquirer',
    label: 'Acquirer View',
    description: 'Acquiring partner structure',
    icon: BanknotesIcon,
  },
];

export default function DiagramViewToggle({ 
  currentView, 
  onViewChange 
}: DiagramViewToggleProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
      {views.map(view => {
        const isActive = currentView === view.id;
        const Icon = view.icon;
        
        return (
          <button
            key={view.id}
            onClick={() => onViewChange(view.id)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium
              transition-all duration-200 ease-in-out
              ${isActive 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }
            `}
            title={view.description}
          >
            <Icon className="w-4 h-4" />
            <span>{view.label}</span>
          </button>
        );
      })}
    </div>
  );
}
