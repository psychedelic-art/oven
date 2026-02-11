# Workflow Examples

## Example 1: Player Onboarding

When a player connects, this workflow creates a session, checks for an existing map assignment, creates one if needed, and records the initial position.

**Trigger**: `players.player.created`

```
[Trigger] → [Create Session] → [Check Active Assignment]
                                   ├── (exists) → [Record Position] → [End]
                                   └── (not exists) → [Create Assignment] → [Record Position] → [End]
```

### Definition

```json
{
  "id": "player-onboarding",
  "initial": "trigger",
  "states": {
    "trigger": {
      "always": { "target": "createSession" }
    },
    "createSession": {
      "invoke": {
        "src": "sessions.create",
        "input": { "playerId": "$.id", "mapId": 1 },
        "onDone": { "target": "checkAssignment" },
        "onError": { "target": "failed" }
      }
    },
    "checkAssignment": {
      "invoke": {
        "src": "positions.assignments.getActive",
        "input": { "playerId": "$.id" },
        "onDone": { "target": "branchOnAssignment" }
      }
    },
    "branchOnAssignment": {
      "always": [
        {
          "target": "recordPosition",
          "guard": {
            "type": "condition",
            "params": { "key": "data", "operator": "exists" }
          }
        },
        { "target": "createAssignment" }
      ]
    },
    "createAssignment": {
      "invoke": {
        "src": "positions.assignments.create",
        "input": { "playerId": "$.id", "mapId": 1 },
        "onDone": { "target": "recordPosition" }
      }
    },
    "recordPosition": {
      "invoke": {
        "src": "positions.record",
        "input": {
          "playerId": "$.id",
          "sessionId": "$.createSession_output.id",
          "mapId": 1,
          "tileX": 0, "tileY": 0,
          "chunkX": 0, "chunkY": 0,
          "worldX": 0, "worldY": 0
        },
        "onDone": { "target": "done" }
      }
    },
    "done": { "type": "final" },
    "failed": { "type": "final" }
  }
}
```

---

## Example 2: Map Generation Pipeline

When a map is created, auto-activate a world config and generate initial chunks.

**Trigger**: `maps.map.created`

```
[Trigger] → [Get Active Config] → [Generate Chunks] → [Update Map Status] → [Emit Ready] → [End]
```

---

## Example 3: Session Cleanup on Player Ban

When a player is banned, end all active sessions and deactivate map assignments.

**Trigger**: `players.player.banned`

```
[Trigger] → [Get Active Sessions] → [End Each Session] → [Deactivate Assignment] → [Log] → [End]
```

---

## Creating Workflows via the Editor

1. Go to `/#/workflows/create` and enter a name
2. Click "Visual Editor" on the workflow edit page
3. Drag a **Trigger** node from the palette
4. Drag **API Call** nodes for each step
5. Connect them with edges (drag from output handle to input handle)
6. For branching: add a **Condition** node, connect true/false outputs to different paths
7. End with an **End** node
8. Click **Save** to convert the graph to XState JSON
9. Set a **Trigger Event** on the workflow edit page for auto-start
10. Click **Execute** to test manually
