import { createApi } from '@reduxjs/toolkit/query/react';

import { axiosBaseQuery } from '../services/httpService';
import {
  ROUTING_COMMAND_PATH,
  RoutingCommand,
  RoutingCommandResponse,
} from './routingCommands';
import {
  BulkSecretsRequest,
  BulkSecretsResponse,
  SECRETS_BULK_PATH,
  SECRETS_COMMAND_PATH,
  SECRETS_PATH,
  SECRETS_PROVIDERS_PATH,
  SECRETS_TEMPLATE_PATH,
  SecretCommandRequest,
  SecretCommandResponse,
  SecretsListResponse,
  SecretsProvidersResponse,
  SecretsTemplateResponse,
} from './secretsContract';

function getBaseApiPath(): string {
  return `/cws`;
}

const apiSlice = createApi({
  baseQuery: axiosBaseQuery({ baseUrl: getBaseApiPath() }),
  tagTypes: [
    'Version',
    'Device',
    'Type',
    'DeviceProperty',
    'DeviceMethod',
    'DeviceFeedback',
    'Config',
    'DebugSession',
    'DoNotLoadConfigOnNextBoot',
    'MinimumLogLevel',
    'MobileControlInfo',
    'Secrets',
  ],
  endpoints: (builder) => ({
    getPaths: builder.query<PathsReturn, { appId: string }>({
      query: ({ appId }) => ({
        url: `/${appId}/api/apiPaths`,
        method: 'GET',
      }),
    }),

    getVersions: builder.query<Version[], { appId: string }>({
      query: ({ appId }) => ({
        url: `/${appId}/api/versions`,
        method: 'GET',
      }),
      providesTags: ['Version'],
    }),

    getInitializationExceptions: builder.query<
      EssentialsExceptionReturn,
      { appId: string }
    >({
      query: ({ appId }) => ({
        url: `/${appId}/api/initializationExceptions`,
        method: 'GET',
      }),
    }),

    getDevices: builder.query<IKeyed[], { appId: string }>({
      query: ({ appId }) => ({
        url: `/${appId}/api/devices`,
        method: 'GET',
      }),
      providesTags: ['Device'],
    }),

    getTypes: builder.query<Type[], { appId: string }>({
      query: ({ appId }) => ({
        url: `/${appId}/api/types`,
        method: 'GET',
      }),
      providesTags: ['Type'],
    }),

    getDeviceProperties: builder.query<
      DeviceProperties[],
      { appId: string; key: string }
    >({
      query: ({ appId, key }) => ({
        url: `/${appId}/api/deviceProperties/${key}`,
        method: 'GET',
      }),
      providesTags: ['DeviceProperty'],
    }),

    getDeviceMethods: builder.query<
      DeviceMethods[],
      { appId: string; key: string }
    >({
      query: ({ appId, key }) => ({
        url: `/${appId}/api/deviceMethods/${key}`,
        method: 'GET',
      }),
    }),

    getDeviceFeedbacks: builder.query<
      DeviceFeedbacks,
      { appId: string; key: string }
    >({
      query: ({ appId, key }) => ({
        url: `/${appId}/api/deviceFeedbacks/${key}`,
        method: 'GET',
      }),
      providesTags: ['DeviceFeedback'],
    }),

    setDeviceJsonCommand: builder.mutation<
      void,
      {
        appId: string;
        deviceKey: string;
        methodName: string;
        params?: unknown[];
      }
    >({
      query: ({ appId, deviceKey, methodName, params }) => ({
        url: `/${appId}/api/deviceCommands/${deviceKey}`,
        method: 'POST',
        data: { deviceKey, methodName, params },
      }),
    }),

    getRoutingDevicesAndTieLines: builder.query<
      RoutingDevicesAndTieLines,
      { appId: string }
    >({
      query: ({ appId }) => ({
        url: `/${appId}/api/routingDevicesAndTieLines`,
        method: 'GET',
      }),
    }),

    // No invalidatesTags: getRoutingDevicesAndTieLines provides no tags, and the authoritative
    // result of a routing command arrives over the routing feedback WebSocket rather than by
    // refetching. See src/store/routingCommands.ts for the wire contract.
    sendRoutingCommand: builder.mutation<
      RoutingCommandResponse,
      { appId: string; command: RoutingCommand }
    >({
      query: ({ appId, command }) => ({
        url: `/${appId}/api/${ROUTING_COMMAND_PATH}`,
        method: 'POST',
        data: command,
      }),
    }),

    getConfig: builder.query<unknown, { appId: string }>({
      query: ({ appId }) => ({
        url: `/${appId}/api/config`,
        method: 'GET',
      }),
      providesTags: ['Config'],
    }),

    getMobileControlInfo: builder.query<
      MobileControlInfo,
      { appId: string; deviceKey: string }
    >({
      query: ({ appId, deviceKey }) => ({
        url: `/${appId}/api/device/${deviceKey}/info`,
        method: 'GET',
      }),
      providesTags: ['MobileControlInfo'],
    }),

    getMobileControlActionPaths: builder.query<
      MobileControlActionPaths,
      { appId: string; deviceKey: string }
    >({
      query: ({ appId, deviceKey }) => ({
        url: `/${appId}/api/device/${deviceKey}/actionPaths`,
        method: 'GET',
      }),
    }),

    getDebugSession: builder.mutation<DebugSession, { appId: string }>({
      query: ({ appId }) => ({
        url: `/${appId}/api/debugSession`,
        method: 'GET',
      }),
    }),

    getMinimumLogLevel: builder.query<
      { minimumLevel: LogEventLevel },
      { appId: string }
    >({
      query: ({ appId }) => ({
        url: `/${appId}/api/appdebug`,
        method: 'GET',
      }),
      providesTags: ['MinimumLogLevel'],
    }),

    setLoginCredentials: builder.mutation<
      void,
      { appId: string; username: string; password: string }
    >({
      query: ({ appId, username, password }) => ({
        url: `/${appId}/api/login`,
        method: 'POST',
        data: { username, password },
      }),
    }),

    setMinimumLogLevel: builder.mutation<
      void,
      { appId: string; minimumLevel: LogEventLevel }
    >({
      query: ({ appId, minimumLevel }) => ({
        url: `/${appId}/api/appdebug`,
        method: 'POST',
        data: { minimumLevel },
      }),
      invalidatesTags: ['MinimumLogLevel'],
    }),

    stopDebugSession: builder.mutation<void, { appId: string }>({
      query: ({ appId }) => ({
        url: `/${appId}/api/debugSession`,
        method: 'POST',
      }),
    }),

    getDoNotLoadConfigOnNextBoot: builder.query<
      { doNotLoadConfigOnNextBoot: boolean },
      { appId: string }
    >({
      query: ({ appId }) => ({
        url: `/${appId}/api/doNotLoadConfigOnNextBoot`,
        method: 'GET',
      }),
      providesTags: ['DoNotLoadConfigOnNextBoot'],
    }),

    setDoNotLoadConfigOnNextBoot: builder.mutation<
      void,
      { appId: string; doNotLoadConfigOnNextBoot: boolean }
    >({
      query: ({ appId, doNotLoadConfigOnNextBoot }) => ({
        url: `/${appId}/api/doNotLoadConfigOnNextBoot`,
        method: 'POST',
        data: { doNotLoadConfigOnNextBoot },
      }),
      invalidatesTags: ['DoNotLoadConfigOnNextBoot'],
    }),

    setRestart: builder.mutation<void, { appId: string }>({
      query: ({ appId }) => ({
        url: `/${appId}/api/restartProgram`,
        method: 'POST',
      }),
    }),

    setLoadConfig: builder.mutation<void, { appId: string }>({
      query: ({ appId }) => ({
        url: `/${appId}/api/loadConfig`,
        method: 'POST',
      }),
    }),

    createMobileControlUiClient: builder.mutation<
      ClientResponse,
      { appId: string; deviceKey: string; request: ClientRequest }
    >({
      query: ({ appId, deviceKey, request }) => ({
        url: `/${appId}/api/device/${deviceKey}/client`,
        method: 'POST',
        data: request,
      }),
      invalidatesTags: ['MobileControlInfo'],
    }),

    deleteMobileControlUiClient: builder.mutation<
      void,
      { appId: string; deviceKey: string; client: ClientResponse }
    >({
      query: ({ appId, deviceKey, client }) => ({
        url: `/${appId}/api/device/${deviceKey}/client`,
        method: 'DELETE',
        data: client,
      }),
      invalidatesTags: ['MobileControlInfo'],
    }),

    deleteAllMobileControlUiClients: builder.mutation<
      void,
      { appId: string; deviceKey: string }
    >({
      query: ({ appId, deviceKey }) => ({
        url: `/${appId}/api/device/${deviceKey}/deleteAllUiClients`,
        method: 'DELETE',
      }),
      invalidatesTags: ['MobileControlInfo'],
    }),

    // ─── Secrets ─────────────────────────────────────────────────────────────
    // No endpoint here ever returns a secret value; see src/store/secretsContract.ts.
    //
    // SECURITY: RTK Query retains a mutation's arguments under
    // state.api.mutations[requestId].originalArgs, which is visible in Redux DevTools. For
    // sendSecretCommand and applyBulkSecrets those arguments contain plaintext values, so every
    // call site must call the mutation's reset() once the request settles.

    getSecretProviders: builder.query<
      SecretsProvidersResponse,
      { appId: string }
    >({
      query: ({ appId }) => ({
        url: `/${appId}/api/${SECRETS_PROVIDERS_PATH}`,
        method: 'GET',
      }),
    }),

    getSecrets: builder.query<
      SecretsListResponse,
      { appId: string; provider: string }
    >({
      query: ({ appId, provider }) => ({
        url: `/${appId}/api/${SECRETS_PATH}`,
        method: 'GET',
        params: { provider },
      }),
      providesTags: ['Secrets'],
    }),

    sendSecretCommand: builder.mutation<
      SecretCommandResponse,
      { appId: string; request: SecretCommandRequest }
    >({
      query: ({ appId, request }) => ({
        url: `/${appId}/api/${SECRETS_COMMAND_PATH}`,
        method: 'POST',
        data: request,
      }),
      invalidatesTags: ['Secrets'],
    }),

    applyBulkSecrets: builder.mutation<
      BulkSecretsResponse,
      { appId: string; request: BulkSecretsRequest }
    >({
      query: ({ appId, request }) => ({
        url: `/${appId}/api/${SECRETS_BULK_PATH}`,
        method: 'POST',
        data: request,
      }),
      // A preview writes nothing, so re-fetching the list after one would be a wasted round trip
      // and would churn the table while the user is reading the preview.
      invalidatesTags: (_result, _error, arg) =>
        arg.request.mode === 'commit' ? ['Secrets'] : [],
    }),

    getSecretsTemplate: builder.query<
      SecretsTemplateResponse,
      { appId: string; provider: string }
    >({
      query: ({ appId, provider }) => ({
        url: `/${appId}/api/${SECRETS_TEMPLATE_PATH}`,
        method: 'GET',
        params: { provider },
      }),
      // No providesTags: the template is derived on demand for a download, so re-deriving it after
      // an unrelated mutation would be work nobody asked for.
    }),
  }),
});

export const {
  useGetPathsQuery,
  useGetVersionsQuery,
  useGetInitializationExceptionsQuery,
  useGetDevicesQuery,
  useGetTypesQuery,
  useGetDevicePropertiesQuery,
  useGetDeviceMethodsQuery,
  useGetDeviceFeedbacksQuery,
  useSetDeviceJsonCommandMutation,
  useGetConfigQuery,
  useGetMobileControlInfoQuery,
  useGetMobileControlActionPathsQuery,
  useGetDebugSessionMutation,
  useStopDebugSessionMutation,
  useGetDoNotLoadConfigOnNextBootQuery,
  useSetDoNotLoadConfigOnNextBootMutation,
  useSetRestartMutation,
  useSetLoadConfigMutation,
  useGetMinimumLogLevelQuery,
  useSetMinimumLogLevelMutation,
  useGetRoutingDevicesAndTieLinesQuery,
  useSendRoutingCommandMutation,
  useCreateMobileControlUiClientMutation,
  useDeleteMobileControlUiClientMutation,
  useDeleteAllMobileControlUiClientsMutation,
  useSetLoginCredentialsMutation,
  useGetSecretProvidersQuery,
  useGetSecretsQuery,
  useSendSecretCommandMutation,
  useApplyBulkSecretsMutation,
  useLazyGetSecretsTemplateQuery,
} = apiSlice;

export const oneSliceToRuleThemAll = {
  apiSlice,
  /** @deprecated */
  getBaseApiPath,
};

export interface PathsReturn {
  url: string;
  routes: Route[];
}

export interface Route {
  DataTokens: {
    Name: string;
  };
  Url: string;
  Name: string;
  RouteHandler: unknown;
}

export interface EssentialsExceptionReturn {
  Exceptions: EssentialsException[];
}

export interface EssentialsException extends EssentialsExceptionBase {
  InnerException?: EssentialsExceptionBase;
}

export interface EssentialsExceptionBase {
  Message: string;
  StackTrace: string;
  Type: string;
}

export interface Type {
  Type: string;
  Description: string;
  CType: string;
}

export interface Version {
  Name: string;
  Version: string;
}

export interface IKeyed {
  Key: string;
  Name: string;
}

export interface DeviceProperties {
  Name: string;
  Type: string;
  Value: string;
  CanRead: boolean;
  canWrite: boolean;
}

export interface DeviceMethods {
  Name: string;
  Params: MethodParam[];
}

export interface DeviceFeedbacks {
  BoolValues: Feedback[];
  IntValues: Feedback[];
  SerialValues: Feedback[];
}

interface Feedback {
  FeedbackKey: string;
  Value: string;
}

interface MethodParam {
  Name: string;
  Type: string;
}

interface DebugSession {
  url: string;
  fallbackUrl?: string;
}

export interface MobileControlClient {
  clientNumber: string;
  roomKey: string;
  touchpanelKey: string;
  url: string;
  token: string;
  clientStatus: unknown[];
}

export interface MobileControlDirectServer {
  userAppUrl: string;
  serverPort: number;
  tokensDefined: number;
  clientsConnected: number;
  clients: MobileControlClient[];
}

export interface MobileControlInfo {
  directServer: MobileControlDirectServer;
}

export interface MobileControlActionPaths {
  actionPaths: ActionPath[];
}

export interface ActionPath {
  messengerKey: string;
  path: string;
}

export interface ClientRequest {
  roomKey: string;
  grantCode: string;
  token: string;
}

export interface ClientResponse {
  error: string;
  token: string;
  path: string;
}

export interface RoutingPort {
  key: string;
  signalType: string;
  connectionType: string;
  isInternal: boolean;
}

export interface RoutingDevice {
  key: string;
  name: string;
  hasInputs: boolean;
  hasOutputs: boolean;
  hasInputsAndOutputs: boolean;
  inputPorts?: RoutingPort[];
  outputPorts?: RoutingPort[];
}

export interface TieLine {
  sourceDeviceKey: string;
  sourcePortKey: string;
  destinationDeviceKey: string;
  destinationPortKey: string;
  signalType: string;
  isInternal: boolean;
}

export interface RouteSwitchStepInfo {
  switchingDeviceKey: string;
  inputPortKey: string;
  outputPortKey: string;
}

export interface ActiveRouteInfo {
  sourceDeviceKey: string;
  destinationDeviceKey: string;
  destinationInputPortKey: string;
  steps: RouteSwitchStepInfo[];
}

export interface CurrentRouteGroupInfo {
  signalType: string;
  routes: ActiveRouteInfo[];
}

export interface SinkCurrentSourceInfo {
  deviceKey: string;
  inputPortKey: string;
  sourceDeviceKey: string;
  signalType: string;
}

export interface RoutingDevicesAndTieLines {
  devices: RoutingDevice[];
  tieLines: TieLine[];
  currentRoutes: CurrentRouteGroupInfo[];
  // Current source per sink device, read directly from each sink's own current-source
  // bookkeeping. Covers routes made via device-specific bulk APIs (e.g. dynamic multiview
  // layouts) that currentRoutes does not, since those never create a RouteDescriptor/TieLine.
  sinkCurrentSources: SinkCurrentSourceInfo[];
  // Current multiview canvas/tile layout for every device implementing
  // IRoutingSinkWithLayoutState, keyed by device key. Devices with no currently active layout
  // are omitted. Lets the UI render an initial layout mock-up without waiting on the routing
  // feedback WebSocket.
  multiviewLayouts?: Record<string, MultiviewLayoutState>;
}

// ─── Multiview layout/tile mock-up state ─────────────────────────────────────

/**
 * Describes a single tile/window within a MultiviewLayoutState. Geometry (x/y/width/height) is
 * expressed in pixels within the same coordinate space as the parent's canvasWidth/canvasHeight.
 */
export interface MultiviewTileState {
  tileNumber: number;
  tileSinkKey: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zOrder: number;
  sourceDeviceKey: string | null;
}

/**
 * Describes the current shape of a multiview canvas and every visible tile within it - a
 * product-agnostic, JSON-serializable snapshot of what is actually displayed on the monitor fed
 * by a multiview-capable decoder.
 */
export interface MultiviewLayoutState {
  canvasWidth: number;
  canvasHeight: number;
  tiles: MultiviewTileState[];
}

// ─── Live routing feedback (WebSocket) types ─────────────────────────────────

export interface MidpointRoute {
  inputPortKey: string;
  outputPortKey: string;
  signalType: string;
}

export interface SinkRoute {
  inputPortKey: string;
  // Null/empty when the route feeding this input has been cleared. The feedback slice removes such
  // entries rather than storing them, so a SinkRoute held in state always has a real source.
  sourceDeviceKey: string | null;
  signalType: string;
}

export interface RoutingSnapshotMessage {
  type: 'snapshot';
  midpointRoutes: Record<string, MidpointRoute[]>;
  // A device implementing IRoutingSinkWithLayouts (e.g. a multiview decoder) can have multiple
  // simultaneous tile routes reported under its one device key, so this is a list per device
  // rather than a single route.
  sinkRoutes: Record<string, SinkRoute[]>;
  // Current multiview canvas/tile layout for every device implementing
  // IRoutingSinkWithLayoutState, keyed by device key.
  layouts: Record<string, MultiviewLayoutState>;
}

export interface MidpointRouteChangedMessage {
  type: 'midpointRouteChanged';
  deviceKey: string;
  routes: MidpointRoute[];
}

export interface SinkInputChangedMessage {
  type: 'sinkInputChanged';
  deviceKey: string;
  inputPortKey: string;
  // Null/empty means the route feeding this input was cleared - the processor raises this from
  // ICurrentSources.CurrentSourcesChanged, since clearing a route never calls ExecuteSwitch on the
  // sink itself and so fires no InputChanged.
  sourceDeviceKey: string | null;
  signalType: string;
}

export interface LayoutChangedMessage {
  type: 'layoutChanged';
  deviceKey: string;
  layout: MultiviewLayoutState;
}

export type RoutingFeedbackMessage =
  | RoutingSnapshotMessage
  | MidpointRouteChangedMessage
  | SinkInputChangedMessage
  | LayoutChangedMessage;

export type LogEventLevel =
  'Verbose' | 'Debug' | 'Information' | 'Warning' | 'Error' | 'Fatal';
