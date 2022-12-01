import { ApiDescriptor } from './ApiDescriptor';

export const getApi = <
  Name extends string,
  Methods extends string,
  MethodsApi extends Record<Methods, unknown[]>,
  Messages extends string,
  MessagesApi extends Record<Messages, unknown[]>,
  DataKeys extends string,
  Data extends Record<DataKeys, any>
>(
  api: ApiDescriptor<Name, Methods, MethodsApi, Messages, MessagesApi, DataKeys, Data>,
) => (window as typeof api._windowExtension)[api.name];
