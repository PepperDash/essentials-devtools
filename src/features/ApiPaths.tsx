import { skipToken } from '@reduxjs/toolkit/query';
import { useState } from 'react';
import useAppParams from '../shared/hooks/useAppParams';
import { Route, useGetPathsQuery } from '../store/apiSlice';
import ApiPathDetailDrawer from './ApiPathDetailDrawer';


export const ApiPaths = () => {
  const { appId } = useAppParams();
  const { data: apiPathData, isLoading } = useGetPathsQuery(appId ? { appId } : skipToken);
  const [showDrawer, setShowDrawer] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<Route>();

  if (isLoading) return <div>Loading...</div>;

  if (!apiPathData?.routes) return <div>No paths available</div>;

  const sorted = [...apiPathData.routes].sort((a, b) => a.Name.localeCompare(b.Name));

  function clickRow(route: Route) {
    setSelectedRoute(route);
    setShowDrawer(true);
  }

  function handleClose() {
    setShowDrawer(false);
    setSelectedRoute(undefined);
  }

  return (
    <div className="d-flex flex-column overflow-hidden h-100">
      <h2 className='mb-2'>Available API Paths</h2>
      <table className="table table-striped">
        <thead>
          <tr>
            <th>Name</th>
            <th>URL</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((path) => (
            <tr
              key={path.Name}
              onClick={() => clickRow(path)}
              className={'cursor-pointer hover' + (selectedRoute === path ? ' table-primary' : '')}
            >
              <td>{path.Name}</td>
              <td>{path.Url}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <ApiPathDetailDrawer
        show={showDrawer}
        route={selectedRoute}
        handleClose={handleClose}
        url={apiPathData.url}
      />
    </div>
  );
}