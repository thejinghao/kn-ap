'use client';

import React, { useCallback, useMemo, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  NodeTypes,
  MarkerType,
  Position,
  Handle,
  NodeProps,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';

import {
  ViewType,
  NetworkEntity,
  EntityRelationship,
  entityColors,
  getEntitiesForView,
  getRelationshipsForView,
  defaultNodePositions,
} from '@/lib/klarna-network-structure';

// Custom node component
function EntityNode({ data, selected }: NodeProps<NetworkEntity>) {
  const colors = entityColors[data.type];
  
  return (
    <div
      className={`
        px-4 py-3 rounded-lg border-2 shadow-sm cursor-pointer
        transition-all duration-200 min-w-[160px] max-w-[200px]
        ${selected ? 'ring-2 ring-offset-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'}
      `}
      style={{
        backgroundColor: colors.bg,
        borderColor: selected ? '#3B82F6' : colors.border,
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-gray-400 !w-2 !h-2 !border-0"
      />
      
      <div className="text-center">
        <div 
          className="text-[10px] font-medium uppercase tracking-wider mb-1 opacity-70"
          style={{ color: colors.text }}
        >
          {data.type}
        </div>
        <div 
          className="text-sm font-semibold leading-tight"
          style={{ color: colors.text }}
        >
          {data.name}
        </div>
      </div>
      
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-gray-400 !w-2 !h-2 !border-0"
      />
    </div>
  );
}

// Node types for React Flow
const nodeTypes: NodeTypes = {
  entity: EntityNode,
};

// Convert entities and relationships to React Flow format
function convertToReactFlow(
  entities: NetworkEntity[],
  relationships: EntityRelationship[],
  view: ViewType
): { nodes: Node[]; edges: Edge[] } {
  const positions = defaultNodePositions[view] || {};
  
  const nodes: Node[] = entities.map((entity) => ({
    id: entity.id,
    type: 'entity',
    data: {
      ...entity,
      name: entity.displayNameByView?.[view] ?? entity.name,
    },
    position: positions[entity.id] || { x: 0, y: 0 },
  }));

  const edges: Edge[] = relationships.map((rel) => ({
    id: rel.id,
    source: rel.from,
    target: rel.to,
    type: 'smoothstep',
    animated: false,
    style: { 
      stroke: '#94a3b8',
      strokeWidth: 2,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: '#94a3b8',
      width: 15,
      height: 15,
    },
    label: rel.label,
    labelStyle: { 
      fontSize: 10, 
      fontWeight: 500,
      fill: '#64748b',
    },
    labelBgStyle: { 
      fill: '#f8fafc', 
      fillOpacity: 0.9,
    },
    labelBgPadding: [4, 2] as [number, number],
    labelBgBorderRadius: 4,
  }));

  return { nodes, edges };
}

interface KlarnaNetworkDiagramProps {
  view: ViewType;
  selectedEntityId: string | null;
  onEntitySelect: (entity: NetworkEntity | null) => void;
}

function KlarnaNetworkDiagramInner({
  view,
  selectedEntityId,
  onEntitySelect,
}: KlarnaNetworkDiagramProps) {
  const reactFlowInstance = useReactFlow();
  const entities = useMemo(() => getEntitiesForView(view), [view]);
  const relationships = useMemo(() => getRelationshipsForView(view), [view]);

  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => convertToReactFlow(entities, relationships, view),
    [entities, relationships, view]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes and edges when view changes
  useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = convertToReactFlow(entities, relationships, view);
    setNodes(newNodes);
    setEdges(newEdges);
  }, [view, entities, relationships, setNodes, setEdges]);

  // Update selected state
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        selected: node.id === selectedEntityId,
      }))
    );
  }, [selectedEntityId, setNodes]);

  // Custom fitView based on view type
  useEffect(() => {
    if (reactFlowInstance) {
      setTimeout(() => {
        reactFlowInstance.fitView({
          padding: 0.2,
          maxZoom: view === 'partner' ? 0.65 : 1.5,
          duration: 200,
        });
      }, 0);
    }
  }, [view, nodes, reactFlowInstance]);

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const entity = entities.find((e) => e.id === node.id);
      onEntitySelect(entity || null);
    },
    [entities, onEntitySelect]
  );

  const onPaneClick = useCallback(() => {
    onEntitySelect(null);
  }, [onEntitySelect]);

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        minZoom={0.3}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#e2e8f0" gap={20} size={1} />
        <Controls 
          showZoom={true}
          showFitView={true}
          showInteractive={false}
          className="!bg-white !border !border-gray-200 !shadow-sm"
        />
      </ReactFlow>
    </div>
  );
}

export default function KlarnaNetworkDiagram(props: KlarnaNetworkDiagramProps) {
  return (
    <ReactFlowProvider>
      <KlarnaNetworkDiagramInner {...props} />
    </ReactFlowProvider>
  );
}
