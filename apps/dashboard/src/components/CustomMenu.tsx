'use client';

import { Menu } from 'react-admin';
import SettingsIcon from '@mui/icons-material/Settings';
import ApiIcon from '@mui/icons-material/Api';
import { Typography, Divider, Box } from '@mui/material';
import PsychologyIcon from '@mui/icons-material/Psychology';
import ScienceIcon from '@mui/icons-material/Science';
import BarChartIcon from '@mui/icons-material/BarChart';
import BuildIcon from '@mui/icons-material/Build';
import ExtensionIcon from '@mui/icons-material/Extension';
import FolderIcon from '@mui/icons-material/Folder';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import SearchIcon from '@mui/icons-material/Search';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import RouteIcon from '@mui/icons-material/Route';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';

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
          AI Services
        </Typography>
      </Box>
      <Menu.ResourceItem name="ai-providers" />
      <Menu.ResourceItem name="ai-aliases" />
      <Menu.ResourceItem name="ai-vector-stores" />
      <Menu.ResourceItem name="ai-usage-logs" />
      <Menu.ResourceItem name="ai-budgets" />
      <Menu.ResourceItem name="ai-guardrails" />
      <Menu.Item
        to="/ai/playground"
        primaryText="AI Playground"
        leftIcon={<ScienceIcon />}
      />
      <Menu.Item
        to="/ai/usage-dashboard"
        primaryText="Usage Dashboard"
        leftIcon={<BarChartIcon />}
      />
      <Menu.Item
        to="/ai/tool-catalog"
        primaryText="Tool Catalog"
        leftIcon={<BuildIcon />}
      />
      <Menu.Item
        to="/ai/extensions"
        primaryText="Extensions"
        leftIcon={<ExtensionIcon />}
      />
      <Menu.ResourceItem name="ai-playground-executions" />

      <Divider sx={{ my: 1 }} />
      <Box sx={{ px: 2, pb: 0.5 }}>
        <Typography variant="overline" color="text.secondary" sx={{ fontSize: 10 }}>
          Knowledge Base
        </Typography>
      </Box>
      <Menu.ResourceItem name="kb-knowledge-bases" />
      <Menu.ResourceItem name="kb-categories" />
      <Menu.ResourceItem name="kb-entries" />
      <Menu.Item
        to="/knowledge-base/playground"
        primaryText="KB Playground"
        leftIcon={<SearchIcon />}
      />

      <Divider sx={{ my: 1 }} />
      <Box sx={{ px: 2, pb: 0.5 }}>
        <Typography variant="overline" color="text.secondary" sx={{ fontSize: 10 }}>
          Agents
        </Typography>
      </Box>
      <Menu.ResourceItem name="agents" />
      <Menu.ResourceItem name="agent-nodes" />
      <Menu.ResourceItem name="agent-sessions" />
      <Menu.ResourceItem name="agent-executions" />

      <Divider sx={{ my: 1 }} />
      <Box sx={{ px: 2, pb: 0.5 }}>
        <Typography variant="overline" color="text.secondary" sx={{ fontSize: 10 }}>
          Chat
        </Typography>
      </Box>
      <Menu.ResourceItem name="chat-sessions" />
      <Menu.ResourceItem name="chat-commands" />
      <Menu.ResourceItem name="chat-skills" />
      <Menu.ResourceItem name="chat-hooks" />
      <Menu.ResourceItem name="chat-mcp-connections" />
      <Menu.ResourceItem name="chat-feedback" />

      <Divider sx={{ my: 1 }} />
      <Box sx={{ px: 2, pb: 0.5 }}>
        <Typography variant="overline" color="text.secondary" sx={{ fontSize: 10 }}>
          Workflow Agents
        </Typography>
      </Box>
      <Menu.ResourceItem name="agent-workflows" />
      <Menu.ResourceItem name="agent-workflow-executions" />
      <Menu.ResourceItem name="agent-memory" />
      <Menu.ResourceItem name="mcp-server-definitions" />
      <Menu.Item
        to="/ai-playground"
        primaryText="AI Playground"
        leftIcon={<ScienceOutlinedIcon />}
      />

      <Divider sx={{ my: 1 }} />
      <Box sx={{ px: 2, pb: 0.5 }}>
        <Typography variant="overline" color="text.secondary" sx={{ fontSize: 10 }}>
          Files
        </Typography>
      </Box>
      <Menu.Item to="/file-manager" primaryText="File Manager" leftIcon={<FolderIcon />} />
      <Menu.ResourceItem name="files" />

      <Divider sx={{ my: 1 }} />
      <Box sx={{ px: 2, pb: 0.5 }}>
        <Typography variant="overline" color="text.secondary" sx={{ fontSize: 10 }}>
          Tenants
        </Typography>
      </Box>
      <Menu.ResourceItem name="tenants" />
      <Menu.ResourceItem name="tenant-members" />
      <Menu.ResourceItem name="tenant-subscriptions" />

      <Divider sx={{ my: 1 }} />
      <Box sx={{ px: 2, pb: 0.5 }}>
        <Typography variant="overline" color="text.secondary" sx={{ fontSize: 10 }}>
          Service Catalog
        </Typography>
      </Box>
      <Menu.ResourceItem name="service-categories" />
      <Menu.ResourceItem name="services" />
      <Menu.ResourceItem name="providers" />
      <Menu.ResourceItem name="provider-services" />
      <Menu.ResourceItem name="billing-plans" />

      <Divider sx={{ my: 1 }} />
      <Box sx={{ px: 2, pb: 0.5 }}>
        <Typography variant="overline" color="text.secondary" sx={{ fontSize: 10 }}>
          Flows
        </Typography>
      </Box>
      <Menu.ResourceItem name="flows" />
      <Menu.ResourceItem name="flow-items" />
      <Menu.ResourceItem name="flow-reviews" />

      <Divider sx={{ my: 1 }} />
      <Box sx={{ px: 2, pb: 0.5 }}>
        <Typography variant="overline" color="text.secondary" sx={{ fontSize: 10 }}>
          Forms
        </Typography>
      </Box>
      <Menu.ResourceItem name="forms" />
      <Menu.ResourceItem name="form-submissions" />
      <Menu.ResourceItem name="form-components" />

      <Divider sx={{ my: 1 }} />
      <Box sx={{ px: 2, pb: 0.5 }}>
        <Typography variant="overline" color="text.secondary" sx={{ fontSize: 10 }}>
          Portals
        </Typography>
      </Box>
      <Menu.ResourceItem name="ui-flows" />
      <Menu.ResourceItem name="ui-flow-analytics" />

      <Divider sx={{ my: 1 }} />
      <Box sx={{ px: 2, pb: 0.5 }}>
        <Typography variant="overline" color="text.secondary" sx={{ fontSize: 10 }}>
          Access Control
        </Typography>
      </Box>
      <Menu.ResourceItem name="users" />
      <Menu.ResourceItem name="api-keys" />
      <Menu.ResourceItem name="roles" />
      <Menu.ResourceItem name="permissions" />
      <Menu.ResourceItem name="hierarchy-nodes" />
      <Menu.ResourceItem name="rls-policies" />
      <Menu.Item
        to="/api-permissions"
        primaryText="API Permissions"
        leftIcon={<ApiIcon />}
      />

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
