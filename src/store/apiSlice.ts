import { createApi } from '@reduxjs/toolkit/query/react';

import { axiosBaseQuery } from '../services/httpService';

const baseApiPath = 'https://192.168.1.164/cws/app01/api';

const apiSlice = createApi({
  baseQuery: axiosBaseQuery({ baseUrl: baseApiPath }),
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


  }),
});

export const {
  useGetVersionsQuery,
  useGetDevicesQuery,
  useGetTypesQuery,
  useGetDevicePropertiesQuery,
  useGetDeviceMethodsQuery,
} = apiSlice;


export const oneSliceToRuleThemAll = {
  apiSlice,
  /** @deprecated */
  baseApiPath,
  
};


export interface Type {
  type: string;
  description: string;
  cType: string;
}

export interface Version {
  name: string;
  version: string;
}

export interface IKeyed {
  key: string;
  name: string;
}

export interface DeviceProperties {
  name: string;
  type: string;
  value: string;
  canRead: boolean;
  canWrite: boolean;
}

export interface DeviceMethods {
  name: string;
  params: MethodParam[];
}

interface MethodParam {
  name: string;
  type: string;
}