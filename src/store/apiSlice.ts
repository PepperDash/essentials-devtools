import { createApi } from '@reduxjs/toolkit/query/react';

import { axiosBaseQuery } from '../services/httpService';

const baseApiPath = '/cws/app01/api';

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

    getConfig: builder.query<any, void>({
      query: () => ({
        url: `/config`,
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
  useGetConfigQuery,
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