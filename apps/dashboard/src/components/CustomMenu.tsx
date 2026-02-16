'use client';

import { Menu } from 'react-admin';
import SettingsIcon from '@mui/icons-material/Settings';
import { Typography, Divider, Box } from '@mui/material';

export default function CustomMenu() {
  return (
    <Menu>
      <Menu.DashboardItem />

      <Box sx={{ px: 2, pt: 2, pb: 0.5 }}>
        <Typography variant="overline" color="text.secondary" sx={{ fontSize: 10 }}>
          World
        </Typography>
      </Box>
      <Menu.ResourceItem name="tiles" />
      <Menu.ResourceItem name="tilesets" />
      <Menu.ResourceItem name="world-configs" />
      <Menu.ResourceItem name="maps" />

      <Divider sx={{ my: 1 }} />
      <Box sx={{ px: 2, pb: 0.5 }}>
        <Typography variant="overline" color="text.secondary" sx={{ fontSize: 10 }}>
          Players
        </Typography>
      </Box>
      <Menu.ResourceItem name="players" />
      <Menu.ResourceItem name="sessions" />
      <Menu.ResourceItem name="map-assignments" />
      <Menu.ResourceItem name="player-positions" />

      <Divider sx={{ my: 1 }} />
      <Box sx={{ px: 2, pb: 0.5 }}>
        <Typography variant="overline" color="text.secondary" sx={{ fontSize: 10 }}>
          Automation
        </Typography>
      </Box>
      <Menu.ResourceItem name="workflows" />
      <Menu.ResourceItem name="workflow-executions" />
      <Menu.ResourceItem name="module-configs" />

      <Divider sx={{ my: 1 }} />
      <Box sx={{ px: 2, pb: 0.5 }}>
        <Typography variant="overline" color="text.secondary" sx={{ fontSize: 10 }}>
          System
        </Typography>
      </Box>
      <Menu.Item
        to="/modules"
        primaryText="Modules & Events"
        leftIcon={<SettingsIcon />}
      />
    </Menu>
  );
}
