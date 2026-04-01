import { createApi } from '@reduxjs/toolkit/query/react';

import { axiosBaseQuery } from '../services/httpService';

const env = process.env;
const programId = env.PROGRAM_ID || 'app02';
console.log("programId == ", programId);
const baseApiPath = `/cws/${programId}/api`;

const apiSlice = createApi({
  baseQuery: axiosBaseQuery({ baseUrl: baseApiPath }),
  tagTypes: ['Version', 'Device', 'Type', 'DeviceProperty', 'DeviceMethod', 'Config', 'DebugSession', 'DoNotLoadConfigOnNextBoot', 'MinimumLogLevel'],
  endpoints: (builder) => ({

    getVersions: builder.query<Version[], void>({
      query: () => ({
        url: `/versions`,
        method: 'GET',
      })
    }),

    getDevices: builder.query<IKeyed[], void>({
      query: () => ({
        url: `/devices`,
        method: 'GET',
      })
    }),

    getTypes: builder.query<Type[], void>({
      query: () => ({
        url: `/types`,
        method: 'GET',
      })
    }),

    getDeviceProperties: builder.query<DeviceProperties[], void>({
      query: (key) => ({
        url: `/deviceProperties/${key}`,
        method: 'GET',
      })
    }),

    getDeviceMethods: builder.query<DeviceMethods[], void>({
      query: (key) => ({
        url: `/deviceMethods/${key}`,
        method: 'GET',
      })
    }),

    getConfig: builder.query<any, void>({
      query: () => ({
        url: `/config`,
        method: 'GET',
      })
    }),

    getDebugSession: builder.mutation<DebugSession, void>({
      query: () => ({
        url: `/debugSession`,
        method: 'GET',
      })
    }),

    getMinimumLogLevel: builder.query<{minimumLevel: LogEventLevel}, void>({
      query: () => ({
        url: `/appdebug`,
        method: 'GET',
      }),
      providesTags: ['MinimumLogLevel'],
    }),

    setMinimumLogLevel: builder.mutation<void, LogEventLevel>({
      query: (minimumLevel) => ({
        url: `/appdebug`,
        method: 'POST',
        data: { minimumLevel },
      }),
      invalidatesTags: ['MinimumLogLevel'],
    }),

    stopDebugSession: builder.mutation<void, void>({
      query: () => ({
        url: `/debugSession`,
        method: 'POST',
      })
    }),

    getDoNotLoadConfigOnNextBoot: builder.query<{doNotLoadConfigOnNextBoot: boolean}, void>({
      query: () => ({
        url: `/doNotLoadConfigOnNextBoot`,
        method: 'GET',
      }),
      providesTags: ['DoNotLoadConfigOnNextBoot'],
    }),

    setDoNotLoadConfigOnNextBoot: builder.mutation<void, boolean>({
      query: (doNotLoadConfigOnNextBoot) => ({
        url: `/doNotLoadConfigOnNextBoot`,
        method: 'POST',
        data: { doNotLoadConfigOnNextBoot },
      }),
      invalidatesTags: ['DoNotLoadConfigOnNextBoot'],
    }),

    setRestart: builder.mutation<void, void>({
      query: () => ({
        url: `/restartProgram`,
        method: 'POST',
      })
    }),

    setLoadConfig: builder.mutation<void, void>({
      query: () => ({
        url: `/loadConfig`,
        method: 'POST',
      })
    }),
  }),
});

export const {
  useGetVersionsQuery,
  useGetDevicesQuery,
  useGetTypesQuery,
  useGetDevicePropertiesQuery,
  useGetDeviceMethodsQuery,
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
  baseApiPath,
  
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

interface MethodParam {
  Name: string;
  Type: string;
}

interface DebugSession {
  url: string;
}

export type LogEventLevel = 'Verbose' | 'Debug' | 'Information' | 'Warning' | 'Error' | 'Fatal';