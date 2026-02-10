/**
 * Server-side only module for loading Bruno endpoints
 * This file should only be imported in server components or API routes
 */

import { EndpointPreset, CategoryInfo } from './types';
import { loadBrunoEndpoints } from './bruno-parser';
import { categories, staticEndpointPresets } from './endpoints';

/**
 * Load all endpoints (static + Bruno) - server-side only
 */
export function getAllEndpoints(): EndpointPreset[] {
  const brunoEndpoints = loadBrunoEndpoints();
  const combined = [...staticEndpointPresets];
  const staticIds = new Set(staticEndpointPresets.map(p => p.id));
  
  // Add Bruno endpoints that don't conflict with static ones
  for (const brunoPreset of brunoEndpoints) {
    if (!staticIds.has(brunoPreset.id)) {
      combined.push(brunoPreset);
    }
  }
  
  return combined;
}

/**
 * Get presets by category - server-side only
 */
export function getPresetsByCategory(category: string): EndpointPreset[] {
  const allEndpoints = getAllEndpoints();
  return allEndpoints.filter((preset) => preset.category === category);
}

/**
 * Get a preset by ID - server-side only
 */
export function getPresetById(id: string): EndpointPreset | undefined {
  const allEndpoints = getAllEndpoints();
  return allEndpoints.find((preset) => preset.id === id);
}

/**
 * Get all categories with their presets - server-side only
 */
export function getCategoriesWithPresets(): Array<CategoryInfo & { presets: EndpointPreset[] }> {
  return categories.map((category) => ({
    ...category,
    presets: getPresetsByCategory(category.id),
  }));
}
