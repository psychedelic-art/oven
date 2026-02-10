'use client';

import { Menu } from 'react-admin';
import SettingsIcon from '@mui/icons-material/Settings';

export default function CustomMenu() {
  return (
    <Menu>
      <Menu.DashboardItem />
      <Menu.ResourceItem name="tiles" />
      <Menu.ResourceItem name="world-configs" />
      <Menu.ResourceItem name="maps" />
      <Menu.ResourceItem name="players" />
      <Menu.ResourceItem name="sessions" />
      <Menu.Item
        to="/modules"
        primaryText="Modules & Events"
        leftIcon={<SettingsIcon />}
      />
    </Menu>
  );
}
