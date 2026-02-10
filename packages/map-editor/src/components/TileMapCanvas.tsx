'use client';

import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { MapControls } from '@react-three/drei';
import * as THREE from 'three';
import { ChunkMesh } from './ChunkMesh';
import { ChunkBoundaries } from './ChunkGrid';
import { PaintLayer } from './PaintLayer';
import { CursorHighlight } from './CursorHighlight';
import type { ChunkData, TileDef, EditorTool } from '../types';

interface TileMapCanvasProps {
  chunks: Map<string, ChunkData>;
  tiles: TileDef[];
  chunkSize: number;
  tool: EditorTool;
  onPaint: (worldX: number, worldY: number) => void;
  onEnsureChunk: (cx: number, cy: number) => void;
  style?: React.CSSProperties;
}

function Scene({
  chunks,
  tiles,
  chunkSize,
  tool,
  onPaint,
  onEnsureChunk,
}: Omit<TileMapCanvasProps, 'style'>) {
  // Build tile color lookup once
  const tileColorMap = useMemo(() => {
    const map = new Map<number, THREE.Color>();
    for (const t of tiles) {
      // Parse #RRGGBBAA → #RRGGBB
      const hex = t.colorHex.length === 9 ? t.colorHex.slice(0, 7) : t.colorHex;
      map.set(t.tileId, new THREE.Color(hex));
    }
    // 0 = empty/erased → dark gray
    map.set(0, new THREE.Color('#1a1a2e'));
    return map;
  }, [tiles]);

  // Visible chunk coordinates
  const visibleChunks = useMemo(() => {
    return Array.from(chunks.values()).map(
      (c) => [c.chunkX, c.chunkY] as [number, number]
    );
  }, [chunks]);

  const isPanTool = tool === 'pan';

  return (
    <>
      {/* Chunk tiles */}
      {Array.from(chunks.entries()).map(([key, chunk]) => (
        <ChunkMesh
          key={key}
          chunk={chunk}
          chunkSize={chunkSize}
          tiles={tiles}
          tileColorMap={tileColorMap}
        />
      ))}

      {/* Chunk boundaries */}
      <ChunkBoundaries chunkSize={chunkSize} visibleChunks={visibleChunks} />

      {/* Paint interaction layer */}
      <PaintLayer
        onPaint={onPaint}
        onEnsureChunk={onEnsureChunk}
        tool={tool}
        chunkSize={chunkSize}
      />

      {/* Cursor highlight */}
      <CursorHighlight tool={tool} />

      {/* Camera controls — pan/zoom with mouse */}
      <MapControls
        enableRotate={false}
        enableDamping
        dampingFactor={0.15}
        mouseButtons={{
          LEFT: isPanTool ? THREE.MOUSE.PAN : undefined as any,
          MIDDLE: THREE.MOUSE.PAN,
          RIGHT: THREE.MOUSE.PAN,
        }}
        minZoom={0.1}
        maxZoom={20}
      />
    </>
  );
}

/**
 * Main 2D tile map canvas using React Three Fiber.
 * Uses orthographic camera for pixel-perfect 2D rendering.
 */
export function TileMapCanvas({
  chunks,
  tiles,
  chunkSize,
  tool,
  onPaint,
  onEnsureChunk,
  style,
}: TileMapCanvasProps) {
  return (
    <Canvas
      orthographic
      camera={{
        position: [16, 16, 100],
        zoom: 15,
        near: 0.1,
        far: 1000,
      }}
      gl={{ antialias: false, preserveDrawingBuffer: true }}
      style={{
        background: '#0d1117',
        cursor: tool === 'pan' ? 'grab' : 'crosshair',
        ...style,
      }}
      flat
    >
      <Scene
        chunks={chunks}
        tiles={tiles}
        chunkSize={chunkSize}
        tool={tool}
        onPaint={onPaint}
        onEnsureChunk={onEnsureChunk}
      />
    </Canvas>
  );
}
