import { createApi } from "@reduxjs/toolkit/query/react";

import { axiosBaseQuery } from "../services/httpService";

function getAppIdFromPath(): string {
  const path = window.location.pathname;
  const pathParts = path.split("/");
  return pathParts[2];
}

function getBaseApiPath(): string {
  return `/cws`;
}

const apiSlice = createApi({
  baseQuery: axiosBaseQuery({ baseUrl: getBaseApiPath() }),
  tagTypes: [
    "Version",
    "Device",
    "Type",
    "DeviceProperty",
    "DeviceMethod",
    "DeviceFeedback",
    "Config",
    "DebugSession",
    "DoNotLoadConfigOnNextBoot",
    "MinimumLogLevel",
    "MobileControlInfo",
  ],
  endpoints: (builder) => ({
    getPaths: builder.query<PathsReturn, { appId: string }>({
      query: ({ appId }) => ({
        url: `/${appId}/api/apiPaths`,
        method: "GET",
      }),
    }),


    getVersions: builder.query<Version[], { appId: string }>({
      query: ({ appId }) => ({
        url: `/${appId}/api/versions`,
        method: "GET",
      }),
      providesTags: ["Version"],
    }),

    getInitializationExceptions: builder.query<
      EssentialsExceptionReturn,
      { appId: string }
    >({
      query: ({ appId }) => ({
        url: `/${appId}/api/initializationExceptions`,
        method: "GET",
      }),
    }),

    getDevices: builder.query<IKeyed[], { appId: string }>({
      query: ({ appId }) => ({
        url: `/${appId}/api/devices`,
        method: "GET",
      }),
      providesTags: ["Device"],
    }),

    getTypes: builder.query<Type[], { appId: string }>({
      query: ({ appId }) => ({
        url: `/${appId}/api/types`,
        method: "GET",
      }),
      providesTags: ["Type"],
    }),

    getDeviceProperties: builder.query<
      DeviceProperties[],
      { appId: string; key: string }
    >({
      query: ({ appId, key }) => ({
        url: `/${appId}/api/deviceProperties/${key}`,
        method: "GET",
      }),
      providesTags: ["DeviceProperty"],
    }),

    getDeviceMethods: builder.query<
      DeviceMethods[],
      { appId: string; key: string }
    >({
      query: ({ appId, key }) => ({
        url: `/${appId}/api/deviceMethods/${key}`,
        method: "GET",
      }),
    }),

    getDeviceFeedbacks: builder.query<
      DeviceFeedbacks,
      { appId: string; key: string }
    >({
      query: ({ appId, key }) => ({
        url: `/${appId}/api/deviceFeedbacks/${key}`,
        method: "GET",
      }),
      providesTags: ["DeviceFeedback"],
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
        method: "POST",
        data: { deviceKey, methodName, params },
      }),
    }),

    getRoutingDevicesAndTieLines: builder.query<
      RoutingDevicesAndTieLines,
      { appId: string }
    >({
      query: ({ appId }) => ({
        url: `/${appId}/api/routingDevicesAndTieLines`,
        method: "GET",
      }),
    }),

    getConfig: builder.query<any, { appId: string }>({
      query: ({ appId }) => ({
        url: `/${appId}/api/config`,
        method: "GET",
      }),
      providesTags: ["Config"],
    }),

    getMobileControlInfo: builder.query<
      MobileControlInfo,
      { appId: string; deviceKey: string }
    >({
      query: ({ appId, deviceKey }) => ({
        url: `/${appId}/api/device/${deviceKey}/info`,
        method: "GET",
      }),
      providesTags: ["MobileControlInfo"],
    }),

    getMobileControlActionPaths: builder.query<
      MobileControlActionPaths,
      { appId: string; deviceKey: string }
    >({
      query: ({ appId, deviceKey }) => ({
        url: `/${appId}/api/device/${deviceKey}/actionPaths`,
        method: "GET",
      }),
    }),

    getDebugSession: builder.mutation<DebugSession, { appId: string }>({
      query: ({ appId }) => ({
        url: `/${appId}/api/debugSession`,
        method: "GET",
      }),
    }),

    getMinimumLogLevel: builder.query<
      { minimumLevel: LogEventLevel },
      { appId: string }
    >({
      query: ({ appId }) => ({
        url: `/${appId}/api/appdebug`,
        method: "GET",
      }),
      providesTags: ["MinimumLogLevel"],
    }),

    setLoginCredentials: builder.mutation<
      void,
      { appId: string; username: string; password: string }
    >({
      query: ({ appId, username, password }) => ({
        url: `/${appId}/api/login`,
        method: "POST",
        data: { username, password },
      }),
    }),

    setMinimumLogLevel: builder.mutation<
      void,
      { appId: string; minimumLevel: LogEventLevel }
    >({
      query: ({ appId, minimumLevel }) => ({
        url: `/${appId}/api/appdebug`,
        method: "POST",
        data: { minimumLevel },
      }),
      invalidatesTags: ["MinimumLogLevel"],
    }),

    stopDebugSession: builder.mutation<void, { appId: string }>({
      query: ({ appId }) => ({
        url: `/${appId}/api/debugSession`,
        method: "POST",
      }),
    }),

    getDoNotLoadConfigOnNextBoot: builder.query<
      { doNotLoadConfigOnNextBoot: boolean },
      { appId: string }
    >({
      query: ({ appId }) => ({
        url: `/${appId}/api/doNotLoadConfigOnNextBoot`,
        method: "GET",
      }),
      providesTags: ["DoNotLoadConfigOnNextBoot"],
    }),

    setDoNotLoadConfigOnNextBoot: builder.mutation<
      void,
      { appId: string; doNotLoadConfigOnNextBoot: boolean }
    >({
      query: ({ appId, doNotLoadConfigOnNextBoot }) => ({
        url: `/${appId}/api/doNotLoadConfigOnNextBoot`,
        method: "POST",
        data: { doNotLoadConfigOnNextBoot },
      }),
      invalidatesTags: ["DoNotLoadConfigOnNextBoot"],
    }),

    setRestart: builder.mutation<void, { appId: string }>({
      query: ({ appId }) => ({
        url: `/${appId}/api/restartProgram`,
        method: "POST",
      }),
    }),

    setLoadConfig: builder.mutation<void, { appId: string }>({
      query: ({ appId }) => ({
        url: `/${appId}/api/loadConfig`,
        method: "POST",
      }),
    }),

    createMobileControlUiClient: builder.mutation<
      ClientResponse,
      { appId: string; deviceKey: string, request: ClientRequest }
    >({
      query: ({ appId, deviceKey, request }) => ({
        url: `/${appId}/api/device/${deviceKey}/client`,
        method: "POST",
        data: request,
      }),
      invalidatesTags: ["MobileControlInfo"],
    }),

    deleteMobileControlUiClient: builder.mutation<
      void,
      { appId: string; deviceKey: string; client: ClientResponse }
    >({
      query: ({ appId, deviceKey, client }) => ({
        url: `/${appId}/api/device/${deviceKey}/client`,
        method: "DELETE",
        data: client,
      }),
      invalidatesTags: ["MobileControlInfo"],
    }),

    deleteAllMobileControlUiClients: builder.mutation<
      void,
      { appId: string; deviceKey: string }
    >({
      query: ({ appId, deviceKey }) => ({
        url: `/${appId}/api/device/${deviceKey}/deleteAllUiClients`,
        method: "DELETE",
      }),
      invalidatesTags: ["MobileControlInfo"],
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
  useCreateMobileControlUiClientMutation,
  useDeleteMobileControlUiClientMutation,
  useDeleteAllMobileControlUiClientsMutation,
  useSetLoginCredentialsMutation,
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

export interface RoutingDevicesAndTieLines {
  devices: RoutingDevice[];
  tieLines: TieLine[];
}

export type LogEventLevel =
  | "Verbose"
  | "Debug"
  | "Information"
  | "Warning"
  | "Error"
  | "Fatal";
