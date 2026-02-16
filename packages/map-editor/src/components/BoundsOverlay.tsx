'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { MapBounds } from '../types';

interface BoundsOverlayProps {
  bounds: MapBounds | null;
  visible: boolean;
  chunkSize: number;
  onBoundsChange: (bounds: MapBounds) => void;
}

type DragType = 'tl' | 'tr' | 'bl' | 'br' | 'move' | null;

const HANDLE_SIZE = 1.5;
const HANDLE_COLOR = '#00e5ff';
const HANDLE_HOVER_COLOR = '#80f0ff';
const BORDER_COLOR = '#00e5ff';

/**
 * Always-visible bounding box overlay with draggable corner handles.
 * Renders at z=0.05 (above chunk boundaries at z=0.02).
 */
export function BoundsOverlay({ bounds, visible, chunkSize, onBoundsChange }: BoundsOverlayProps) {
  const [dragType, setDragType] = useState<DragType>(null);
  const [hoveredHandle, setHoveredHandle] = useState<DragType>(null);
  const [localBounds, setLocalBounds] = useState<MapBounds | null>(null);
  const dragStart = useRef<{ x: number; y: number; bounds: MapBounds } | null>(null);

  // Use local bounds during drag, otherwise use prop bounds
  const activeBounds = localBounds ?? bounds;

  if (!activeBounds || !visible) return null;

  // Convert chunk coords to world coords
  const worldMinX = activeBounds.minX * chunkSize;
  const worldMinY = activeBounds.minY * chunkSize;
  const worldMaxX = activeBounds.maxX * chunkSize;
  const worldMaxY = activeBounds.maxY * chunkSize;
  const width = worldMaxX - worldMinX;
  const height = worldMaxY - worldMinY;
  const centerX = worldMinX + width / 2;
  const centerY = worldMinY + height / 2;

  // Corner positions
  const corners: { key: DragType; x: number; y: number; cursor: string }[] = [
    { key: 'tl', x: worldMinX, y: worldMaxY, cursor: 'nwse-resize' },
    { key: 'tr', x: worldMaxX, y: worldMaxY, cursor: 'nesw-resize' },
    { key: 'bl', x: worldMinX, y: worldMinY, cursor: 'nesw-resize' },
    { key: 'br', x: worldMaxX, y: worldMinY, cursor: 'nwse-resize' },
  ];

  const handleDragStart = (type: DragType, e: any) => {
    e.stopPropagation();
    setDragType(type);
    dragStart.current = {
      x: e.point.x,
      y: e.point.y,
      bounds: { ...activeBounds },
    };
  };

  const handleDragMove = (e: any) => {
    if (!dragType || !dragStart.current) return;
    e.stopPropagation();

    const dx = e.point.x - dragStart.current.x;
    const dy = e.point.y - dragStart.current.y;
    const ob = dragStart.current.bounds;

    // Convert pixel delta to chunk delta
    const dxChunks = dx / chunkSize;
    const dyChunks = dy / chunkSize;

    let newBounds: MapBounds;

    switch (dragType) {
      case 'tl':
        newBounds = {
          minX: Math.min(ob.minX + dxChunks, ob.maxX - 1),
          minY: ob.minY,
          maxX: ob.maxX,
          maxY: Math.max(ob.maxY + dyChunks, ob.minY + 1),
        };
        break;
      case 'tr':
        newBounds = {
          minX: ob.minX,
          minY: ob.minY,
          maxX: Math.max(ob.maxX + dxChunks, ob.minX + 1),
          maxY: Math.max(ob.maxY + dyChunks, ob.minY + 1),
        };
        break;
      case 'bl':
        newBounds = {
          minX: Math.min(ob.minX + dxChunks, ob.maxX - 1),
          minY: Math.min(ob.minY + dyChunks, ob.maxY - 1),
          maxX: ob.maxX,
          maxY: ob.maxY,
        };
        break;
      case 'br':
        newBounds = {
          minX: ob.minX,
          minY: Math.min(ob.minY + dyChunks, ob.maxY - 1),
          maxX: Math.max(ob.maxX + dxChunks, ob.minX + 1),
          maxY: ob.maxY,
        };
        break;
      case 'move':
        newBounds = {
          minX: ob.minX + dxChunks,
          minY: ob.minY + dyChunks,
          maxX: ob.maxX + dxChunks,
          maxY: ob.maxY + dyChunks,
        };
        break;
      default:
        return;
    }

    // Round to nearest chunk boundary
    newBounds = {
      minX: Math.round(newBounds.minX),
      minY: Math.round(newBounds.minY),
      maxX: Math.round(newBounds.maxX),
      maxY: Math.round(newBounds.maxY),
    };

    setLocalBounds(newBounds);
  };

  const handleDragEnd = () => {
    if (localBounds) {
      onBoundsChange(localBounds);
    }
    setDragType(null);
    setLocalBounds(null);
    dragStart.current = null;
    document.body.style.cursor = '';
  };

  return (
    <>
      {/* Semi-transparent fill */}
      <mesh position={[centerX, centerY, 0.04]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial
          color={BORDER_COLOR}
          transparent
          opacity={0.04}
          toneMapped={false}
        />
      </mesh>

      {/* Border lines */}
      <BoundsLines
        worldMinX={worldMinX}
        worldMinY={worldMinY}
        worldMaxX={worldMaxX}
        worldMaxY={worldMaxY}
      />

      {/* Drag surface for the whole bounds area (move) */}
      <mesh
        position={[centerX, centerY, 0.045]}
        onPointerDown={(e) => handleDragStart('move', e)}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
        onPointerLeave={handleDragEnd}
        onPointerOver={() => {
          if (!dragType) document.body.style.cursor = 'move';
        }}
        onPointerOut={() => {
          if (!dragType) document.body.style.cursor = '';
        }}
      >
        <planeGeometry args={[Math.max(width - HANDLE_SIZE * 2, 0.1), Math.max(height - HANDLE_SIZE * 2, 0.1)]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Corner handles */}
      {corners.map((c) => (
        <mesh
          key={c.key}
          position={[c.x, c.y, 0.06]}
          onPointerDown={(e) => handleDragStart(c.key, e)}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerLeave={() => {
            setHoveredHandle(null);
            if (!dragType) document.body.style.cursor = '';
          }}
          onPointerOver={() => {
            setHoveredHandle(c.key);
            document.body.style.cursor = c.cursor;
          }}
          onPointerOut={() => {
            setHoveredHandle(null);
            if (!dragType) document.body.style.cursor = '';
          }}
        >
          <planeGeometry args={[HANDLE_SIZE, HANDLE_SIZE]} />
          <meshBasicMaterial
            color={hoveredHandle === c.key ? HANDLE_HOVER_COLOR : HANDLE_COLOR}
            transparent
            opacity={0.7}
            toneMapped={false}
          />
        </mesh>
      ))}
    </>
  );
}

/** Separate component for bounds border lines to avoid recalculating geometry every render */
function BoundsLines({
  worldMinX,
  worldMinY,
  worldMaxX,
  worldMaxY,
}: {
  worldMinX: number;
  worldMinY: number;
  worldMaxX: number;
  worldMaxY: number;
}) {
  const geometry = useMemo(() => {
    const points = [
      new THREE.Vector3(worldMinX, worldMinY, 0.05),
      new THREE.Vector3(worldMaxX, worldMinY, 0.05),
      new THREE.Vector3(worldMaxX, worldMinY, 0.05),
      new THREE.Vector3(worldMaxX, worldMaxY, 0.05),
      new THREE.Vector3(worldMaxX, worldMaxY, 0.05),
      new THREE.Vector3(worldMinX, worldMaxY, 0.05),
      new THREE.Vector3(worldMinX, worldMaxY, 0.05),
      new THREE.Vector3(worldMinX, worldMinY, 0.05),
    ];
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [worldMinX, worldMinY, worldMaxX, worldMaxY]);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color={BORDER_COLOR} opacity={0.8} transparent />
    </lineSegments>
  );
}
