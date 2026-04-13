import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Chip,
  Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import EditIcon from '@mui/icons-material/Edit';
import type { UiFlowDefinition, ThemeConfig } from '@oven/module-ui-flows/types';

// ─── Diff types ──────────────────────────────────────────────────

type ChangeKind = 'added' | 'removed' | 'modified';

interface DiffEntry {
  kind: ChangeKind;
  label: string;
  detail?: string;
}

interface DefinitionDiff {
  pages: DiffEntry[];
  navigation: DiffEntry[];
  theme: DiffEntry[];
  settings: DiffEntry[];
}

// ─── Diff computation ────────────────────────────────────────────

function diffPages(
  oldDef: UiFlowDefinition,
  newDef: UiFlowDefinition,
): DiffEntry[] {
  const entries: DiffEntry[] = [];
  const oldById = new Map(oldDef.pages.map((p) => [p.id, p]));
  const newById = new Map(newDef.pages.map((p) => [p.id, p]));

  for (const [id, page] of newById) {
    if (!oldById.has(id)) {
      entries.push({
        kind: 'added',
        label: page.title || page.slug || id,
        detail: `type: ${page.type}`,
      });
    }
  }

  for (const [id, page] of oldById) {
    if (!newById.has(id)) {
      entries.push({
        kind: 'removed',
        label: page.title || page.slug || id,
        detail: `type: ${page.type}`,
      });
    }
  }

  for (const [id, newPage] of newById) {
    const oldPage = oldById.get(id);
    if (!oldPage) continue;
    const changes: string[] = [];
    if (oldPage.title !== newPage.title) changes.push('title');
    if (oldPage.slug !== newPage.slug) changes.push('slug');
    if (oldPage.type !== newPage.type) changes.push('type');
    if (oldPage.formRef !== newPage.formRef) changes.push('formRef');
    if (JSON.stringify(oldPage.config) !== JSON.stringify(newPage.config)) {
      changes.push('config');
    }
    if (changes.length > 0) {
      entries.push({
        kind: 'modified',
        label: newPage.title || newPage.slug || id,
        detail: changes.join(', '),
      });
    }
  }

  return entries;
}

function diffNavigation(
  oldDef: UiFlowDefinition,
  newDef: UiFlowDefinition,
): DiffEntry[] {
  const entries: DiffEntry[] = [];
  if (oldDef.navigation.type !== newDef.navigation.type) {
    entries.push({
      kind: 'modified',
      label: 'Navigation type',
      detail: `${oldDef.navigation.type} -> ${newDef.navigation.type}`,
    });
  }
  const oldIds = oldDef.navigation.items.map((i) => i.pageId);
  const newIds = newDef.navigation.items.map((i) => i.pageId);
  if (JSON.stringify(oldIds) !== JSON.stringify(newIds)) {
    entries.push({
      kind: 'modified',
      label: 'Menu item order',
      detail: `${oldIds.length} -> ${newIds.length} items`,
    });
  }
  return entries;
}

function diffTheme(
  oldTheme: ThemeConfig | undefined,
  newTheme: ThemeConfig | undefined,
): DiffEntry[] {
  const entries: DiffEntry[] = [];
  const old = oldTheme ?? {};
  const next = newTheme ?? {};
  const allKeys = new Set([...Object.keys(old), ...Object.keys(next)]);
  for (const key of allKeys) {
    const oldVal = (old as Record<string, unknown>)[key];
    const newVal = (next as Record<string, unknown>)[key];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      entries.push({
        kind: 'modified',
        label: key,
        detail: `${String(oldVal ?? '(none)')} -> ${String(newVal ?? '(none)')}`,
      });
    }
  }
  return entries;
}

function diffSettings(
  oldDef: UiFlowDefinition,
  newDef: UiFlowDefinition,
): DiffEntry[] {
  const entries: DiffEntry[] = [];
  const old = oldDef.settings ?? {};
  const next = newDef.settings ?? {};
  const allKeys = new Set([...Object.keys(old), ...Object.keys(next)]);
  for (const key of allKeys) {
    const oldVal = (old as Record<string, unknown>)[key];
    const newVal = (next as Record<string, unknown>)[key];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      entries.push({
        kind: 'modified',
        label: key,
        detail: `${String(oldVal ?? '(none)')} -> ${String(newVal ?? '(none)')}`,
      });
    }
  }
  return entries;
}

export function computeDefinitionDiff(
  oldDef: UiFlowDefinition,
  newDef: UiFlowDefinition,
  oldTheme?: ThemeConfig,
  newTheme?: ThemeConfig,
): DefinitionDiff {
  return {
    pages: diffPages(oldDef, newDef),
    navigation: diffNavigation(oldDef, newDef),
    theme: diffTheme(oldTheme, newTheme),
    settings: diffSettings(oldDef, newDef),
  };
}

// ─── Component ───────────────────────────────────────────────────

interface VersionDiffPanelProps {
  oldVersion: { definition: UiFlowDefinition; theme?: ThemeConfig; label: string };
  newVersion: { definition: UiFlowDefinition; theme?: ThemeConfig; label: string };
  onClose: () => void;
}

const KIND_CONFIG: Record<
  ChangeKind,
  { color: 'success' | 'error' | 'warning'; icon: React.ReactNode }
> = {
  added: { color: 'success', icon: <AddCircleOutlineIcon sx={{ fontSize: 14 }} /> },
  removed: { color: 'error', icon: <RemoveCircleOutlineIcon sx={{ fontSize: 14 }} /> },
  modified: { color: 'warning', icon: <EditIcon sx={{ fontSize: 14 }} /> },
};

function DiffSection({
  title,
  entries,
}: {
  title: string;
  entries: DiffEntry[];
}) {
  if (entries.length === 0) return null;
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>
        {title}
      </Typography>
      {entries.map((entry, i) => {
        const cfg = KIND_CONFIG[entry.kind];
        return (
          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
            {cfg.icon}
            <Chip label={entry.kind} size="small" color={cfg.color} sx={{ fontSize: 10, height: 20 }} />
            <Typography variant="body2" sx={{ fontSize: 12 }}>
              {entry.label}
            </Typography>
            {entry.detail && (
              <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto', fontSize: 10 }}>
                {entry.detail}
              </Typography>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

export function VersionDiffPanel({
  oldVersion,
  newVersion,
  onClose,
}: VersionDiffPanelProps) {
  const diff = computeDefinitionDiff(
    oldVersion.definition,
    newVersion.definition,
    oldVersion.theme,
    newVersion.theme,
  );

  const totalChanges =
    diff.pages.length +
    diff.navigation.length +
    diff.theme.length +
    diff.settings.length;

  return (
    <Box
      sx={{
        width: 360,
        borderLeft: '1px solid',
        borderColor: 'divider',
        overflow: 'auto',
        bgcolor: 'background.paper',
        p: 2,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
        }}
      >
        <Typography variant="subtitle2">Version Diff</Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Chip label={oldVersion.label} size="small" variant="outlined" />
        <Typography variant="caption" color="text.secondary">
          vs
        </Typography>
        <Chip label={newVersion.label} size="small" color="primary" />
      </Box>

      <Divider sx={{ mb: 2 }} />

      {totalChanges === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          No differences found between these versions.
        </Typography>
      ) : (
        <>
          <DiffSection title="Pages" entries={diff.pages} />
          <DiffSection title="Navigation" entries={diff.navigation} />
          <DiffSection title="Theme" entries={diff.theme} />
          <DiffSection title="Settings" entries={diff.settings} />
        </>
      )}
    </Box>
  );
}
