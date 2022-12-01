import { BrowserWindow, Menu } from 'electron';
import {
  ApiDescriptor,
  ApiMessages,
  ApiMessageSignatures,
  ApiMethods,
  ApiMethodSignatures,
  ApiName,
} from './ApiDescriptor';
import { createMessageContext, implementApi } from './ApiImplementer';
import Utils from '../Utils';

// TODO: hide windows on close, then I can just show them next time they call show().
// Modals might be an issue, not sure.

type BrowserWindowConstructorKeys = 'width' | 'height';

type GetMenuTemplateFn<
  Name extends string,
  Messages extends string,
  MessagesApi extends Record<Messages, any[]>,
> = Utils.Types.Equals<Name, never> extends true
  ? () => Array<Electron.MenuItemConstructorOptions | Electron.MenuItem>
  : (
      window: Electron.BrowserWindow,
      messageContext: ReturnType<typeof createMessageContext<Name, Messages, MessagesApi>>,
    ) => Array<Electron.MenuItemConstructorOptions | Electron.MenuItem>;

export type ApiImplementationFn<
  Descriptor extends ApiDescriptor,
  _Name extends string = ApiName<Descriptor>,
  _Methods extends string = ApiMethods<Descriptor>,
  _MethodsApi extends Record<_Methods, any[]> = ApiMethodSignatures<Descriptor>,
  _Messages extends string = ApiMessages<Descriptor>,
  _MessagesApi extends Record<_Messages, any[]> = ApiMessageSignatures<Descriptor>,
> = (
  window: Electron.BrowserWindow,
  builder: ReturnType<typeof implementApi<_Name, _Methods, _MethodsApi, _Messages, _MessagesApi>>,
) => {
  finalize: () => void;
};

type WindowApiProperties<
  Name extends string = never,
  Methods extends string = never,
  MethodsApi extends Record<Methods, any[]> = never,
  Messages extends string = never,
  MessagesApi extends Record<Messages, any[]> = never,
> = Utils.Types.Equals<Name, never> extends true
  ? {
      api?: never;
      apiImplementation?: never;
    }
  : {
      api: ApiDescriptor<Name, Methods, MethodsApi, Messages, MessagesApi>;
      apiImplementation: ApiImplementationFn<ApiDescriptor<Name, Methods, MethodsApi, Messages, MessagesApi>>;
    };

type CreateWindowProperties<
  Name extends string = never,
  Methods extends string = never,
  MethodsApi extends Record<Methods, any[]> = never,
  Messages extends string = never,
  MessagesApi extends Record<Messages, any[]> = never,
> = {
  entryPoint: string;
  preload: string;
  startMaximized?: boolean;
  getMenuTemplate?: GetMenuTemplateFn<Name, Messages, MessagesApi>;
} & Pick<Electron.BrowserWindowConstructorOptions, BrowserWindowConstructorKeys> &
  WindowApiProperties<Name, Methods, MethodsApi, Messages, MessagesApi>;

export const describeWindow = <
  Name extends string = never,
  Methods extends string = never,
  MethodsApi extends Record<Methods, any[]> = never,
  Messages extends string = never,
  MessagesApi extends Record<Messages, any[]> = never,
>({
  entryPoint,
  preload,
  api,
  apiImplementation,
  startMaximized,
  height,
  width,
  getMenuTemplate,
}: CreateWindowProperties<Name, Methods, MethodsApi, Messages, MessagesApi>) => {
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

    if (getMenuTemplate) {
      const messageContext = api && createMessageContext(api, window);
      const menuTemplate = getMenuTemplate(window, messageContext!);
      const menu = Menu.buildFromTemplate(menuTemplate);
      window.setMenu(menu);
    }

    if (api && apiImplementation) {
      const builder = implementApi(api);
      apiImplementation(window, builder).finalize();
    }

    // TODO: More robust check. A url could end with .html and break this.
    if (entryPoint.endsWith('.html')) window.loadFile(entryPoint);
    else window.loadURL(entryPoint);

    if (process.env.NODE_ENV === 'development') window.webContents.openDevTools();

    return window;
  };

  const show = () => createWindow(false);

  const showModal = (parent: Electron.BrowserWindow) => createWindow(true, parent);

  return {
    show,
    showModal,
  };
};
