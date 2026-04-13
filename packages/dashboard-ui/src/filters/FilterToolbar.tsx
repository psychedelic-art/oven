import React, { useState } from 'react';
import {
  Box,
  Chip,
  Button,
  Menu,
  MenuItem,
  ListItemText,
  Switch,
} from '@mui/material';
import type { FilterDefinition, FilterValue } from './types';
import { getActiveFilterLabels } from './useUrlFilters';
import { QuickSearchFilter } from './QuickSearchFilter';
import { ComboBoxFilter } from './ComboBoxFilter';
import { StatusFilter } from './StatusFilter';
import { DateRangeFilter } from './DateRangeFilter';

export type FilterToolbarProps = {
  filters: FilterDefinition[];
  filterValues: Record<string, FilterValue>;
  setFilters: (filters: Record<string, FilterValue>) => void;
};

export function FilterToolbar({
  filters,
  filterValues,
  setFilters,
}: FilterToolbarProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const popoverOpen = Boolean(anchorEl);

  const alwaysOnFilters = filters.filter((f) => f.alwaysOn);
  const popoverFilters = filters.filter((f) => !f.alwaysOn);
  // Which popover filters are currently visible (toggled on)
  const [visibleSources, setVisibleSources] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (const def of popoverFilters) {
      const val = filterValues[def.source];
      if (val !== undefined && val !== null && val !== '') {
        initial.add(def.source);
      }
    }
    return initial;
  });

  const handleFilterChange = (source: string, value: FilterValue) => {
    const next = { ...filterValues };
    if (value === null || value === undefined) {
      delete next[source];
    } else {
      next[source] = value;
    }
    setFilters(next);
  };

  const handleClearAll = () => {
    const next: Record<string, FilterValue> = {};
    // Preserve tenantId — managed by TenantContext, not filter chips
    if (filterValues.tenantId !== undefined) {
      next.tenantId = filterValues.tenantId;
    }
    setFilters(next);
    setVisibleSources(new Set());
  };

  const togglePopoverFilter = (source: string) => {
    setVisibleSources((prev) => {
      const next = new Set(prev);
      if (next.has(source)) {
        next.delete(source);
        // Also clear the filter value
        handleFilterChange(source, null);
      } else {
        next.add(source);
      }
      return next;
    });
  };

  const activeLabels = getActiveFilterLabels(filterValues, filters);

  const renderFilter = (def: FilterDefinition) => {
    const value = filterValues[def.source];
    switch (def.kind) {
      case 'quick-search':
        return (
          <QuickSearchFilter
            key={def.source}
            source={def.source}
            label={def.label}
            value={(value as string) ?? ''}
            onChange={handleFilterChange}
          />
        );
      case 'combo':
        return (
          <ComboBoxFilter
            key={def.source}
            source={def.source}
            label={def.label}
            value={(value as string) ?? null}
            choices={def.choices ?? []}
            onChange={handleFilterChange}
          />
        );
      case 'status':
        return (
          <StatusFilter
            key={def.source}
            source={def.source}
            label={def.label}
            value={(value as string) ?? null}
            choices={def.choices ?? []}
            onChange={handleFilterChange}
          />
        );
      case 'date-range':
        return (
          <DateRangeFilter
            key={def.source}
            source={def.source}
            label={def.label}
            value={(value as { gte?: string; lte?: string }) ?? null}
            onChange={handleFilterChange}
          />
        );
      case 'boolean':
        return (
          <Box key={def.source} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Switch
              size="small"
              checked={Boolean(value)}
              onChange={(_e, checked) => handleFilterChange(def.source, checked || null)}
            />
            <Box component="span" sx={{ fontSize: 13, color: 'text.secondary' }}>
              {def.label}
            </Box>
          </Box>
        );
      default:
        return null;
    }
  };

  // Visible popover filters (toggled on by the user)
  const activePopoverFilters = popoverFilters.filter((f) => visibleSources.has(f.source));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 1 }}>
      {/* Row 1: always-on filters + filter button */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
        {alwaysOnFilters.map(renderFilter)}

        {popoverFilters.length > 0 && (
          <>
            <Button
              size="small"
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={{ textTransform: 'none' }}
            >
              Filters
            </Button>
            <Menu
              anchorEl={anchorEl}
              open={popoverOpen}
              onClose={() => setAnchorEl(null)}
            >
              {popoverFilters.map((def) => (
                <MenuItem
                  key={def.source}
                  onClick={() => togglePopoverFilter(def.source)}
                  selected={visibleSources.has(def.source)}
                >
                  <ListItemText>{def.label}</ListItemText>
                </MenuItem>
              ))}
            </Menu>
          </>
        )}
      </Box>

      {/* Row 2: toggled-on popover filters */}
      {activePopoverFilters.length > 0 && (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          {activePopoverFilters.map(renderFilter)}
        </Box>
      )}

      {/* Row 3: active filter chips */}
      {activeLabels.length > 0 && (
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
          {activeLabels.map((chip) => (
            <Chip
              key={chip.source}
              label={`${chip.label}: ${chip.displayValue}`}
              size="small"
              variant="outlined"
              onDelete={() => handleFilterChange(chip.source, null)}
            />
          ))}
          <Chip
            label="Clear all"
            size="small"
            onClick={handleClearAll}
            sx={{ cursor: 'pointer' }}
          />
        </Box>
      )}
    </Box>
  );
}
