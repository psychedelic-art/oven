import { workflows, moduleConfigs } from './schema';

/**
 * Seed 3 workflow definitions + default module config values.
 * These workflows orchestrate Unity ↔ Dashboard interactions:
 *   1. player-spawn  — Full spawn orchestration (end old session → resolve position → create session + assignment)
 *   2. session-end   — Session termination (update session → save position → emit event)
 *   3. session-resume — Check for resumable session on startup
 */
export async function seedWorkflows(db: any): Promise<void> {
  // ─── Workflow 1: player-spawn ──────────────────────────────────
  const playerSpawnDefinition = {
    initial: 'checkActiveSession',
    payloadSchema: [
      { name: 'playerId', type: 'number', required: true },
      { name: 'mapId', type: 'number', required: true },
    ],
    states: {
      checkActiveSession: {
        invoke: {
          src: 'sessions.getActive',
          input: { playerId: '$.playerId' },
          onDone: 'evaluateActiveSession',
        },
      },
      evaluateActiveSession: {
        always: [
          {
            // sessions.getActive returns array; spread into context gives {0: {...}, 1: {...}}
            guard: { params: { key: '0', operator: 'exists' } },
            target: 'endExistingSession',
          },
          { target: 'resolveSpawnConfig' },
        ],
      },
      endExistingSession: {
        invoke: {
          src: 'core.sql',
          input: {
            query:
              "UPDATE player_sessions SET ended_at = NOW() WHERE player_id = $1 AND ended_at IS NULL",
            params: ['$.playerId'],
          },
          onDone: 'resolveSpawnConfig',
        },
      },
      resolveSpawnConfig: {
        always: [
          {
            // assignments.getActive returns array; check if first element has position data
            guard: { params: { key: '0.currentTileX', operator: 'exists' } },
            target: 'useLastPosition',
          },
          { target: 'resolveSpawnConfig' },
        ],
      },
      useLastPosition: {
        invoke: {
          src: 'core.setVariable',
          input: { name: 'spawnX', value: '$.0.currentTileX' },
          onDone: 'setSpawnY',
        },
      },
      setSpawnY: {
        invoke: {
          src: 'core.setVariable',
          input: { name: 'spawnY', value: '$.0.currentTileY' },
          onDone: 'createSession',
        },
      },
      resolveSpawnConfig: {
        invoke: {
          src: 'core.resolveConfig',
          input: {
            moduleName: 'maps',
            key: 'START_CELL_POSITION',
            scopeId: '$.mapId',
          },
          onDone: 'extractSpawnFromConfig',
        },
      },
      extractSpawnFromConfig: {
        invoke: {
          src: 'core.transform',
          input: {
            mapping: {
              spawnX: '$.value.x',
              spawnY: '$.value.y',
            },
          },
          onDone: 'createSession',
        },
      },
      createSession: {
        invoke: {
          src: 'sessions.create',
          input: {
            playerId: '$.playerId',
            mapId: '$.mapId',
            startTileX: '$.spawnX',
            startTileY: '$.spawnY',
          },
          onDone: 'saveSessionId',
        },
      },
      saveSessionId: {
        invoke: {
          src: 'core.setVariable',
          input: { name: 'sessionId', value: '$.id' },
          onDone: 'createAssignment',
        },
      },
      createAssignment: {
        invoke: {
          src: 'positions.assignments.create',
          input: {
            playerId: '$.playerId',
            mapId: '$.mapId',
            spawnTileX: '$.spawnX',
            spawnTileY: '$.spawnY',
          },
          onDone: 'saveAssignmentId',
        },
      },
      saveAssignmentId: {
        invoke: {
          src: 'core.setVariable',
          input: { name: 'assignmentId', value: '$.id' },
          onDone: 'done',
        },
      },
      done: { type: 'final' },
    },
  };

  // ─── Workflow 2: session-end ───────────────────────────────────
  const sessionEndDefinition = {
    initial: 'updateSession',
    payloadSchema: [
      { name: 'sessionId', type: 'number', required: true },
      { name: 'assignmentId', type: 'number', required: true },
      { name: 'endTileX', type: 'number', required: true },
      { name: 'endTileY', type: 'number', required: true },
      { name: 'tilesTraveled', type: 'number', required: true },
      { name: 'chunksLoaded', type: 'number', required: true },
    ],
    states: {
      updateSession: {
        invoke: {
          src: 'sessions.update',
          input: {
            id: '$.sessionId',
            endedAt: 'now',
            endTileX: '$.endTileX',
            endTileY: '$.endTileY',
            tilesTraveled: '$.tilesTraveled',
            chunksLoaded: '$.chunksLoaded',
          },
          onDone: 'updateAssignment',
        },
      },
      updateAssignment: {
        invoke: {
          src: 'positions.assignments.update',
          input: {
            id: '$.assignmentId',
            currentTileX: '$.endTileX',
            currentTileY: '$.endTileY',
          },
          onDone: 'emitSessionEnded',
        },
      },
      emitSessionEnded: {
        invoke: {
          src: 'core.emit',
          input: {
            event: 'sessions.session.ended',
            payload: {
              sessionId: '$.sessionId',
              endTileX: '$.endTileX',
              endTileY: '$.endTileY',
              tilesTraveled: '$.tilesTraveled',
              chunksLoaded: '$.chunksLoaded',
            },
          },
          onDone: 'done',
        },
      },
      done: { type: 'final' },
    },
  };

  // ─── Workflow 3: session-resume ────────────────────────────────
  const sessionResumeDefinition = {
    initial: 'checkActiveSession',
    payloadSchema: [
      { name: 'playerId', type: 'number', required: true },
    ],
    states: {
      checkActiveSession: {
        invoke: {
          src: 'sessions.getActive',
          input: { playerId: '$.playerId' },
          onDone: 'checkHasSession',
        },
      },
      checkHasSession: {
        always: [
          {
            guard: { params: { key: 'data.length', operator: '>', value: 0 } },
            target: 'extractSession',
          },
          { target: 'noActiveSession' },
        ],
      },
      extractSession: {
        invoke: {
          src: 'core.transform',
          input: {
            mapping: {
              sessionId: '$.data.0.id',
              mapId: '$.data.0.mapId',
              hasSession: true,
            },
          },
          onDone: 'getAssignment',
        },
      },
      getAssignment: {
        invoke: {
          src: 'positions.assignments.getActive',
          input: { playerId: '$.playerId' },
          onDone: 'done',
        },
      },
      noActiveSession: {
        invoke: {
          src: 'core.setVariable',
          input: { name: 'hasSession', value: false },
          onDone: 'done',
        },
      },
      done: { type: 'final' },
    },
  };

  // Insert workflow definitions
  const workflowSeeds = [
    {
      name: 'Player Spawn',
      slug: 'player-spawn',
      description:
        'Orchestrates player spawning: ends existing session, resolves spawn position (last position or config START_CELL_POSITION), creates session + map assignment.',
      definition: playerSpawnDefinition,
      enabled: true,
    },
    {
      name: 'Session End',
      slug: 'session-end',
      description:
        'Terminates a session: updates session with final stats, saves final position on assignment, emits session.ended event.',
      definition: sessionEndDefinition,
      enabled: true,
    },
    {
      name: 'Session Resume',
      slug: 'session-resume',
      description:
        'Checks if a player has an active session and returns session + position data for resuming gameplay.',
      definition: sessionResumeDefinition,
      enabled: true,
    },
  ];

  for (const wf of workflowSeeds) {
    await db
      .insert(workflows)
      .values(wf)
      .onConflictDoNothing({ target: workflows.slug });
  }

  // ─── Seed default module config values ─────────────────────────
  const configSeeds = [
    {
      moduleName: 'maps',
      scope: 'module',
      key: 'START_CELL_POSITION',
      value: { x: 0, y: 0 },
      description: 'Default spawn tile position for all maps',
    },
    // Instance override for map 1 (Test Discovery World): spawn at center
    {
      moduleName: 'maps',
      scope: 'instance',
      scopeId: '1',
      key: 'START_CELL_POSITION',
      value: { x: 16, y: 16 },
      description: 'Spawn at center of Test Discovery World (map 1)',
    },
    {
      moduleName: 'maps',
      scope: 'module',
      key: 'MAX_DISCOVERY_CHUNKS',
      value: 10000,
      description: 'Maximum chunks a discovery map can auto-generate',
    },
    {
      moduleName: 'maps',
      scope: 'module',
      key: 'DEFAULT_SPAWN_RADIUS',
      value: 2,
      description: 'Radius around spawn to pre-load chunks',
    },
    {
      moduleName: 'sessions',
      scope: 'module',
      key: 'SESSION_TTL_SECONDS',
      value: 300,
      description: 'Seconds of inactivity before session auto-expires',
    },
    {
      moduleName: 'sessions',
      scope: 'module',
      key: 'SESSION_WARNING_SECONDS',
      value: 240,
      description: 'Seconds of inactivity before showing expiry warning in UI',
    },
  ];

  for (const cfg of configSeeds) {
    await db
      .insert(moduleConfigs)
      .values(cfg)
      .onConflictDoNothing();
  }

  console.log(
    '[module-workflows] Seeded 3 workflow definitions + 5 module config defaults'
  );
}
