'use client';

import { Admin, Resource, CustomRoutes, Layout } from 'react-admin';
import { Route } from 'react-router-dom';
import { dataProvider } from '@/providers/dataProvider';
import ModuleManager from './ModuleManager';
import MapEditorPage from './maps/MapEditorPage';
import WorkflowEditorPage from './workflows/WorkflowEditorPage';
import CustomMenu from './CustomMenu';

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

      {/* Custom Pages */}
      <CustomRoutes>
        <Route path="/modules" element={<ModuleManager />} />
        <Route path="/maps/:id/editor" element={<MapEditorPage />} />
        <Route path="/workflows/:id/editor" element={<WorkflowEditorPage />} />
      </CustomRoutes>
    </Admin>
  );
}
