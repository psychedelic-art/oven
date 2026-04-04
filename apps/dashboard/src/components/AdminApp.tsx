'use client';

import { Admin, Resource, CustomRoutes, Layout } from 'react-admin';
import { Route } from 'react-router-dom';
import { dataProvider } from '@/providers/dataProvider';
import ModuleManager from './ModuleManager';
import MapEditorPage from './maps/MapEditorPage';
import WorkflowEditorPage from './workflows/WorkflowEditorPage';
import UiFlowEditorPage from './ui-flows/UiFlowEditorPage';
import RlsEditorPage from './rls-policies/RlsEditorPage';
import FormEditorPage from './forms/FormEditorPage';
import CustomMenu from './CustomMenu';

// Roles
import RoleList from './roles/RoleList';
import RoleCreate from './roles/RoleCreate';
import RoleEdit from './roles/RoleEdit';
import RoleShow from './roles/RoleShow';

// Permissions
import PermissionList from './permissions/PermissionList';
import PermissionCreate from './permissions/PermissionCreate';
import PermissionEdit from './permissions/PermissionEdit';

// Hierarchy Nodes
import HierarchyList from './hierarchy-nodes/HierarchyList';
import HierarchyCreate from './hierarchy-nodes/HierarchyCreate';
import HierarchyEdit from './hierarchy-nodes/HierarchyEdit';

// RLS Policies
import RlsPolicyList from './rls-policies/RlsPolicyList';
import RlsPolicyCreate from './rls-policies/RlsPolicyCreate';
import RlsPolicyEdit from './rls-policies/RlsPolicyEdit';
import RlsPolicyShow from './rls-policies/RlsPolicyShow';

// API Permissions
import ApiPermissionList from './api-permissions/ApiPermissionList';

// Tiles
import TileList from './tiles/TileList';
import TileEdit from './tiles/TileEdit';
import TileCreate from './tiles/TileCreate';
import TileShow from './tiles/TileShow';

// Tilesets
import TilesetList from './tilesets/TilesetList';
import TilesetCreate from './tilesets/TilesetCreate';
import TilesetEdit from './tilesets/TilesetEdit';
import TilesetShow from './tilesets/TilesetShow';

// World Configs
import WorldConfigList from './world-configs/WorldConfigList';
import WorldConfigCreate from './world-configs/WorldConfigCreate';
import WorldConfigEdit from './world-configs/WorldConfigEdit';
import WorldConfigShow from './world-configs/WorldConfigShow';

// Maps
import MapList from './maps/MapList';
import MapCreate from './maps/MapCreate';
import MapEdit from './maps/MapEdit';
import MapShow from './maps/MapShow';

// Players
import PlayerList from './players/PlayerList';
import PlayerCreate from './players/PlayerCreate';
import PlayerEdit from './players/PlayerEdit';
import PlayerShow from './players/PlayerShow';

// Sessions
import SessionList from './sessions/SessionList';
import SessionCreate from './sessions/SessionCreate';
import SessionEdit from './sessions/SessionEdit';
import SessionShow from './sessions/SessionShow';

// Map Assignments
import MapAssignmentList from './map-assignments/MapAssignmentList';
import MapAssignmentCreate from './map-assignments/MapAssignmentCreate';
import MapAssignmentEdit from './map-assignments/MapAssignmentEdit';
import MapAssignmentShow from './map-assignments/MapAssignmentShow';

// Player Positions (read-only)
import PositionList from './player-positions/PositionList';
import PositionShow from './player-positions/PositionShow';

// Workflows
import WorkflowList from './workflows/WorkflowList';
import WorkflowCreate from './workflows/WorkflowCreate';
import WorkflowEdit from './workflows/WorkflowEdit';
import WorkflowShow from './workflows/WorkflowShow';
import ExecutionList from './workflows/ExecutionList';
import ExecutionShow from './workflows/ExecutionShow';

// Module Configs
import ConfigList from './module-configs/ConfigList';
import ConfigCreate from './module-configs/ConfigCreate';
import ConfigEdit from './module-configs/ConfigEdit';

// Tenants
import TenantList from './tenants/TenantList';
import TenantCreate from './tenants/TenantCreate';
import TenantEdit from './tenants/TenantEdit';
import TenantShow from './tenants/TenantShow';

// Tenant Members
import TenantMemberList from './tenant-members/TenantMemberList';
import TenantMemberCreate from './tenant-members/TenantMemberCreate';

// Service Categories
import ServiceCategoryList from './service-categories/ServiceCategoryList';
import ServiceCategoryCreate from './service-categories/ServiceCategoryCreate';
import ServiceCategoryEdit from './service-categories/ServiceCategoryEdit';
import ServiceCategoryShow from './service-categories/ServiceCategoryShow';

// Services
import ServiceList from './services/ServiceList';
import ServiceCreate from './services/ServiceCreate';
import ServiceEdit from './services/ServiceEdit';
import ServiceShow from './services/ServiceShow';

// Providers
import ProviderList from './providers/ProviderList';
import ProviderCreate from './providers/ProviderCreate';
import ProviderEdit from './providers/ProviderEdit';
import ProviderShow from './providers/ProviderShow';

// Provider Services
import ProviderServiceList from './provider-services/ProviderServiceList';
import ProviderServiceCreate from './provider-services/ProviderServiceCreate';
import ProviderServiceEdit from './provider-services/ProviderServiceEdit';

// Billing Plans
import BillingPlanList from './billing-plans/BillingPlanList';
import BillingPlanCreate from './billing-plans/BillingPlanCreate';
import BillingPlanEdit from './billing-plans/BillingPlanEdit';
import BillingPlanShow from './billing-plans/BillingPlanShow';

// Plan Quotas
import PlanQuotaCreate from './plan-quotas/PlanQuotaCreate';
import PlanQuotaEdit from './plan-quotas/PlanQuotaEdit';

// Tenant Subscriptions
import TenantSubscriptionList from './tenant-subscriptions/TenantSubscriptionList';
import TenantSubscriptionCreate from './tenant-subscriptions/TenantSubscriptionCreate';
import TenantSubscriptionEdit from './tenant-subscriptions/TenantSubscriptionEdit';
import TenantSubscriptionShow from './tenant-subscriptions/TenantSubscriptionShow';

// Quota Overrides
import QuotaOverrideCreate from './quota-overrides/QuotaOverrideCreate';
import QuotaOverrideEdit from './quota-overrides/QuotaOverrideEdit';

// Auth
import UserList from './auth/UserList';
import UserCreate from './auth/UserCreate';
import UserEdit from './auth/UserEdit';
import UserShow from './auth/UserShow';
import ApiKeyList from './auth/ApiKeyList';
import ApiKeyCreate from './auth/ApiKeyCreate';
import ApiKeyShow from './auth/ApiKeyShow';
import LoginPage from './auth/LoginPage';
import ProfilePage from './auth/ProfilePage';

// Forms
import FormList from './forms/FormList';
import FormCreate from './forms/FormCreate';
import FormEdit from './forms/FormEdit';
import FormShow from './forms/FormShow';
import FormSubmissionList from './form-submissions/FormSubmissionList';
import FormSubmissionShow from './form-submissions/FormSubmissionShow';
import FormComponentList from './form-components/FormComponentList';
import FormComponentCreate from './form-components/FormComponentCreate';
import FormComponentEdit from './form-components/FormComponentEdit';

// Flows
import FlowList from './flows/FlowList';
import FlowCreate from './flows/FlowCreate';
import FlowEdit from './flows/FlowEdit';
import FlowShow from './flows/FlowShow';
import FlowItemList from './flow-items/FlowItemList';
import FlowItemCreate from './flow-items/FlowItemCreate';
import FlowItemShow from './flow-items/FlowItemShow';
import FlowReviewList from './flow-reviews/FlowReviewList';

// UI Flows
import UiFlowList from './ui-flows/UiFlowList';
import UiFlowCreate from './ui-flows/UiFlowCreate';
import UiFlowEdit from './ui-flows/UiFlowEdit';
import UiFlowShow from './ui-flows/UiFlowShow';
import UiFlowAnalyticsList from './ui-flow-analytics/UiFlowAnalyticsList';

// Files
import { FileList, FileShow, FileManager } from './files';

// AI
import {
  ProviderList as AIProviderList,
  ProviderCreate as AIProviderCreate,
  ProviderEdit as AIProviderEdit,
  ProviderShow as AIProviderShow,
  AliasList,
  AliasCreate,
  AliasEdit,
  VectorStoreList,
  VectorStoreCreate,
  VectorStoreEdit,
  VectorStoreShow,
  UsageLogList,
  BudgetList,
  BudgetCreate,
  BudgetEdit,
  BudgetAlertList,
  GuardrailList,
  GuardrailCreate,
  AIPlayground,
  AIUsageDashboard,
  AIToolCatalog,
  AIExtensions,
  PlaygroundExecutionList,
  PlaygroundExecutionShow,
} from './ai';

// Knowledge Base
import {
  KnowledgeBaseList,
  KnowledgeBaseCreate,
  KnowledgeBaseEdit,
  CategoryList as KBCategoryList,
  CategoryCreate as KBCategoryCreate,
  CategoryEdit as KBCategoryEdit,
  EntryList as KBEntryList,
  EntryCreate as KBEntryCreate,
  EntryEdit as KBEntryEdit,
  EntryShow as KBEntryShow,
  KBPlayground,
} from './knowledge-base';

// Icons
import GridViewIcon from '@mui/icons-material/GridView';
import TuneIcon from '@mui/icons-material/Tune';
import MapIcon from '@mui/icons-material/Map';
import PeopleIcon from '@mui/icons-material/People';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import PinDropIcon from '@mui/icons-material/PinDrop';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import TimelineIcon from '@mui/icons-material/Timeline';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ShieldIcon from '@mui/icons-material/Shield';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import SecurityIcon from '@mui/icons-material/Security';
import ApiIcon from '@mui/icons-material/Api';
import BusinessIcon from '@mui/icons-material/Business';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import CategoryIcon from '@mui/icons-material/Category';
import MiscellaneousServicesIcon from '@mui/icons-material/MiscellaneousServices';
import CloudIcon from '@mui/icons-material/Cloud';
import LinkIcon from '@mui/icons-material/Link';
import PaymentsIcon from '@mui/icons-material/Payments';
import CardMembershipIcon from '@mui/icons-material/CardMembership';
import PersonIcon from '@mui/icons-material/Person';
import KeyIcon from '@mui/icons-material/Key';
import DescriptionIcon from '@mui/icons-material/Description';
import SendIcon from '@mui/icons-material/Send';
import WidgetsIcon from '@mui/icons-material/Widgets';
import AltRouteIcon from '@mui/icons-material/AltRoute';
import AssignmentIcon from '@mui/icons-material/Assignment';
import RateReviewIcon from '@mui/icons-material/RateReview';
import WebIcon from '@mui/icons-material/Web';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import PsychologyIcon from '@mui/icons-material/Psychology';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import StorageIcon from '@mui/icons-material/Storage';
import BarChartIcon from '@mui/icons-material/BarChart';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import WarningIcon from '@mui/icons-material/Warning';
import GppGoodIcon from '@mui/icons-material/GppGood';
import HistoryIcon from '@mui/icons-material/History';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';

const CustomLayout = (props: any) => <Layout {...props} menu={CustomMenu} />;

export default function AdminApp() {
  return (
    <Admin dataProvider={dataProvider} layout={CustomLayout}>
      {/* Maps Module Resources */}
      <Resource
        name="tiles"
        options={{ label: 'Tile Definitions' }}
        icon={GridViewIcon}
        list={TileList}
        edit={TileEdit}
        create={TileCreate}
        show={TileShow}
      />
      <Resource
        name="tilesets"
        options={{ label: 'Tilesets' }}
        icon={ViewModuleIcon}
        list={TilesetList}
        edit={TilesetEdit}
        create={TilesetCreate}
        show={TilesetShow}
      />
      <Resource
        name="world-configs"
        options={{ label: 'World Configs' }}
        icon={TuneIcon}
        list={WorldConfigList}
        edit={WorldConfigEdit}
        create={WorldConfigCreate}
        show={WorldConfigShow}
      />
      <Resource
        name="maps"
        options={{ label: 'Maps' }}
        icon={MapIcon}
        list={MapList}
        edit={MapEdit}
        create={MapCreate}
        show={MapShow}
      />

      {/* Players Module Resources */}
      <Resource
        name="players"
        options={{ label: 'Players' }}
        icon={PeopleIcon}
        list={PlayerList}
        edit={PlayerEdit}
        create={PlayerCreate}
        show={PlayerShow}
      />

      {/* Sessions Module Resources */}
      <Resource
        name="sessions"
        options={{ label: 'Sessions' }}
        icon={PlayCircleIcon}
        list={SessionList}
        edit={SessionEdit}
        create={SessionCreate}
        show={SessionShow}
      />

      {/* Player Map Position Module Resources */}
      <Resource
        name="map-assignments"
        options={{ label: 'Map Assignments' }}
        icon={PinDropIcon}
        list={MapAssignmentList}
        edit={MapAssignmentEdit}
        create={MapAssignmentCreate}
        show={MapAssignmentShow}
      />
      <Resource
        name="player-positions"
        options={{ label: 'Player Positions' }}
        icon={GpsFixedIcon}
        list={PositionList}
        show={PositionShow}
      />

      {/* Workflow Module Resources */}
      <Resource
        name="workflows"
        options={{ label: 'Workflows' }}
        icon={AccountTreeIcon}
        list={WorkflowList}
        edit={WorkflowEdit}
        create={WorkflowCreate}
        show={WorkflowShow}
      />
      <Resource
        name="workflow-executions"
        options={{ label: 'Executions' }}
        icon={TimelineIcon}
        list={ExecutionList}
        show={ExecutionShow}
      />
      <Resource
        name="module-configs"
        options={{ label: 'Module Configs' }}
        icon={SettingsSuggestIcon}
        list={ConfigList}
        edit={ConfigEdit}
        create={ConfigCreate}
      />

      {/* Tenants Module Resources */}
      <Resource
        name="tenants"
        options={{ label: 'Tenants' }}
        icon={BusinessIcon}
        list={TenantList}
        edit={TenantEdit}
        create={TenantCreate}
        show={TenantShow}
      />
      <Resource
        name="tenant-members"
        options={{ label: 'Members' }}
        icon={GroupAddIcon}
        list={TenantMemberList}
        create={TenantMemberCreate}
      />

      {/* Service Catalog Resources */}
      <Resource
        name="service-categories"
        options={{ label: 'Categories' }}
        icon={CategoryIcon}
        list={ServiceCategoryList}
        edit={ServiceCategoryEdit}
        create={ServiceCategoryCreate}
        show={ServiceCategoryShow}
      />
      <Resource
        name="services"
        options={{ label: 'Services' }}
        icon={MiscellaneousServicesIcon}
        list={ServiceList}
        edit={ServiceEdit}
        create={ServiceCreate}
        show={ServiceShow}
      />
      <Resource
        name="providers"
        options={{ label: 'Providers' }}
        icon={CloudIcon}
        list={ProviderList}
        edit={ProviderEdit}
        create={ProviderCreate}
        show={ProviderShow}
      />
      <Resource
        name="provider-services"
        options={{ label: 'Provider Services' }}
        icon={LinkIcon}
        list={ProviderServiceList}
        edit={ProviderServiceEdit}
        create={ProviderServiceCreate}
      />

      {/* Billing & Subscriptions Resources */}
      <Resource
        name="billing-plans"
        options={{ label: 'Billing Plans' }}
        icon={PaymentsIcon}
        list={BillingPlanList}
        edit={BillingPlanEdit}
        create={BillingPlanCreate}
        show={BillingPlanShow}
      />
      <Resource
        name="plan-quotas"
        create={PlanQuotaCreate}
        edit={PlanQuotaEdit}
      />
      <Resource
        name="tenant-subscriptions"
        options={{ label: 'Subscriptions' }}
        icon={CardMembershipIcon}
        list={TenantSubscriptionList}
        edit={TenantSubscriptionEdit}
        create={TenantSubscriptionCreate}
        show={TenantSubscriptionShow}
      />
      <Resource
        name="quota-overrides"
        create={QuotaOverrideCreate}
        edit={QuotaOverrideEdit}
      />

      {/* Roles Module Resources */}
      <Resource
        name="roles"
        options={{ label: 'Roles' }}
        icon={ShieldIcon}
        list={RoleList}
        edit={RoleEdit}
        create={RoleCreate}
        show={RoleShow}
      />
      <Resource
        name="permissions"
        options={{ label: 'Permissions' }}
        icon={VpnKeyIcon}
        list={PermissionList}
        edit={PermissionEdit}
        create={PermissionCreate}
      />
      <Resource
        name="hierarchy-nodes"
        options={{ label: 'Hierarchy' }}
        icon={AccountTreeOutlinedIcon}
        list={HierarchyList}
        edit={HierarchyEdit}
        create={HierarchyCreate}
      />
      <Resource
        name="rls-policies"
        options={{ label: 'RLS Policies' }}
        icon={SecurityIcon}
        list={RlsPolicyList}
        edit={RlsPolicyEdit}
        create={RlsPolicyCreate}
        show={RlsPolicyShow}
      />
      <Resource
        name="role-permissions"
      />

      {/* Auth Module Resources */}
      <Resource
        name="users"
        options={{ label: 'Users' }}
        icon={PersonIcon}
        list={UserList}
        edit={UserEdit}
        create={UserCreate}
        show={UserShow}
      />
      <Resource
        name="api-keys"
        options={{ label: 'API Keys' }}
        icon={KeyIcon}
        list={ApiKeyList}
        create={ApiKeyCreate}
        show={ApiKeyShow}
      />

      {/* Forms Module Resources */}
      <Resource
        name="forms"
        options={{ label: 'Forms' }}
        icon={DescriptionIcon}
        list={FormList}
        edit={FormEdit}
        create={FormCreate}
        show={FormShow}
      />
      <Resource
        name="form-submissions"
        options={{ label: 'Submissions' }}
        icon={SendIcon}
        list={FormSubmissionList}
        show={FormSubmissionShow}
      />
      <Resource
        name="form-components"
        options={{ label: 'Components' }}
        icon={WidgetsIcon}
        list={FormComponentList}
        edit={FormComponentEdit}
        create={FormComponentCreate}
      />
      <Resource name="form-data-sources" />
      <Resource name="form-versions" />

      {/* Flows Module Resources */}
      <Resource
        name="flows"
        options={{ label: 'Flow Templates' }}
        icon={AltRouteIcon}
        list={FlowList}
        edit={FlowEdit}
        create={FlowCreate}
        show={FlowShow}
      />
      <Resource
        name="flow-items"
        options={{ label: 'Flow Items' }}
        icon={AssignmentIcon}
        list={FlowItemList}
        create={FlowItemCreate}
        show={FlowItemShow}
      />
      <Resource
        name="flow-reviews"
        options={{ label: 'Reviews' }}
        icon={RateReviewIcon}
        list={FlowReviewList}
      />
      <Resource name="flow-versions" />

      {/* UI Flows Module Resources */}
      <Resource
        name="ui-flows"
        options={{ label: 'UI Flows' }}
        icon={WebIcon}
        list={UiFlowList}
        edit={UiFlowEdit}
        create={UiFlowCreate}
        show={UiFlowShow}
      />
      <Resource
        name="ui-flow-analytics"
        options={{ label: 'Portal Analytics' }}
        icon={AnalyticsIcon}
        list={UiFlowAnalyticsList}
      />
      <Resource name="ui-flow-pages" />
      <Resource name="ui-flow-versions" />

      {/* AI Module Resources */}
      <Resource
        name="ai-providers"
        options={{ label: 'AI Providers' }}
        icon={PsychologyIcon}
        list={AIProviderList}
        edit={AIProviderEdit}
        create={AIProviderCreate}
        show={AIProviderShow}
      />
      <Resource
        name="ai-aliases"
        options={{ label: 'Model Aliases' }}
        icon={SmartToyIcon}
        list={AliasList}
        edit={AliasEdit}
        create={AliasCreate}
      />
      <Resource
        name="ai-vector-stores"
        options={{ label: 'Vector Stores' }}
        icon={StorageIcon}
        list={VectorStoreList}
        edit={VectorStoreEdit}
        create={VectorStoreCreate}
        show={VectorStoreShow}
      />
      <Resource
        name="ai-usage-logs"
        options={{ label: 'Usage Logs' }}
        icon={BarChartIcon}
        list={UsageLogList}
      />
      <Resource
        name="ai-budgets"
        options={{ label: 'Budgets' }}
        icon={MonetizationOnIcon}
        list={BudgetList}
        edit={BudgetEdit}
        create={BudgetCreate}
      />
      <Resource
        name="ai-budget-alerts"
        options={{ label: 'Budget Alerts' }}
        icon={WarningIcon}
        list={BudgetAlertList}
      />
      <Resource
        name="ai-guardrails"
        options={{ label: 'Guardrails' }}
        icon={GppGoodIcon}
        list={GuardrailList}
        create={GuardrailCreate}
      />
      <Resource
        name="ai-playground-executions"
        options={{ label: 'Playground History' }}
        icon={HistoryIcon}
        list={PlaygroundExecutionList}
        show={PlaygroundExecutionShow}
      />

      {/* Knowledge Base Module Resources */}
      <Resource
        name="kb-knowledge-bases"
        options={{ label: 'Knowledge Bases' }}
        icon={LibraryBooksIcon}
        list={KnowledgeBaseList}
        edit={KnowledgeBaseEdit}
        create={KnowledgeBaseCreate}
      />
      <Resource
        name="kb-categories"
        options={{ label: 'KB Categories' }}
        icon={LibraryBooksIcon}
        list={KBCategoryList}
        edit={KBCategoryEdit}
        create={KBCategoryCreate}
      />
      <Resource
        name="kb-entries"
        options={{ label: 'KB Entries' }}
        icon={QuestionAnswerIcon}
        list={KBEntryList}
        edit={KBEntryEdit}
        create={KBEntryCreate}
        show={KBEntryShow}
      />

      {/* Files Module Resources */}
      <Resource
        name="files"
        options={{ label: 'Files' }}
        icon={StorageIcon}
        list={FileList}
        show={FileShow}
      />

      {/* Custom Pages */}
      <CustomRoutes>
        <Route path="/modules" element={<ModuleManager />} />
        <Route path="/maps/:id/editor" element={<MapEditorPage />} />
        <Route path="/workflows/:id/editor" element={<WorkflowEditorPage />} />
        <Route path="/ui-flows/:id/editor" element={<UiFlowEditorPage />} />
        <Route path="/rls-policies/:id/editor" element={<RlsEditorPage />} />
        <Route path="/forms/:id/editor" element={<FormEditorPage />} />
        <Route path="/api-permissions" element={<ApiPermissionList />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/ai/playground" element={<AIPlayground />} />
        <Route path="/ai/usage-dashboard" element={<AIUsageDashboard />} />
        <Route path="/ai/tool-catalog" element={<AIToolCatalog />} />
        <Route path="/ai/extensions" element={<AIExtensions />} />
        <Route path="/knowledge-base/playground" element={<KBPlayground />} />
        <Route path="/file-manager" element={<FileManager />} />
      </CustomRoutes>
    </Admin>
  );
}
