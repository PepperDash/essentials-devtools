import { BaseQueryFn } from '@reduxjs/toolkit/query';
import axios, { AxiosError, AxiosRequestConfig } from 'axios';

// axios.defaults.xsrfCookieName = 'csrftoken';
// axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN';
// axios.defaults.withCredentials = true;

export const httpClient = axios.create();

export const axiosBaseQuery =
  (
    {
      baseUrl,
      headers,
    }: { baseUrl: string; headers?: { [key: string]: string } } = {
      baseUrl: '',
    }
  ): BaseQueryFn<QueryArgs, unknown, unknown> =>
  async ({ url, method, data, params }: QueryArgs) => {
    try {
      const result = await httpClient({
        url: baseUrl + url,
        method,
        data,
        params,
        headers: headers,
      });

      return { data: result?.data };
    } catch (axiosError) {
      const error = axiosError as AxiosError;
      return {
        error: {
          status: error.response?.status,
          data: error.response?.data || error.message,
        },
      };
    }
  };

export type QueryArgs = {
  url: string;
  method: AxiosRequestConfig['method'];
  data?: AxiosRequestConfig['data'];
  params?: AxiosRequestConfig['params'];
};
