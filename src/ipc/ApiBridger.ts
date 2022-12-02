import { contextBridge, ipcRenderer } from 'electron';
import Utils from '../Utils';
import { ApiDescriptor } from './ApiDescriptor';
import { isLoggingEnabled } from './config';

type BridgeApiFn = <
  Name extends string,
  Methods extends string,
  MethodsApi extends Record<Methods, any[]>,
  Messages extends string,
  MessagesApi extends Record<Messages, any[]>,
  DataKeys extends string,
  Data extends Record<DataKeys, any>
>(
  api: ApiDescriptor<Name, Methods, MethodsApi, Messages, MessagesApi, DataKeys, Data>,
) => void;

type BroadDescriptor = {
  name: string;
  methods?: Utils.Types.StringUnion;
  messages?: Utils.Types.StringUnion;
  dataKeys?: Utils.Types.StringUnion;
};

type ExposedApi = {
  methods: Record<string, Utils.Types.AnyFn>;
  messages: {
    on: Utils.Types.AnyFn;
    once: Utils.Types.AnyFn;
  };
  windowData: {
    set: Utils.Types.AnyFn;
  };
};

export const bridgeApi: BridgeApiFn = (api: BroadDescriptor) => {
  const exposedApi = {} as ExposedApi;

  const loggingEnabled = isLoggingEnabled();

  if (api.methods) {
    exposedApi.methods = {};
    for (let method of api.methods.values)
      exposedApi.methods[method] = (...args: any[]) => {
        const channel = `${api.name}-${method}`;
        if (loggingEnabled)
          console.log(`Renderer invoked method on channel '${channel}'. Args:`, args.slice(1));
        ipcRenderer.invoke(channel, ...args);
      }
  }

  if (api.messages) {
    const getRegistrationFn = (onOrOnce: typeof ipcRenderer.on) => (message: string, callback: Utils.Types.AnyFn) => {
      const channel = `${api.name}-${message}`;
      onOrOnce(channel, callback);

      return {
        remove: () => ipcRenderer.off(channel, callback),
      };
    };

    exposedApi.messages = {
      on: getRegistrationFn(ipcRenderer.on.bind(ipcRenderer)),
      once: getRegistrationFn(ipcRenderer.once.bind(ipcRenderer)),
    };
  }

  if (api.dataKeys) {
    const set = (dataKey: string, value: any) => {
      const channel = `${api.name}-set-window-data-${dataKey}`;
      if (loggingEnabled)
        console.log(`Renderer setting window data on channel '${channel}'. Value:`, value);
      ipcRenderer.send(channel, value);
    }

    exposedApi.windowData = {
      set
    };
  }

  contextBridge.exposeInMainWorld(api.name, exposedApi);
};
