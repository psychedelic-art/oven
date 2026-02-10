using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Tilemaps;
using Oven.Core.Chunks.Data;
using Oven.Core.Rendering.Interfaces;
using Oven.Infrastructure.Pooling;
using TileLayer = Oven.Core.Tiles.Data.TileLayer;
using WorldConstants = Oven.Core.Tiles.Data.WorldConstants;

namespace Oven.Core.Rendering
{
    public class TilemapChunkRenderer : IChunkRenderer
    {
        private readonly TilemapPool _pool;
        private readonly ITileRegistry _tileRegistry;
        private readonly Dictionary<ChunkCoord, GameObject> _activeChunks = new Dictionary<ChunkCoord, GameObject>();

        // Reusable arrays to avoid per-frame allocation
        private readonly TileBase[] _tileBaseBuffer = new TileBase[WorldConstants.TILES_PER_CHUNK];

        public int ActiveChunkCount => _activeChunks.Count;

        public TilemapChunkRenderer(TilemapPool pool, ITileRegistry tileRegistry)
        {
            _pool = pool;
            _tileRegistry = tileRegistry;
        }

        public void RenderChunk(ChunkCoord coord, ChunkData data)
        {
            if (_activeChunks.ContainsKey(coord))
                return;

            GameObject grid = _pool.Acquire();

            // Position the grid at the chunk's world origin
            grid.transform.position = new Vector3(
                coord.X * WorldConstants.CHUNK_SIZE,
                coord.Y * WorldConstants.CHUNK_SIZE,
                0f
            );

            // Render Ground and Decoration layers
            RenderLayer(grid, data, TileLayer.Ground);
            RenderLayer(grid, data, TileLayer.Decoration);

            _activeChunks[coord] = grid;
        }

        public void UnrenderChunk(ChunkCoord coord)
        {
            if (!_activeChunks.TryGetValue(coord, out var grid))
                return;

            _pool.Release(grid);
            _activeChunks.Remove(coord);
        }

        private void RenderLayer(GameObject grid, ChunkData data, TileLayer layer)
        {
            Tilemap tilemap = _pool.GetLayerTilemap(grid, layer);
            Oven.Core.Tiles.Data.TileData[] layerData = data.GetLayerData(layer);

            // Map TileData -> TileBase using registry
            bool hasAnyTile = false;
            for (int i = 0; i < WorldConstants.TILES_PER_CHUNK; i++)
            {
                ushort tileId = layerData[i].TileId;
                if (tileId != 0)
                {
                    _tileBaseBuffer[i] = _tileRegistry.GetTileBase(tileId);
                    hasAnyTile = true;
                }
                else
                {
                    _tileBaseBuffer[i] = null;
                }
            }

            // Skip empty layers entirely
            if (!hasAnyTile)
                return;

            // Batch set all tiles at once
            var bounds = new BoundsInt(0, 0, 0, WorldConstants.CHUNK_SIZE, WorldConstants.CHUNK_SIZE, 1);
            tilemap.SetTilesBlock(bounds, _tileBaseBuffer);
        }
    }
}
