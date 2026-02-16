'use client';

import { useEffect, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { MapControls } from '@react-three/drei';
import * as THREE from 'three';
import { ChunkMesh } from './ChunkMesh';
import { ChunkBoundaries } from './ChunkGrid';
import { PaintLayer } from './PaintLayer';
import { CursorHighlight } from './CursorHighlight';
import { StampPreview } from './StampPreview';
import { BoundsOverlay } from './BoundsOverlay';
import { useSpriteLoader } from '../hooks/useSpriteLoader';
import type { ChunkData, TileDef, TilesetDef, EditorTool, MapBounds, StampPattern } from '../types';

/**
 * Ensures the orthographic camera is oriented straight down (no perspective tilt).
 * Resets up vector and rotation on mount to prevent any accidental rotation.
 */
function CameraSetup() {
  const { camera } = useThree();
  useEffect(() => {
    camera.up.set(0, 1, 0);
    camera.rotation.set(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera]);
  return null;
}

interface TileMapCanvasProps {
  chunks: Map<string, ChunkData>;
  tiles: TileDef[];
  tilesets?: TilesetDef[];
  chunkSize: number;
  tool: EditorTool;
  onPaint: (worldX: number, worldY: number) => void;
  onEnsureChunk: (cx: number, cy: number) => void;
  onStampPaint?: (worldX: number, worldY: number) => void;
  onStrokeStart?: () => void;
  onStrokeEnd?: (type: string) => void;
  onCursorMove?: (worldX: number, worldY: number) => void;
  onPickTile?: (worldX: number, worldY: number) => void;
  onInspectTile?: (worldX: number, worldY: number) => void;
  bounds?: MapBounds | null;
  boundsVisible?: boolean;
  onBoundsChange?: (bounds: MapBounds) => void;
  activeStamp?: StampPattern | null;
  style?: React.CSSProperties;
}

function Scene({
  chunks,
  tiles,
  tilesets,
  chunkSize,
  tool,
  onPaint,
  onEnsureChunk,
  onStampPaint,
  onStrokeStart,
  onStrokeEnd,
  onCursorMove,
  onPickTile,
  onInspectTile,
  bounds,
  boundsVisible,
  onBoundsChange,
  activeStamp,
}: Omit<TileMapCanvasProps, 'style'>) {
  // Load spritesheet images for tile rendering
  const spriteCache = useSpriteLoader(tilesets ?? [], tiles);

  // Build tile color lookup (fallback for tiles without sprites)
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

  // Visible chunk coordinates — filter out completely empty chunks
  const { renderedChunks, allChunkCoords } = useMemo(() => {
    const rendered: [string, ChunkData][] = [];
    const coords: [number, number][] = [];
    for (const [key, chunk] of chunks.entries()) {
      coords.push([chunk.chunkX, chunk.chunkY]);
      // Skip rendering empty chunks (all tiles === 0)
      if (!chunk.tiles.every(t => t === 0)) {
        rendered.push([key, chunk]);
      }
    }
    return { renderedChunks: rendered, allChunkCoords: coords };
  }, [chunks]);

  const isPanTool = tool === 'pan';

  return (
    <>
      {/* Camera setup — lock orientation */}
      <CameraSetup />

      {/* Chunk tiles (skip empty chunks) */}
      {renderedChunks.map(([key, chunk]) => (
        <ChunkMesh
          key={key}
          chunk={chunk}
          chunkSize={chunkSize}
          tileColorMap={tileColorMap}
          spriteCache={spriteCache}
        />
      ))}

      {/* Chunk boundaries */}
      <ChunkBoundaries chunkSize={chunkSize} visibleChunks={allChunkCoords} />

      {/* Bounds overlay */}
      {bounds && onBoundsChange && (
        <BoundsOverlay
          bounds={bounds}
          visible={boundsVisible ?? true}
          chunkSize={chunkSize}
          onBoundsChange={onBoundsChange}
        />
      )}

      {/* Paint interaction layer */}
      <PaintLayer
        onPaint={onPaint}
        onEnsureChunk={onEnsureChunk}
        onStampPaint={onStampPaint}
        onStrokeStart={onStrokeStart}
        onStrokeEnd={onStrokeEnd}
        onCursorMove={onCursorMove}
        onPickTile={onPickTile}
        onInspectTile={onInspectTile}
        tool={tool}
        chunkSize={chunkSize}
      />

      {/* Cursor highlight */}
      <CursorHighlight tool={tool} />

      {/* Stamp preview */}
      <StampPreview
        tool={tool}
        activeStamp={activeStamp ?? null}
        tileColorMap={tileColorMap}
        spriteCache={spriteCache}
      />

      {/* Camera controls — pan/zoom with mouse, no rotation */}
      <MapControls
        enableRotate={false}
        enableDamping
        dampingFactor={0.15}
        target={[16, 16, 0]}
        screenSpacePanning
        mouseButtons={{
          LEFT: isPanTool ? THREE.MOUSE.PAN : undefined as any,
          MIDDLE: THREE.MOUSE.PAN,
          RIGHT: THREE.MOUSE.PAN,
        }}
        touches={{
          ONE: THREE.TOUCH.PAN,
          TWO: THREE.TOUCH.DOLLY_PAN,
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
  tilesets,
  chunkSize,
  tool,
  onPaint,
  onEnsureChunk,
  onStampPaint,
  onStrokeStart,
  onStrokeEnd,
  onCursorMove,
  onPickTile,
  onInspectTile,
  bounds,
  boundsVisible,
  onBoundsChange,
  activeStamp,
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
        tilesets={tilesets}
        chunkSize={chunkSize}
        tool={tool}
        onPaint={onPaint}
        onEnsureChunk={onEnsureChunk}
        onStampPaint={onStampPaint}
        onStrokeStart={onStrokeStart}
        onStrokeEnd={onStrokeEnd}
        onCursorMove={onCursorMove}
        onPickTile={onPickTile}
        onInspectTile={onInspectTile}
        bounds={bounds}
        boundsVisible={boundsVisible}
        onBoundsChange={onBoundsChange}
        activeStamp={activeStamp}
      />
    </Canvas>
  );
}
