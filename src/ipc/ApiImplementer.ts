import { IpcMainInvokeEvent, app, ipcMain } from 'electron';
import Utils from '../Utils';
import { ApiDescriptor } from './ApiDescriptor';

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

type ApiImplementer<
  Methods extends string,
  MethodsApi extends Record<Methods, any[]>,
  Implemented extends string = never,
> = Utils.Types.Equals<keyof MethodsApi, Implemented> extends true
  ? {
      finalize: () => void;
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
    handlers[method] = handler;
    return ipcBuilder;
  };

  const finalize = () => {
    app.whenReady().then(() => {
      for (let method of api.methods.values) ipcMain.handle(`${api.name}-${method}`, handlers[method]);
    });
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

  messageContext.send = (message: string, ...args: any[]) => window.webContents.send(`${api.name}-${message}`, ...args);

  return messageContext;
};

export const createWindowDataContext = <
  Name extends string,
  DataKeys extends string,
  Data extends Record<DataKeys, any>
>(
  api: ApiDescriptor<Name, any, any, any, any, DataKeys, Data>
) => {
  const actualData = {} as Data;
  const exposedData = {} as Readonly<Data>;

  for (let dataKey of api.dataKeys.values) {
    ipcMain.on(`${api.name}-set-window-data-${dataKey}`, (_, value) => actualData[dataKey] = value);

    Object.defineProperty(exposedData, dataKey, {
      get: () => actualData[dataKey]
    });
  }

  return exposedData;
};