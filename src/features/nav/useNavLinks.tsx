import { skipToken } from '@reduxjs/toolkit/query';
import { ReactNode, useMemo } from 'react';
import { Badge } from 'react-bootstrap';
import { meetsMinVersion } from '../../shared/functions/meetsMinimumVersion';
import useAppParams from '../../shared/hooks/useAppParams';
import {
  useGetPathsQuery,
  useGetPluginLoadIssuesQuery,
  useGetVersionsQuery,
} from '../../store/apiSlice';
import {
  badgeText,
  supportsPluginLoadIssuesApi,
} from '../../store/pluginLoadIssuesContract';
import { supportsSecretsApi } from '../../store/secretsContract';
import { NavIconName } from './NavIcon';

export type NavGroupName = 'Diagnostics' | 'Runtime' | 'Integrations';

export interface NavLinkItem {
  path: string;
  /** Plain text, for tooltips and accessible names where only the icon shows */
  title: string;
  /** The visible label, which can carry a badge */
  label: ReactNode;
  icon: NavIconName;
  group: NavGroupName;
}

const GROUP_ORDER: NavGroupName[] = ['Diagnostics', 'Runtime', 'Integrations'];

/**
 * The pages the current app offers, grouped for the side navigation. Some pages exist only where
 * the processor supports them, so this probes for them (RTK Query dedupes these with the pages'
 * own identical requests, so it costs nothing extra).
 */
export default function useNavLinks() {
  const params = useAppParams();

  const { data: currentVersions } = useGetVersionsQuery(
    params.appId ? { appId: params.appId } : { appId: '' },
    { skip: !params.appId }
  );

  // Detected from the processor's live route table rather than a version number, so the link
  // appears exactly where the endpoint exists.
  const { data: apiPaths } = useGetPathsQuery(
    params.appId ? { appId: params.appId } : skipToken
  );
  const showSecrets = useMemo(
    () => supportsSecretsApi(apiPaths?.routes),
    [apiPaths]
  );
  const showPluginLoadIssues = useMemo(
    () => supportsPluginLoadIssuesApi(apiPaths?.routes),
    [apiPaths]
  );

  // Drives the count badge
  const { data: pluginLoadIssues } = useGetPluginLoadIssuesQuery(
    params.appId && showPluginLoadIssues ? { appId: params.appId } : skipToken
  );

  const showInitializationExceptions = useMemo(() => {
    const essentialsVersion = currentVersions?.find(
      (v) => v.Name === 'PepperDashEssentials.dll'
    )?.Version;
    if (!essentialsVersion) return false;
    return meetsMinVersion(essentialsVersion, '3.0.0');
  }, [currentVersions]);

  const issueCount = pluginLoadIssues?.IssueCount ?? 0;
  const issueVariant = pluginLoadIssues?.ErrorCount ? 'danger' : 'warning';

  const links: NavLinkItem[] = [
    {
      path: 'versions',
      title: 'Versions',
      label: 'Versions',
      icon: 'versions',
      group: 'Diagnostics',
    },
    {
      path: 'apiPaths',
      title: 'API Paths',
      label: 'API Paths',
      icon: 'apiPaths',
      group: 'Diagnostics',
    },
    ...(showInitializationExceptions
      ? [
          {
            path: 'initializationExceptions',
            title: 'Initialization Exceptions',
            label: 'Initialization Exceptions',
            icon: 'exceptions' as const,
            group: 'Diagnostics' as const,
          },
        ]
      : []),
    ...(showPluginLoadIssues
      ? [
          {
            path: 'pluginLoadIssues',
            title: 'Plugin Issues',
            label: (
              <>
                Plugin Issues
                {issueCount > 0 && (
                  <Badge
                    pill
                    bg={issueVariant}
                    text={badgeText(issueVariant)}
                    className="ms-auto"
                    title={`${issueCount} plugin load issue(s)`}
                  >
                    {issueCount}
                  </Badge>
                )}
              </>
            ),
            icon: 'plugins' as const,
            group: 'Diagnostics' as const,
          },
        ]
      : []),
    {
      path: 'console',
      title: 'Debug Console',
      label: 'Debug Console',
      icon: 'console',
      group: 'Runtime',
    },
    {
      path: 'config',
      title: 'Config File',
      label: 'Config File',
      icon: 'config',
      group: 'Runtime',
    },
    {
      path: 'devices',
      title: 'Devices',
      label: 'Devices',
      icon: 'devices',
      group: 'Runtime',
    },
    {
      path: 'types',
      title: 'Types',
      label: 'Types',
      icon: 'types',
      group: 'Runtime',
    },
    {
      path: 'routing',
      title: 'Routing',
      label: 'Routing',
      icon: 'routing',
      group: 'Runtime',
    },
    {
      path: 'mobileControl',
      title: 'Mobile Control',
      label: 'Mobile Control',
      icon: 'mobileControl',
      group: 'Integrations',
    },
    ...(showSecrets
      ? [
          {
            path: 'secrets',
            title: 'Secrets',
            label: 'Secrets',
            icon: 'secrets' as const,
            group: 'Integrations' as const,
          },
        ]
      : []),
  ];

  const groups = GROUP_ORDER.map((name) => ({
    name,
    links: links.filter((l) => l.group === name),
  })).filter((g) => g.links.length > 0);

  return { appId: params.appId, groups, issueCount };
}
