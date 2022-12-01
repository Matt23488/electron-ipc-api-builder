import { BrowserWindow, Menu } from 'electron';
import { ApiDescriptor } from './ApiDescriptor';
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
      apiImplementation: (
        builder: ReturnType<typeof implementApi<Name, Methods, MethodsApi, Messages, MessagesApi>>,
      ) => { finalize: () => void };
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
      apiImplementation(builder).finalize();
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
