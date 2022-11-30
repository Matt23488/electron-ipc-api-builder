import { ApiDescriptor } from './ApiDescriptor';

const getApi = <
  Name extends string,
  Methods extends string,
  MethodsApi extends Record<Methods, unknown[]>,
  Messages extends string,
  MessagesApi extends Record<Messages, unknown[]>,
>(
  api: ApiDescriptor<Name, Methods, MethodsApi, Messages, MessagesApi>,
) => (window as typeof api._windowExtension)[api.name]; // as typeof api._windowExtension[Name];

export default getApi;
