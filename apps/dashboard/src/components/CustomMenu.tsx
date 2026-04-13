'use client';

import { Menu } from 'react-admin';
import SettingsIcon from '@mui/icons-material/Settings';
import ApiIcon from '@mui/icons-material/Api';
import ScienceIcon from '@mui/icons-material/Science';
import BarChartIcon from '@mui/icons-material/BarChart';
import BuildIcon from '@mui/icons-material/Build';
import ExtensionIcon from '@mui/icons-material/Extension';
import FolderIcon from '@mui/icons-material/Folder';
import SearchIcon from '@mui/icons-material/Search';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import { MenuSectionLabel } from '@oven/dashboard-ui';

export default function CustomMenu() {
  return (
    <Menu>
      <Menu.DashboardItem />

      <MenuSectionLabel label="World" showDivider={false} />
      <Menu.ResourceItem name="tiles" />
      <Menu.ResourceItem name="tilesets" />
      <Menu.ResourceItem name="world-configs" />
      <Menu.ResourceItem name="maps" />

      <MenuSectionLabel label="Players" />
      <Menu.ResourceItem name="players" />
      <Menu.ResourceItem name="sessions" />
      <Menu.ResourceItem name="map-assignments" />
      <Menu.ResourceItem name="player-positions" />

      <MenuSectionLabel label="Automation" />
      <Menu.ResourceItem name="workflows" />
      <Menu.ResourceItem name="workflow-executions" />

      <MenuSectionLabel label="AI Services" />
      <Menu.ResourceItem name="ai-providers" />
      <Menu.ResourceItem name="ai-aliases" />
      <Menu.ResourceItem name="ai-vector-stores" />
      <Menu.ResourceItem name="ai-usage-logs" />
      <Menu.ResourceItem name="ai-budgets" />
      <Menu.ResourceItem name="ai-guardrails" />
      <Menu.Item to="/ai/playground" primaryText="AI Playground" leftIcon={<ScienceIcon />} />
      <Menu.Item to="/ai/usage-dashboard" primaryText="Usage Dashboard" leftIcon={<BarChartIcon />} />
      <Menu.Item to="/ai/tool-catalog" primaryText="Tool Catalog" leftIcon={<BuildIcon />} />
      <Menu.Item to="/ai/extensions" primaryText="Extensions" leftIcon={<ExtensionIcon />} />
      <Menu.Item to="/ai/playground-config" primaryText="Playground Config" leftIcon={<SettingsIcon />} />
      <Menu.ResourceItem name="ai-playground-executions" />

      <MenuSectionLabel label="Knowledge Base" />
      <Menu.ResourceItem name="kb-knowledge-bases" />
      <Menu.ResourceItem name="kb-categories" />
      <Menu.ResourceItem name="kb-entries" />
      <Menu.Item to="/knowledge-base/playground" primaryText="KB Playground" leftIcon={<SearchIcon />} />

      <MenuSectionLabel label="Agents" />
      <Menu.ResourceItem name="agents" />
      <Menu.ResourceItem name="agent-nodes" />
      <Menu.ResourceItem name="agent-sessions" />
      <Menu.ResourceItem name="agent-executions" />

      <MenuSectionLabel label="Chat" />
      <Menu.ResourceItem name="chat-sessions" />
      <Menu.ResourceItem name="chat-commands" />
      <Menu.ResourceItem name="chat-skills" />
      <Menu.ResourceItem name="chat-hooks" />
      <Menu.ResourceItem name="chat-mcp-connections" />
      <Menu.ResourceItem name="chat-feedback" />

      <MenuSectionLabel label="Workflow Agents" />
      <Menu.ResourceItem name="agent-workflows" />
      <Menu.ResourceItem name="agent-workflow-executions" />
      <Menu.ResourceItem name="agent-memory" />
      <Menu.ResourceItem name="mcp-server-definitions" />
      <Menu.Item to="/ai-playground" primaryText="AI Playground" leftIcon={<ScienceOutlinedIcon />} />

      <MenuSectionLabel label="Notifications" />
      <Menu.ResourceItem name="notification-channels" />
      <Menu.ResourceItem name="notification-conversations" />
      <Menu.ResourceItem name="notification-escalations" />
      <Menu.Item to="/notifications/usage" primaryText="Usage" leftIcon={<BarChartIcon />} />

      <MenuSectionLabel label="Files" />
      <Menu.Item to="/file-manager" primaryText="File Manager" leftIcon={<FolderIcon />} />
      <Menu.ResourceItem name="files" />

      <MenuSectionLabel label="Tenants" />
      <Menu.ResourceItem name="tenants" />
      <Menu.ResourceItem name="tenant-members" />
      <Menu.ResourceItem name="tenant-subscriptions" />

      <MenuSectionLabel label="Service Catalog" />
      <Menu.ResourceItem name="service-categories" />
      <Menu.ResourceItem name="services" />
      <Menu.ResourceItem name="providers" />
      <Menu.ResourceItem name="provider-services" />
      <Menu.ResourceItem name="billing-plans" />

      <MenuSectionLabel label="Flows" />
      <Menu.ResourceItem name="flows" />
      <Menu.ResourceItem name="flow-items" />
      <Menu.ResourceItem name="flow-reviews" />

      <MenuSectionLabel label="Forms" />
      <Menu.ResourceItem name="forms" />
      <Menu.ResourceItem name="form-submissions" />
      <Menu.ResourceItem name="form-components" />

      <MenuSectionLabel label="Portals" />
      <Menu.ResourceItem name="ui-flows" />
      <Menu.ResourceItem name="ui-flow-analytics" />

      <MenuSectionLabel label="Access Control" />
      <Menu.ResourceItem name="users" />
      <Menu.ResourceItem name="api-keys" />
      <Menu.ResourceItem name="roles" />
      <Menu.ResourceItem name="permissions" />
      <Menu.ResourceItem name="hierarchy-nodes" />
      <Menu.ResourceItem name="rls-policies" />
      <Menu.Item to="/api-permissions" primaryText="API Permissions" leftIcon={<ApiIcon />} />

      <MenuSectionLabel label="Platform" />
      <Menu.ResourceItem name="module-configs" />

      <MenuSectionLabel label="System" />
      <Menu.Item to="/modules" primaryText="Modules & Events" leftIcon={<SettingsIcon />} />
    </Menu>
  );
}
