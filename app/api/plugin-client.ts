import React from "react";
import { FluxProxy } from "flux-proxy";
import { usePluginRuntime } from "../runtime/plugin-runtime";
import type { ListResult, PluginRecord } from "../types";

export function escapeFilterValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\"/g, '\\\"');
}

function withStableRequestKey(options: Record<string, any> = {}) {
  if (Object.prototype.hasOwnProperty.call(options, "requestKey")) {
    return options;
  }

  return {
    ...options,
    requestKey: null,
  };
}

export function usePluginApi() {
  const { targetOrigin } = usePluginRuntime();

  const list = React.useCallback(async <T extends PluginRecord>(collection: string, options: Record<string, any> = {}, page = 1, perPage = 20) => {
    const [data, error] = await FluxProxy.childClient.getData<ListResult<T>>(
      collection,
      withStableRequestKey(options),
      page,
      perPage,
      targetOrigin,
    );

    if (error) {
      throw error;
    }

    return data ?? {
      page,
      perPage,
      totalPages: 0,
      totalItems: 0,
      items: [],
    };
  }, [targetOrigin]);

  const getOne = React.useCallback(async <T extends PluginRecord>(collection: string, id: string, options: Record<string, any> = {}) => {
    const [data, error] = await FluxProxy.childClient.getData<T>(
      collection,
      withStableRequestKey({ ...options, id }),
      undefined,
      undefined,
      targetOrigin,
    );

    if (error) {
      throw error;
    }

    return data;
  }, [targetOrigin]);

  const create = React.useCallback(async <T extends PluginRecord>(collection: string, payload: Record<string, any>) => {
    const [data, error] = await FluxProxy.childClient.postData<T, Record<string, any>>(collection, { payload }, targetOrigin);

    if (error) {
      throw error;
    }

    return data;
  }, [targetOrigin]);

  const update = React.useCallback(async <T extends PluginRecord>(collection: string, id: string, payload: Record<string, any>) => {
    const [data, error] = await FluxProxy.childClient.postData<T, Record<string, any>>(collection, {
      operation: "update",
      id,
      payload,
    }, targetOrigin);

    if (error) {
      throw error;
    }

    return data;
  }, [targetOrigin]);

  return React.useMemo(() => ({
    list,
    getOne,
    create,
    update,
  }), [create, getOne, list, update]);
}
