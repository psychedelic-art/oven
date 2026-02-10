'use client';

import { Admin, Resource, CustomRoutes, Layout, ListGuesser, EditGuesser, ShowGuesser } from 'react-admin';
import { Route } from 'react-router-dom';
import { dataProvider } from '@/providers/dataProvider';
import ModuleManager from './ModuleManager';
import CustomMenu from './CustomMenu';
import TileList from './tiles/TileList';
import TileEdit from './tiles/TileEdit';
import TileCreate from './tiles/TileCreate';
import TileShow from './tiles/TileShow';

const CustomLayout = (props: any) => <Layout {...props} menu={CustomMenu} />;

export default function AdminApp() {
  return (
    <Admin dataProvider={dataProvider} layout={CustomLayout}>
      {/* Maps Module Resources */}
      <Resource
        name="tiles"
        options={{ label: 'Tile Definitions' }}
        list={TileList}
        edit={TileEdit}
        create={TileCreate}
        show={TileShow}
      />
      <Resource
        name="world-configs"
        options={{ label: 'World Configs' }}
        list={ListGuesser}
        edit={EditGuesser}
        show={ShowGuesser}
      />
      <Resource
        name="maps"
        options={{ label: 'Maps' }}
        list={ListGuesser}
        edit={EditGuesser}
        show={ShowGuesser}
      />

      {/* Players Module Resources */}
      <Resource
        name="players"
        options={{ label: 'Players' }}
        list={ListGuesser}
        edit={EditGuesser}
        show={ShowGuesser}
      />
      <Resource
        name="sessions"
        options={{ label: 'Sessions' }}
        list={ListGuesser}
        show={ShowGuesser}
      />

      {/* Custom Pages */}
      <CustomRoutes>
        <Route path="/modules" element={<ModuleManager />} />
      </CustomRoutes>
    </Admin>
  );
}
