import type { NodeTypeDefinition, NodeParamDefinition, NodeCategory } from './types';

/**
 * The Node Registry catalogs every available "task" that can be used
 * as a workflow node. It auto-builds from registered modules' API handlers
 * and also includes built-in utility nodes.
 */

// ─── Built-in utility nodes ─────────────────────────────────────

const builtinNodes: NodeTypeDefinition[] = [
  {
    id: 'core.condition',
    label: 'Condition',
    module: 'core',
    category: 'condition',
    description: 'Branch workflow based on payload values (if/else)',
    inputs: [
      { name: 'key', type: 'string', description: 'Payload key to check', required: true },
      { name: 'operator', type: 'string', description: 'Comparison: ==, !=, >, <, >=, <=, contains, exists', required: true },
      { name: 'value', type: 'string', description: 'Expected value to compare against' },
    ],
    outputs: [
      { name: 'result', type: 'boolean', description: 'Whether condition matched' },
    ],
  },
  {
    id: 'core.transform',
    label: 'Transform',
    module: 'core',
    category: 'transform',
    description: 'Map and reshape data between nodes using $.path syntax',
    inputs: [
      { name: 'mapping', type: 'object', description: 'Key-value map: { targetKey: "$.sourceKey" }', required: true },
    ],
    outputs: [
      { name: 'result', type: 'object', description: 'Transformed payload' },
    ],
  },
  {
    id: 'core.delay',
    label: 'Delay',
    module: 'core',
    category: 'delay',
    description: 'Wait a specified number of milliseconds before continuing',
    inputs: [
      { name: 'ms', type: 'number', description: 'Milliseconds to wait', required: true, example: 1000 },
    ],
    outputs: [],
  },
  {
    id: 'core.emit',
    label: 'Emit Event',
    module: 'core',
    category: 'event-emit',
    description: 'Emit an event on the EventBus',
    inputs: [
      { name: 'event', type: 'string', description: 'Event name to emit', required: true, example: 'players.player.created' },
      { name: 'payload', type: 'object', description: 'Event payload', required: true },
    ],
    outputs: [],
  },
  {
    id: 'core.log',
    label: 'Log',
    module: 'core',
    category: 'utility',
    description: 'Log data to console for debugging',
    inputs: [
      { name: 'message', type: 'string', description: 'Log message' },
      { name: 'data', type: 'object', description: 'Data to log' },
    ],
    outputs: [],
  },
  {
    id: 'core.setVariable',
    label: 'Set Variable',
    module: 'core',
    category: 'variable',
    description: 'Assign a value to a named variable (rename, alias, or set literal)',
    inputs: [
      { name: 'name', type: 'string', description: 'Variable name to set', required: true, example: 'playerId' },
      { name: 'value', type: 'string', description: 'Value or $.path expression', required: true, example: '$.id' },
    ],
    outputs: [
      { name: 'name', type: 'string', description: 'The variable name that was set' },
      { name: 'value', type: 'string', description: 'The resolved value' },
    ],
  },
  {
    id: 'core.sql',
    label: 'Execute SQL',
    module: 'core',
    category: 'data',
    description: 'Run a parameterized SQL query against the database',
    inputs: [
      { name: 'query', type: 'string', description: 'SQL query with $1, $2 placeholders', required: true, example: 'SELECT * FROM players WHERE id = $1' },
      { name: 'params', type: 'array', description: 'Array of parameter values ($.path or literals)', required: false, example: ['$.playerId'] },
    ],
    outputs: [
      { name: 'rows', type: 'array', description: 'Query result rows' },
      { name: 'rowCount', type: 'number', description: 'Number of rows returned/affected' },
    ],
  },
  {
    id: 'core.resolveConfig',
    label: 'Resolve Config',
    module: 'core',
    category: 'data',
    description: 'Resolve a module config value using the cascade: instance → module → schema default',
    inputs: [
      { name: 'moduleName', type: 'string', description: 'Module name (e.g., "maps")', required: true, example: 'maps' },
      { name: 'key', type: 'string', description: 'Config key (e.g., "START_CELL_POSITION")', required: true, example: 'START_CELL_POSITION' },
      { name: 'scopeId', type: 'string', description: 'Instance ID for per-instance override (e.g., mapId)' },
    ],
    outputs: [
      { name: 'value', type: 'object', description: 'Resolved config value' },
      { name: 'source', type: 'string', description: 'Where the value came from: instance, module, schema, default' },
    ],
    method: 'GET',
    route: 'module-configs/resolve',
  },
  {
    id: 'core.forEach',
    label: 'ForEach Loop',
    module: 'core',
    category: 'loop',
    description: 'Iterate over an array, optionally in parallel batches',
    inputs: [
      { name: 'collection', type: 'string', description: '$.path to array to iterate', required: true, example: '$.rows' },
      { name: 'itemVariable', type: 'string', description: 'Variable name for current item (default "item")' },
      { name: 'indexVariable', type: 'string', description: 'Variable name for current index (default "index")' },
      { name: 'maxIterations', type: 'number', description: 'Safety limit (default 100)' },
      { name: 'timeoutMs', type: 'number', description: 'Max duration in ms (default 50000)' },
      { name: 'parallelBatchSize', type: 'number', description: 'Batch size for parallel execution (0 = sequential)' },
    ],
    outputs: [
      { name: 'results', type: 'array', description: 'Array of iteration results' },
      { name: 'iterationCount', type: 'number', description: 'Number of completed iterations' },
    ],
  },
  {
    id: 'core.whileLoop',
    label: 'While Loop',
    module: 'core',
    category: 'loop',
    description: 'Repeat while a condition holds, with timeout and max iterations',
    inputs: [
      { name: 'key', type: 'string', description: '$.path to check each iteration', required: true },
      { name: 'operator', type: 'string', description: 'Comparison: ==, !=, >, <, >=, <=, contains, exists', required: true },
      { name: 'value', type: 'string', description: 'Expected value to compare against' },
      { name: 'maxIterations', type: 'number', description: 'Safety limit (default 100)' },
      { name: 'timeoutMs', type: 'number', description: 'Max duration in ms (default 50000)' },
    ],
    outputs: [
      { name: 'iterationCount', type: 'number', description: 'Number of completed iterations' },
    ],
  },
];

// ─── Module API endpoint nodes ──────────────────────────────────

/**
 * Pre-defined node catalog for all existing module endpoints.
 * These are registered statically since the modules are known at build time.
 * For dynamic registration, see `registerModuleNodes()` below.
 */
const moduleApiNodes: NodeTypeDefinition[] = [
  // ── Maps Module: Tiles ──
  {
    id: 'maps.tiles.list',
    label: 'List Tiles',
    module: 'maps',
    category: 'api-call',
    description: 'List all tile definitions with pagination and filtering',
    inputs: [
      { name: 'category', type: 'string', description: 'Filter by tile category' },
      { name: 'q', type: 'string', description: 'Search query' },
    ],
    outputs: [
      { name: 'data', type: 'array', description: 'Array of tile records' },
      { name: 'total', type: 'number', description: 'Total count' },
    ],
    method: 'GET',
    route: 'tiles',
  },
  {
    id: 'maps.tiles.create',
    label: 'Create Tile',
    module: 'maps',
    category: 'api-call',
    description: 'Create a new tile definition',
    inputs: [
      { name: 'name', type: 'string', description: 'Tile name', required: true },
      { name: 'category', type: 'string', description: 'Tile category', required: true },
      { name: 'spriteId', type: 'number', description: 'Sprite ID' },
      { name: 'walkable', type: 'boolean', description: 'Whether tile is walkable' },
    ],
    outputs: [
      { name: 'id', type: 'number', description: 'Created tile ID' },
      { name: 'name', type: 'string', description: 'Tile name' },
    ],
    method: 'POST',
    route: 'tiles',
  },
  {
    id: 'maps.tiles.get',
    label: 'Get Tile',
    module: 'maps',
    category: 'api-call',
    description: 'Get a tile definition by ID',
    inputs: [
      { name: 'id', type: 'number', description: 'Tile ID', required: true },
    ],
    outputs: [
      { name: 'id', type: 'number' },
      { name: 'name', type: 'string' },
      { name: 'category', type: 'string' },
    ],
    method: 'GET',
    route: 'tiles/[id]',
  },
  {
    id: 'maps.tiles.update',
    label: 'Update Tile',
    module: 'maps',
    category: 'api-call',
    description: 'Update a tile definition',
    inputs: [
      { name: 'id', type: 'number', description: 'Tile ID', required: true },
      { name: 'name', type: 'string', description: 'Tile name' },
      { name: 'category', type: 'string', description: 'Tile category' },
    ],
    outputs: [
      { name: 'id', type: 'number' },
    ],
    method: 'PUT',
    route: 'tiles/[id]',
  },
  {
    id: 'maps.tiles.delete',
    label: 'Delete Tile',
    module: 'maps',
    category: 'api-call',
    description: 'Delete a tile definition',
    inputs: [
      { name: 'id', type: 'number', description: 'Tile ID', required: true },
    ],
    outputs: [],
    method: 'DELETE',
    route: 'tiles/[id]',
  },

  // ── Maps Module: World Configs ──
  {
    id: 'maps.worldConfigs.list',
    label: 'List World Configs',
    module: 'maps',
    category: 'api-call',
    description: 'List all world configurations',
    inputs: [
      { name: 'isActive', type: 'boolean', description: 'Filter by active status' },
    ],
    outputs: [
      { name: 'data', type: 'array', description: 'Array of world config records' },
      { name: 'total', type: 'number' },
    ],
    method: 'GET',
    route: 'world-configs',
  },
  {
    id: 'maps.worldConfigs.create',
    label: 'Create World Config',
    module: 'maps',
    category: 'api-call',
    description: 'Create a new world configuration',
    inputs: [
      { name: 'name', type: 'string', required: true },
      { name: 'chunkSize', type: 'number', example: 16 },
      { name: 'seed', type: 'number' },
    ],
    outputs: [
      { name: 'id', type: 'number' },
      { name: 'name', type: 'string' },
    ],
    method: 'POST',
    route: 'world-configs',
  },
  {
    id: 'maps.worldConfigs.get',
    label: 'Get World Config',
    module: 'maps',
    category: 'api-call',
    description: 'Get a world config by ID',
    inputs: [
      { name: 'id', type: 'number', required: true },
    ],
    outputs: [
      { name: 'id', type: 'number' },
      { name: 'name', type: 'string' },
      { name: 'isActive', type: 'boolean' },
    ],
    method: 'GET',
    route: 'world-configs/[id]',
  },
  {
    id: 'maps.worldConfigs.update',
    label: 'Update World Config',
    module: 'maps',
    category: 'api-call',
    description: 'Update a world configuration',
    inputs: [
      { name: 'id', type: 'number', required: true },
      { name: 'name', type: 'string' },
      { name: 'chunkSize', type: 'number' },
    ],
    outputs: [
      { name: 'id', type: 'number' },
    ],
    method: 'PUT',
    route: 'world-configs/[id]',
  },
  {
    id: 'maps.worldConfigs.delete',
    label: 'Delete World Config',
    module: 'maps',
    category: 'api-call',
    description: 'Delete a world configuration',
    inputs: [
      { name: 'id', type: 'number', required: true },
    ],
    outputs: [],
    method: 'DELETE',
    route: 'world-configs/[id]',
  },
  {
    id: 'maps.worldConfigs.activate',
    label: 'Activate World Config',
    module: 'maps',
    category: 'api-call',
    description: 'Activate a world config (deactivates all others)',
    inputs: [
      { name: 'id', type: 'number', required: true },
    ],
    outputs: [
      { name: 'id', type: 'number' },
      { name: 'isActive', type: 'boolean' },
    ],
    method: 'POST',
    route: 'world-configs/[id]/activate',
  },

  // ── Maps Module: Maps ──
  {
    id: 'maps.maps.list',
    label: 'List Maps',
    module: 'maps',
    category: 'api-call',
    description: 'List all maps with filtering by status, mode',
    inputs: [
      { name: 'status', type: 'string', description: 'Filter by status' },
      { name: 'mode', type: 'string', description: 'Filter by mode (discovery/prebuilt)' },
      { name: 'q', type: 'string', description: 'Search query' },
    ],
    outputs: [
      { name: 'data', type: 'array' },
      { name: 'total', type: 'number' },
    ],
    method: 'GET',
    route: 'maps',
  },
  {
    id: 'maps.maps.create',
    label: 'Create Map',
    module: 'maps',
    category: 'api-call',
    description: 'Create a new map',
    inputs: [
      { name: 'name', type: 'string', required: true },
      { name: 'mode', type: 'string', description: 'discovery or prebuilt', required: true },
      { name: 'worldConfigId', type: 'number' },
    ],
    outputs: [
      { name: 'id', type: 'number' },
      { name: 'name', type: 'string' },
      { name: 'status', type: 'string' },
    ],
    method: 'POST',
    route: 'maps',
  },
  {
    id: 'maps.maps.get',
    label: 'Get Map',
    module: 'maps',
    category: 'api-call',
    description: 'Get a map by ID',
    inputs: [
      { name: 'id', type: 'number', required: true },
    ],
    outputs: [
      { name: 'id', type: 'number' },
      { name: 'name', type: 'string' },
      { name: 'mode', type: 'string' },
      { name: 'status', type: 'string' },
    ],
    method: 'GET',
    route: 'maps/[id]',
  },
  {
    id: 'maps.maps.update',
    label: 'Update Map',
    module: 'maps',
    category: 'api-call',
    description: 'Update a map',
    inputs: [
      { name: 'id', type: 'number', required: true },
      { name: 'name', type: 'string' },
      { name: 'status', type: 'string' },
    ],
    outputs: [
      { name: 'id', type: 'number' },
    ],
    method: 'PUT',
    route: 'maps/[id]',
  },
  {
    id: 'maps.maps.delete',
    label: 'Delete Map',
    module: 'maps',
    category: 'api-call',
    description: 'Delete a map',
    inputs: [
      { name: 'id', type: 'number', required: true },
    ],
    outputs: [],
    method: 'DELETE',
    route: 'maps/[id]',
  },
  {
    id: 'maps.chunks.get',
    label: 'Get Chunks',
    module: 'maps',
    category: 'api-call',
    description: 'Get chunks for a map (auto-generates for discovery maps)',
    inputs: [
      { name: 'id', type: 'number', description: 'Map ID', required: true },
      { name: 'chunk_x', type: 'number', description: 'Specific chunk X' },
      { name: 'chunk_y', type: 'number', description: 'Specific chunk Y' },
    ],
    outputs: [
      { name: 'data', type: 'array', description: 'Chunk data array' },
    ],
    method: 'GET',
    route: 'maps/[id]/chunks',
  },
  {
    id: 'maps.chunks.upsert',
    label: 'Upsert Chunk',
    module: 'maps',
    category: 'api-call',
    description: 'Create or update chunk data for a map',
    inputs: [
      { name: 'id', type: 'number', description: 'Map ID', required: true },
      { name: 'chunkX', type: 'number', required: true },
      { name: 'chunkY', type: 'number', required: true },
      { name: 'layerData', type: 'string', description: 'Base64-encoded tile data', required: true },
    ],
    outputs: [
      { name: 'id', type: 'number' },
      { name: 'version', type: 'number' },
    ],
    method: 'POST',
    route: 'maps/[id]/chunks',
  },
  {
    id: 'maps.generate',
    label: 'Generate Map Chunks',
    module: 'maps',
    category: 'api-call',
    description: 'Generate chunks for a map via Perlin noise (bulk)',
    inputs: [
      { name: 'id', type: 'number', description: 'Map ID', required: true },
      { name: 'radius', type: 'number', description: 'Generation radius (default 2, max 10)' },
    ],
    outputs: [
      { name: 'chunksGenerated', type: 'number' },
      { name: 'status', type: 'string' },
    ],
    method: 'POST',
    route: 'maps/[id]/generate',
  },

  // ── Players Module ──
  {
    id: 'players.list',
    label: 'List Players',
    module: 'players',
    category: 'api-call',
    description: 'List all players with filtering by status',
    inputs: [
      { name: 'status', type: 'string', description: 'Filter by player status' },
      { name: 'q', type: 'string', description: 'Search query' },
    ],
    outputs: [
      { name: 'data', type: 'array' },
      { name: 'total', type: 'number' },
    ],
    method: 'GET',
    route: 'players',
  },
  {
    id: 'players.create',
    label: 'Create Player',
    module: 'players',
    category: 'api-call',
    description: 'Create a new player',
    inputs: [
      { name: 'username', type: 'string', required: true },
      { name: 'displayName', type: 'string' },
    ],
    outputs: [
      { name: 'id', type: 'number' },
      { name: 'username', type: 'string' },
    ],
    method: 'POST',
    route: 'players',
  },
  {
    id: 'players.get',
    label: 'Get Player',
    module: 'players',
    category: 'api-call',
    description: 'Get a player by ID',
    inputs: [
      { name: 'id', type: 'number', required: true },
    ],
    outputs: [
      { name: 'id', type: 'number' },
      { name: 'username', type: 'string' },
      { name: 'status', type: 'string' },
    ],
    method: 'GET',
    route: 'players/[id]',
  },
  {
    id: 'players.update',
    label: 'Update Player',
    module: 'players',
    category: 'api-call',
    description: 'Update a player',
    inputs: [
      { name: 'id', type: 'number', required: true },
      { name: 'displayName', type: 'string' },
      { name: 'status', type: 'string' },
    ],
    outputs: [
      { name: 'id', type: 'number' },
    ],
    method: 'PUT',
    route: 'players/[id]',
  },

  // ── Sessions Module ──
  {
    id: 'sessions.list',
    label: 'List Sessions',
    module: 'sessions',
    category: 'api-call',
    description: 'List all player sessions',
    inputs: [
      { name: 'playerId', type: 'number', description: 'Filter by player' },
      { name: 'mapId', type: 'number', description: 'Filter by map' },
    ],
    outputs: [
      { name: 'data', type: 'array' },
      { name: 'total', type: 'number' },
    ],
    method: 'GET',
    route: 'sessions',
  },
  {
    id: 'sessions.create',
    label: 'Create Session',
    module: 'sessions',
    category: 'api-call',
    description: 'Start a new player session on a map',
    inputs: [
      { name: 'playerId', type: 'number', required: true },
      { name: 'mapId', type: 'number', required: true },
      { name: 'startTileX', type: 'number' },
      { name: 'startTileY', type: 'number' },
    ],
    outputs: [
      { name: 'id', type: 'number' },
      { name: 'playerId', type: 'number' },
      { name: 'mapId', type: 'number' },
      { name: 'startedAt', type: 'string' },
    ],
    method: 'POST',
    route: 'sessions',
  },
  {
    id: 'sessions.get',
    label: 'Get Session',
    module: 'sessions',
    category: 'api-call',
    description: 'Get a session by ID',
    inputs: [
      { name: 'id', type: 'number', required: true },
    ],
    outputs: [
      { name: 'id', type: 'number' },
      { name: 'playerId', type: 'number' },
      { name: 'mapId', type: 'number' },
      { name: 'status', type: 'string' },
    ],
    method: 'GET',
    route: 'sessions/[id]',
  },
  {
    id: 'sessions.update',
    label: 'Update Session',
    module: 'sessions',
    category: 'api-call',
    description: 'Update a session (e.g. set endedAt to end session)',
    inputs: [
      { name: 'id', type: 'number', required: true },
      { name: 'endedAt', type: 'string', description: 'ISO timestamp to end session' },
    ],
    outputs: [
      { name: 'id', type: 'number' },
    ],
    method: 'PUT',
    route: 'sessions/[id]',
  },
  {
    id: 'sessions.getActive',
    label: 'Get Active Sessions',
    module: 'sessions',
    category: 'api-call',
    description: 'Get active sessions (endedAt is null)',
    inputs: [
      { name: 'playerId', type: 'number', description: 'Filter by player' },
    ],
    outputs: [
      { name: 'data', type: 'array' },
    ],
    method: 'GET',
    route: 'sessions/active',
  },

  // ── Player Map Position Module: Assignments ──
  {
    id: 'positions.assignments.list',
    label: 'List Map Assignments',
    module: 'player-map-position',
    category: 'api-call',
    description: 'List all map assignments',
    inputs: [
      { name: 'playerId', type: 'number' },
      { name: 'mapId', type: 'number' },
    ],
    outputs: [
      { name: 'data', type: 'array' },
      { name: 'total', type: 'number' },
    ],
    method: 'GET',
    route: 'map-assignments',
  },
  {
    id: 'positions.assignments.create',
    label: 'Create Map Assignment',
    module: 'player-map-position',
    category: 'api-call',
    description: 'Assign a player to a map (auto-deactivates previous)',
    inputs: [
      { name: 'playerId', type: 'number', required: true },
      { name: 'mapId', type: 'number', required: true },
      { name: 'spawnTileX', type: 'number' },
      { name: 'spawnTileY', type: 'number' },
    ],
    outputs: [
      { name: 'id', type: 'number' },
      { name: 'playerId', type: 'number' },
      { name: 'mapId', type: 'number' },
      { name: 'isActive', type: 'boolean' },
    ],
    method: 'POST',
    route: 'map-assignments',
  },
  {
    id: 'positions.assignments.get',
    label: 'Get Map Assignment',
    module: 'player-map-position',
    category: 'api-call',
    description: 'Get a map assignment by ID',
    inputs: [
      { name: 'id', type: 'number', required: true },
    ],
    outputs: [
      { name: 'id', type: 'number' },
      { name: 'playerId', type: 'number' },
      { name: 'mapId', type: 'number' },
      { name: 'isActive', type: 'boolean' },
    ],
    method: 'GET',
    route: 'map-assignments/[id]',
  },
  {
    id: 'positions.assignments.update',
    label: 'Update Map Assignment',
    module: 'player-map-position',
    category: 'api-call',
    description: 'Update a map assignment (e.g. deactivate)',
    inputs: [
      { name: 'id', type: 'number', required: true },
      { name: 'isActive', type: 'boolean' },
    ],
    outputs: [
      { name: 'id', type: 'number' },
    ],
    method: 'PUT',
    route: 'map-assignments/[id]',
  },
  {
    id: 'positions.assignments.getActive',
    label: 'Get Active Assignment',
    module: 'player-map-position',
    category: 'api-call',
    description: 'Get active map assignment for a player',
    inputs: [
      { name: 'playerId', type: 'number', description: 'Filter by player' },
    ],
    outputs: [
      { name: 'data', type: 'object', description: 'Active assignment or null' },
    ],
    method: 'GET',
    route: 'map-assignments/active',
  },

  // ── Player Map Position Module: Positions ──
  {
    id: 'positions.record',
    label: 'Record Position',
    module: 'player-map-position',
    category: 'api-call',
    description: 'Record a player position on the map',
    inputs: [
      { name: 'playerId', type: 'number', required: true },
      { name: 'sessionId', type: 'number', required: true },
      { name: 'mapId', type: 'number', required: true },
      { name: 'tileX', type: 'number', required: true },
      { name: 'tileY', type: 'number', required: true },
      { name: 'chunkX', type: 'number', required: true },
      { name: 'chunkY', type: 'number', required: true },
      { name: 'worldX', type: 'number', required: true },
      { name: 'worldY', type: 'number', required: true },
    ],
    outputs: [
      { name: 'id', type: 'number' },
    ],
    method: 'POST',
    route: 'player-positions',
  },

  // ── Player Map Position Module: Visited Chunks ──
  {
    id: 'positions.visitedChunks.record',
    label: 'Record Chunk Visit',
    module: 'player-map-position',
    category: 'api-call',
    description: 'Record/upsert a chunk visit (increments visitCount)',
    inputs: [
      { name: 'playerId', type: 'number', required: true },
      { name: 'mapId', type: 'number', required: true },
      { name: 'chunkX', type: 'number', required: true },
      { name: 'chunkY', type: 'number', required: true },
    ],
    outputs: [
      { name: 'id', type: 'number' },
      { name: 'visitCount', type: 'number' },
    ],
    method: 'POST',
    route: 'visited-chunks',
  },
];

// ─── Registry Class ─────────────────────────────────────────────

class NodeRegistry {
  private nodes = new Map<string, NodeTypeDefinition>();

  constructor() {
    // Register built-in nodes
    for (const node of builtinNodes) {
      this.nodes.set(node.id, node);
    }
    // Register module API nodes
    for (const node of moduleApiNodes) {
      this.nodes.set(node.id, node);
    }
  }

  /** Get a node definition by ID */
  get(id: string): NodeTypeDefinition | undefined {
    return this.nodes.get(id);
  }

  /** Get all registered nodes */
  getAll(): NodeTypeDefinition[] {
    return [...this.nodes.values()];
  }

  /** Get nodes filtered by module */
  getByModule(module: string): NodeTypeDefinition[] {
    return this.getAll().filter((n) => n.module === module);
  }

  /** Get nodes filtered by category */
  getByCategory(category: NodeCategory): NodeTypeDefinition[] {
    return this.getAll().filter((n) => n.category === category);
  }

  /** Get all unique module names */
  getModules(): string[] {
    const modules = new Set(this.getAll().map((n) => n.module));
    return [...modules].sort();
  }

  /** Register a custom node (for plugins or dynamic registration) */
  register(node: NodeTypeDefinition): void {
    this.nodes.set(node.id, node);
  }

  /** Get nodes grouped by module for palette display */
  getGrouped(): Record<string, NodeTypeDefinition[]> {
    const grouped: Record<string, NodeTypeDefinition[]> = {};
    for (const node of this.getAll()) {
      if (!grouped[node.module]) {
        grouped[node.module] = [];
      }
      grouped[node.module].push(node);
    }
    return grouped;
  }

  /** Serialize for API response */
  toJSON(): NodeTypeDefinition[] {
    return this.getAll();
  }
}

export const nodeRegistry = new NodeRegistry();
