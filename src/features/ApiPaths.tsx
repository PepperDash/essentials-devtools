import { skipToken } from '@reduxjs/toolkit/query';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import EmptyState from '../shared/components/EmptyState';
import { FilterSearchText } from '../shared/FilterSearchText';
import { SortableTh } from '../shared/SortableTh';
import { SortAccessors, useSort } from '../shared/sorting';
import useAppParams from '../shared/hooks/useAppParams';
import { Route, useGetPathsQuery } from '../store/apiSlice';
import ApiPathDetailDrawer from './ApiPathDetailDrawer';

/** Names ignore spacing and case when sorting, so "Get TieLines" and "GetTypes" interleave. */
const sortKey = (route: Route) => route.Name.replace(/\s+/g, '').toLowerCase();

/** The leading word of a name: "Get" for "Get TieLines" and "GetPaths". */
const leadingWord = (name: string) => /^[A-Z]?[a-z]+/.exec(name)?.[0] ?? name;

const OTHER = 'Other';

/**
 * Groups routes under their leading word, so the long list reads as sections (Get, Execute, ...).
 * A word shared by only one route doesn't earn a section of its own; those go under Other.
 */
function groupRoutes(routes: Route[], keepOrder = false) {
  const byWord = new Map<string, Route[]>();
  routes.forEach((r) => {
    const word = leadingWord(r.Name);
    byWord.set(word, [...(byWord.get(word) ?? []), r]);
  });

  const groups = new Map<string, Route[]>();
  byWord.forEach((members, word) => {
    const key = members.length > 1 ? word : OTHER;
    groups.set(key, [...(groups.get(key) ?? []), ...members]);
  });

  return [...groups.entries()]
    .map(([name, members]) => ({
      name,
      // A column the user has sorted by decides the order within a group; otherwise it's by name
      routes: keepOrder
        ? members
        : members.sort((a, b) => sortKey(a).localeCompare(sortKey(b))),
    }))
    .sort((a, b) =>
      a.name === OTHER
        ? 1
        : b.name === OTHER
          ? -1
          : a.name.localeCompare(b.name)
    );
}

type RouteColumn = 'name' | 'url';
const ROUTE_SORT: SortAccessors<Route, RouteColumn> = {
  name: (r) => r.Name,
  url: (r) => r.Url,
};

export const ApiPaths = () => {
  const { appId } = useAppParams();
  const { data: apiPathData, isLoading } = useGetPathsQuery(
    appId ? { appId } : skipToken
  );
  const [showDrawer, setShowDrawer] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<Route>();
  const [search, setSearch] = useState('');
  const selectedRowRef = useRef<HTMLTableRowElement>(null);

  const routes = useMemo(() => apiPathData?.routes ?? [], [apiPathData]);

  const visible = useMemo(() => {
    const terms = search.toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return routes;
    return routes.filter((r) => {
      const haystack = `${r.Name} ${r.Url}`.toLowerCase();
      return terms.every((t) => haystack.includes(t));
    });
  }, [routes, search]);

  const sorter = useSort(ROUTE_SORT);
  // Sorting orders the rows within each group; the groups stay in their own order
  const groups = useMemo(
    () => groupRoutes(sorter.apply(visible), sorter.sort !== null),
    [visible, sorter]
  );
  // The order the rows appear in, for stepping through them with the arrow keys
  const ordered = useMemo(() => groups.flatMap((g) => g.routes), [groups]);

  // With the detail drawer open, Up and Down step to the previous and next path
  useEffect(() => {
    if (!showDrawer) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      const target = e.target as HTMLElement;
      if (target.closest('input, textarea, select, [role="menu"]')) return;
      const index = selectedRoute ? ordered.indexOf(selectedRoute) : -1;
      const next = ordered[index + (e.key === 'ArrowDown' ? 1 : -1)];
      if (!next) return;
      e.preventDefault();
      setSelectedRoute(next);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showDrawer, ordered, selectedRoute]);

  useEffect(() => {
    selectedRowRef.current?.scrollIntoView({ block: 'nearest' });
  }, [selectedRoute]);

  if (isLoading) return <div>Loading...</div>;

  if (!apiPathData?.routes) return <div>No paths available</div>;

  function clickRow(route: Route) {
    setSelectedRoute(route);
    setShowDrawer(true);
  }

  function handleClose() {
    setShowDrawer(false);
    setSelectedRoute(undefined);
  }

  const filtered = visible.length !== routes.length;

  return (
    <div className="d-flex flex-column overflow-hidden h-100">
      <div className="d-flex align-items-baseline gap-2 mb-2">
        <h2 className="mb-0">Available API Paths</h2>
        <span className="console-count">
          {filtered
            ? `Showing ${visible.length} of ${routes.length}`
            : `${routes.length} paths`}
        </span>
      </div>
      <div className="mb-2">
        <FilterSearchText
          value={search}
          onChangeValue={setSearch}
          debounceMs={150}
          placeholder="Search name or URL"
        />
      </div>

      {/* With the drawer open the list narrows to make room, so the URLs stay in view */}
      <div
        className={`overflow-auto flex-grow-1${showDrawer ? ' api-list-with-drawer' : ''}`}
      >
        {visible.length === 0 ? (
          <EmptyState
            tone="neutral"
            title="No paths match your search."
            description="Try part of a name or a piece of the URL."
          />
        ) : (
          <table className="table table-hover api-paths-table">
            <thead>
              <tr>
                <SortableTh sorter={sorter} column="name" label="Name" />
                <SortableTh sorter={sorter} column="url" label="URL" />
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <Fragment key={group.name}>
                  <tr className="api-group-row">
                    <td colSpan={2}>
                      {group.name}
                      <span className="api-group-count">
                        {group.routes.length}
                      </span>
                    </td>
                  </tr>
                  {group.routes.map((path) => {
                    const selected = selectedRoute === path;
                    return (
                      <tr
                        key={path.Name}
                        ref={selected ? selectedRowRef : undefined}
                        onClick={() => clickRow(path)}
                        className={`cursor-pointer hover${selected ? ' row-selected' : ''}`}
                      >
                        <td className="text-break fw-medium">{path.Name}</td>
                        <td className="text-break api-url">{path.Url}</td>
                      </tr>
                    );
                  })}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ApiPathDetailDrawer
        show={showDrawer}
        route={selectedRoute}
        handleClose={handleClose}
        url={apiPathData.url}
      />
    </div>
  );
};
