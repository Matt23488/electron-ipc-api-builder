import { IpcMainInvokeEvent, app, ipcMain } from 'electron';
import Utils from '../Utils';
import { ApiDescriptor } from './ApiDescriptor';
import { isLoggingEnabled } from './config';
import { getMessageChannelName, getMethodChannelName, getWindowDataChannelName } from './getChannelName';

type ApiReturn<Signature extends any[]> = Signature extends [infer Return, ...any[]] ? Return : never;
type ApiParams<Signature extends any[]> = Signature extends [any, ...infer Params] ? Params : never;
type ApiFn<Signature extends any[]> = (...args: ApiParams<Signature>) => Promise<ApiReturn<Signature>>;

type ApiHandlers<Methods extends string, MethodsApi extends Record<Methods, any[]>> = {
  [Method in Methods]: ApiImplementerHandler<ApiFn<MethodsApi[Method]>>;
};

type ApiBuilderImplementFn<
  Methods extends string,
  MethodsApi extends Record<Methods, any[]>,
  Implemented extends string,
> = <Method extends Exclude<Methods, Implemented>>(
  method: Method,
  handler: ApiHandlers<Methods, MethodsApi>[Method],
) => ApiImplementer<Methods, MethodsApi, Implemented | Method>;

type ImplementedApi = {
  disconnect: () => void;
};

export type ApiImplementer<
  Methods extends string,
  MethodsApi extends Record<Methods, any[]>,
  Implemented extends string = never,
> = Utils.Types.Equals<Methods, Implemented> extends true
  ? {
      finalize: () => ImplementedApi;
    }
  : {
      implement: ApiBuilderImplementFn<Methods, MethodsApi, Implemented>;
    };

type ApiImplementerHandler<Fn extends Utils.Types.AnyFn> = Fn extends (...args: infer Args) => infer Return
  ? (event: IpcMainInvokeEvent, ...args: Args) => Return
  : never;

type ImplementApiFn = <
  Name extends string,
  Methods extends string,
  MethodsApi extends Record<Methods, any[]>,
  Messages extends string,
  MessagesApi extends Record<Messages, any[]>,
  DataKeys extends string,
  Data extends Record<DataKeys, any>
>(
  api: ApiDescriptor<Name, Methods, MethodsApi, Messages, MessagesApi, DataKeys, Data>,
) => ApiImplementer<Methods, MethodsApi>;

type BroadDescriptor = {
  name: string;
  methods: Utils.Types.StringUnion;
};

export const implementApi: ImplementApiFn = (api: BroadDescriptor) => {
  const handlers = {} as Record<string, Utils.Types.AnyFn>;

  const implement = (method: string, handler: Utils.Types.AnyFn) => {
    handlers[method] = (...args) => {
      if (isLoggingEnabled())
        console.log(`Main process received method call '${getMethodChannelName(api.name, method)}'. Args:`, args.slice(1));
      return handler(...args);
    }
    return ipcBuilder;
  };

  const finalize = () => {
    app.whenReady().then(() => {
      for (let method of api.methods.values)
        ipcMain.handle(getMethodChannelName(api.name, method), handlers[method]);
    });

    return {
      disconnect: () => {
        if (isLoggingEnabled())
          console.log(`disconnect() called for '${api.name}' Methods.`);

        for (let method of api.methods.values)
          ipcMain.removeHandler(getMethodChannelName(api.name, method));
      }
    };
  };

  const ipcBuilder = {
    implement,
    finalize,
  };

  return ipcBuilder;
};

export const createMessageContext = <
  Name extends string,
  Messages extends string,
  MessagesApi extends Record<Messages, any[]>,
>(
  api: ApiDescriptor<Name, any, any, Messages, MessagesApi>,
  window: Electron.BrowserWindow,
) => {
  //#region Types
  type MessageContext = {
    send: <Message extends Messages>(message: Message, ...args: MessagesApi[Message]) => void;
  };
  //#endregion

  const messageContext = {} as MessageContext;


  messageContext.send = (message: string, ...args: any[]) => {
    const channel = getMessageChannelName(api.name, message);
    if (isLoggingEnabled())
      console.log(`Main process sending message on channel '${channel}'`)
    window.webContents.send(channel, ...args);
  }

  return messageContext;
};

export const createWindowDataContext = <
  Name extends string,
  DataKeys extends string,
  Data extends Record<DataKeys, any>
>(
  api: ApiDescriptor<Name, any, any, any, any, DataKeys, Data>
) => {
  const backingData = {} as Data;
  const data = {} as Data;
  const handlers = {} as Record<DataKeys, Utils.Types.AnyFn>;

  for (let dataKey of api.dataKeys.values) {
    const channel = getWindowDataChannelName(api.name, dataKey);

    handlers[dataKey] = (_, value) => {
      if (isLoggingEnabled())
        console.log(`Main process received window data update on channel '${channel}'. Value:`, value);
        
      backingData[dataKey] = value;
    }

    ipcMain.on(channel, handlers[dataKey]);

    Object.defineProperty(data, dataKey, {
      get: () => backingData[dataKey],
      set: value => backingData[dataKey] = value
    });
  }

  const disconnect = () => {
    if (isLoggingEnabled())
      console.log(`disconnect() called for '${api.name}' WindowDataContext.`);
    
    for (let dataKey of api.dataKeys.values)
      ipcMain.off(getWindowDataChannelName(api.name, dataKey), handlers[dataKey]);
  }

  return {
    data,
    disconnect
  };
};