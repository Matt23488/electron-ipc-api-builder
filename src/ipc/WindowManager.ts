import { BrowserWindow, Menu } from 'electron';
import {
  ApiDescriptor,
  ApiMessages,
  ApiMessageSignatures,
  ApiMethods,
  ApiMethodSignatures,
  ApiName,
  ApiWindowData,
  ApiWindowDataKeys,
} from './ApiDescriptor';
import { createMessageContext, createWindowDataContext, implementApi } from './ApiImplementer';
import Utils from '../Utils';

type BrowserWindowConstructorKeys = 'width' | 'height';

type GetMenuTemplateFn<
  Name extends string,
  Messages extends string,
  MessagesApi extends Record<Messages, any[]>,
  DataKeys extends string,
  Data extends Record<DataKeys, any>
> = Utils.Types.Equals<Name, never> extends true
  ? () => Array<Electron.MenuItemConstructorOptions | Electron.MenuItem>
  : (
      context: WindowContext<Name, Messages, MessagesApi, DataKeys, Data>,
    ) => Array<Electron.MenuItemConstructorOptions | Electron.MenuItem>;

export type ApiImplementationFn<
  Descriptor extends ApiDescriptor,
  _Name extends string = ApiName<Descriptor>,
  _Methods extends string = ApiMethods<Descriptor>,
  _MethodsApi extends Record<_Methods, any[]> = ApiMethodSignatures<Descriptor>,
  _Messages extends string = ApiMessages<Descriptor>,
  _MessagesApi extends Record<_Messages, any[]> = ApiMessageSignatures<Descriptor>,
  _DataKeys extends string = ApiWindowDataKeys<Descriptor>,
  _Data extends Record<_DataKeys, any> = ApiWindowData<Descriptor>
> = (
  builder: ReturnType<typeof implementApi<_Name, _Methods, _MethodsApi, _Messages, _MessagesApi, _DataKeys, _Data>>,
  context: WindowContext<_Name, _Messages, _MessagesApi, _DataKeys, _Data>,
) => {
  finalize: () => void;
};

type WindowContext<
  Name extends string,
  Messages extends string,
  MessagesApi extends Record<Messages, any[]>,
  DataKeys extends string,
  Data extends Record<DataKeys, any>
> = { window: Electron.BrowserWindow; }
  & (
    Utils.Types.Equals<Messages, string> extends true
    ? {}
    : { messages: ReturnType<typeof createMessageContext<Name, Messages, MessagesApi>>; }
  )
  & (
    Utils.Types.Equals<DataKeys, string> extends true
    ? {}
    : { data: ReturnType<typeof createWindowDataContext<Name, DataKeys, Data>>; }
  );
// > = {
//   window: Electron.BrowserWindow;
//   data: ReturnType<typeof createWindowDataContext<Name, DataKeys, Data>>,
//   messages: ReturnType<typeof createMessageContext<Name, Messages, MessagesApi>>
// };

type WindowApiProperties<
  Name extends string,
  Methods extends string,
  MethodsApi extends Record<Methods, any[]>,
  Messages extends string,
  MessagesApi extends Record<Messages, any[]>,
  DataKeys extends string,
  Data extends Record<DataKeys, any>
> = Utils.Types.Equals<Name, never> extends true
  ? {
      api?: never;
      apiImplementation?: never;
    }
  : {
      api: ApiDescriptor<Name, Methods, MethodsApi, Messages, MessagesApi, DataKeys, Data>;
      apiImplementation: ApiImplementationFn<ApiDescriptor<Name, Methods, MethodsApi, Messages, MessagesApi, DataKeys, Data>>;
    };

type CreateWindowProperties<
  Name extends string,
  Methods extends string,
  MethodsApi extends Record<Methods, any[]>,
  Messages extends string,
  MessagesApi extends Record<Messages, any[]>,
  DataKeys extends string,
  Data extends Record<DataKeys, any>
> = {
  entryPoint: string;
  preload: string;
  startMaximized?: boolean;
  getMenuTemplate?: GetMenuTemplateFn<Name, Messages, MessagesApi, DataKeys, Data>;
} & Pick<Electron.BrowserWindowConstructorOptions, BrowserWindowConstructorKeys> &
  WindowApiProperties<Name, Methods, MethodsApi, Messages, MessagesApi, DataKeys, Data>;

const dummyApiDescriptor = {
  name: '_dummy',
  methods: Utils.Types.makeStringUnion(),
  messages: Utils.Types.makeStringUnion(),
  dataKeys: Utils.Types.makeStringUnion()
} as ApiDescriptor;

export const describeWindow = <
  Name extends string = never,
  Methods extends string = never,
  MethodsApi extends Record<Methods, any[]> = never,
  Messages extends string = never,
  MessagesApi extends Record<Messages, any[]> = never,
  DataKeys extends string = never,
  Data extends Record<DataKeys, any> = never
>({
  entryPoint,
  preload,
  api,
  apiImplementation,
  startMaximized,
  height,
  width,
  getMenuTemplate,
}: CreateWindowProperties<Name, Methods, MethodsApi, Messages, MessagesApi, DataKeys, Data>) => {
  type CreateWindowParams = [modal: true, parent: Electron.BrowserWindow] | [modal: false];
  const createWindow = (...[modal, parent]: CreateWindowParams) => {
    const window = new BrowserWindow({
      height,
      width,
      modal,
      parent,
      webPreferences: {
        preload,
        nodeIntegration: true,
      },
    });

    if (startMaximized) window.maximize();

    const windowDataContext = createWindowDataContext(api || dummyApiDescriptor);
    const messageContext = createMessageContext(api || dummyApiDescriptor, window);

    const context = {
      window,
      data: windowDataContext,
      messages: messageContext
    } satisfies WindowContext<Name, Messages, MessagesApi, DataKeys, Data>;

    if (getMenuTemplate) {
      const menuTemplate = getMenuTemplate(context);
      const menu = Menu.buildFromTemplate(menuTemplate);
      window.setMenu(menu);
    }

    
    if (api && apiImplementation) {
      const builder = implementApi(api);

      apiImplementation(builder, context).finalize();
    }

    // TODO: More robust check. A url could end with .html and break this.
    if (entryPoint.endsWith('.html')) window.loadFile(entryPoint);
    else window.loadURL(entryPoint);

    if (process.env.NODE_ENV === 'development') window.webContents.openDevTools();

    return context;
  };

  const show = () => createWindow(false);

  const showModal = (parent: Electron.BrowserWindow) => createWindow(true, parent);

  return {
    show,
    showModal,
  };
};
