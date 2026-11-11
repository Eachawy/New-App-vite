import { type BaseQueryFn, createApi } from '@reduxjs/toolkit/query/react';
import type { Method } from 'axios';
import { isAxiosError } from 'axios';

import { type Gateway, getHttpClient } from 'app/core/http/http-client';

export interface ApiRequest {
  url: string;
  method?: Method;
  /** Request body. Encrypted automatically when the environment requires it. */
  data?: unknown;
  params?: Record<string, unknown>;
  /** Which gateway to call. Defaults to the main gateway (comgw). */
  gateway?: Gateway;
  /** Call without the session token (anonymous endpoints). */
  skipAuth?: boolean;
  /** Don't show the global toast / error page for this call; the page handles the error itself. */
  silent?: boolean;
}

export interface ApiError {
  /** HTTP status, or 0 when the server could not be reached. */
  status: number;
  data: unknown;
  message: string;
  silent?: boolean;
}

export const axiosBaseQuery: BaseQueryFn<ApiRequest, unknown, ApiError> = async ({
  url,
  method = 'GET',
  data,
  params,
  gateway,
  skipAuth,
  silent,
}) => {
  try {
    const response = await getHttpClient(gateway).request({ url, method, data, params, skipAuth });
    return { data: response.data };
  } catch (error) {
    if (isAxiosError(error)) {
      return { error: { status: error.response?.status ?? 0, data: error.response?.data, message: error.message, silent } };
    }
    return { error: { status: 0, data: undefined, message: String(error), silent } };
  }
};

/**
 * The single RTK Query API. Feature areas add their endpoints with `baseApi.injectEndpoints(...)`
 * in `features/<area>/api.ts`, which keeps each area's endpoints next to its pages.
 */
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: axiosBaseQuery,
  endpoints: () => ({}),
});
