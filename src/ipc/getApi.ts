import { ApiDescriptor } from './ApiDescriptor';

export const getApi = <
  Name extends string,
  Methods extends string,
  MethodsApi extends Record<Methods, unknown[]>,
  Messages extends string,
  MessagesApi extends Record<Messages, unknown[]>,
>(
  api: ApiDescriptor<Name, Methods, MethodsApi, Messages, MessagesApi>,
) => (window as typeof api._windowExtension)[api.name];
