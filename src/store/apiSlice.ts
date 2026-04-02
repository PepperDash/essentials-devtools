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
  ],
  endpoints: (builder) => ({
    getVersions: builder.query<Version[], {appId: string}>({
      query: ({ appId }) => ({
        url: `/${appId}/api/versions`,
        method: "GET",
      }),
      providesTags: ["Version"],
    }),

    getDevices: builder.query<IKeyed[], {appId: string}>({
      query: ({ appId }) => ({
        url: `/${appId}/api/devices`,
        method: "GET",
      }),
      providesTags: ["Device"],
    }),

    getTypes: builder.query<Type[], {appId: string}>({
      query: ({ appId }) => ({
        url: `/${appId}/api/types`,
        method: "GET",
      }),
      providesTags: ["Type"],
    }),

    getDeviceProperties: builder.query<DeviceProperties[], {appId: string; key: string}>({
      query: ({ appId, key }) => ({
        url: `/${appId}/api/deviceProperties/${key}`,
        method: "GET",
      }),
      providesTags: ["DeviceProperty"],
    }),

    getDeviceMethods: builder.query<DeviceMethods[], {appId: string; key: string}>({
      query: ({ appId, key }) => ({
        url: `/${appId}/api/deviceMethods/${key}`,
        method: "GET",
      }),
    }),

    getDeviceFeedbacks: builder.query<DeviceFeedbacks, {appId: string; key: string}>({
      query: ({ appId, key }) => ({
        url: `/${appId}/api/deviceFeedbacks/${key}`,
        method: "GET",
      }),
      providesTags: ["DeviceFeedback"],
    }),

    setDeviceJsonCommand: builder.mutation<void, { appId: string; deviceKey: string; methodName: string; params?: unknown[] }>({
      query: ({ appId, deviceKey, methodName, params }) => ({
        url: `/${appId}/api/deviceCommands/${deviceKey}`,
        method: "POST",
        data: {deviceKey, methodName, params},
      }),
    }),

    getConfig: builder.query<any, void>({
      query: () => ({
        url: `/config`,
        method: "GET",
      }),
      providesTags: ["Config"],
    }),

    getDebugSession: builder.mutation<DebugSession, void>({
      query: () => ({
        url: `/debugSession`,
        method: "GET",
      }),
    }),

    getMinimumLogLevel: builder.query<{ minimumLevel: LogEventLevel }, void>({
      query: () => ({
        url: `/appdebug`,
        method: "GET",
      }),
      providesTags: ["MinimumLogLevel"],
    }),

    setMinimumLogLevel: builder.mutation<void, LogEventLevel>({
      query: (minimumLevel) => ({
        url: `/appdebug`,
        method: "POST",
        data: { minimumLevel },
      }),
      invalidatesTags: ["MinimumLogLevel"],
    }),

    stopDebugSession: builder.mutation<void, void>({
      query: () => ({
        url: `/debugSession`,
        method: "POST",
      }),
    }),

    getDoNotLoadConfigOnNextBoot: builder.query<
      { doNotLoadConfigOnNextBoot: boolean },
      void
    >({
      query: () => ({
        url: `/doNotLoadConfigOnNextBoot`,
        method: "GET",
      }),
      providesTags: ["DoNotLoadConfigOnNextBoot"],
    }),

    setDoNotLoadConfigOnNextBoot: builder.mutation<void, boolean>({
      query: (doNotLoadConfigOnNextBoot) => ({
        url: `/doNotLoadConfigOnNextBoot`,
        method: "POST",
        data: { doNotLoadConfigOnNextBoot },
      }),
      invalidatesTags: ["DoNotLoadConfigOnNextBoot"],
    }),

    setRestart: builder.mutation<void, void>({
      query: () => ({
        url: `/restartProgram`,
        method: "POST",
      }),
    }),

    setLoadConfig: builder.mutation<void, void>({
      query: () => ({
        url: `/loadConfig`,
        method: "POST",
      }),
    }),
  }),
});

export const {
  useGetVersionsQuery,
  useGetDevicesQuery,
  useGetTypesQuery,
  useGetDevicePropertiesQuery,
  useGetDeviceMethodsQuery,
  useGetDeviceFeedbacksQuery,
  useSetDeviceJsonCommandMutation,
  useGetConfigQuery,
  useGetDebugSessionMutation,
  useStopDebugSessionMutation,
  useGetDoNotLoadConfigOnNextBootQuery,
  useSetDoNotLoadConfigOnNextBootMutation,
  useSetRestartMutation,
  useSetLoadConfigMutation,
  useGetMinimumLogLevelQuery,
  useSetMinimumLogLevelMutation,
} = apiSlice;

export const oneSliceToRuleThemAll = {
  apiSlice,
  /** @deprecated */
  getBaseApiPath,
};

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

export type LogEventLevel =
  | "Verbose"
  | "Debug"
  | "Information"
  | "Warning"
  | "Error"
  | "Fatal";
