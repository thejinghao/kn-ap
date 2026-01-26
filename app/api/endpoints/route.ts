import { NextResponse } from 'next/server';
import { getCategoriesWithPresets } from '@/lib/klarna-endpoints-server';
import { loadBrunoHierarchy, FolderStructure } from '@/lib/bruno-parser';

// Count total endpoints recursively - moved outside to avoid strict mode issue
function countEndpoints(structure: FolderStructure | null): number {
  if (!structure) return 0;
  let count = structure.presets?.length || 0;
  if (structure.subfolders) {
    for (const subfolder of structure.subfolders) {
      count += countEndpoints(subfolder);
    }
  }
  return count;
}

/**
 * GET /api/endpoints
 * Returns all available API endpoint presets grouped by category with folder hierarchy
 */
export async function GET() {
  try {
    const categoriesWithPresets = getCategoriesWithPresets();
    const folderHierarchy = loadBrunoHierarchy();
    
    const totalEndpoints = countEndpoints(folderHierarchy);
    
    return NextResponse.json({
      success: true,
      categories: categoriesWithPresets,
      hierarchy: folderHierarchy,
      totalEndpoints,
    });
  } catch (error) {
    console.error('Error loading endpoints:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to load endpoints',
        categories: [],
        hierarchy: null,
        totalEndpoints: 0,
      },
      { status: 500 }
    );
  }
}
