import Utils from '../Utils';

//#region Types
type WindowExtensionMethod<
  Methods extends string,
  MethodsApi extends Record<Methods, any[]>,
  Method extends Methods,
> = MethodsApi[Method] extends [infer Return, ...infer Parameters] ? (...args: Parameters) => Promise<Return> : never;

type WindowExtensionMethods<Methods extends string, MethodsApi extends Record<Methods, any[]>> = {
  [Method in Methods]: WindowExtensionMethod<Methods, MethodsApi, Method>;
};

type CallbackRegistration = {
  remove: () => void;
};

type MessageCallback<Messages extends string, MessagesApi extends Record<Messages, any[]>, Message extends Messages> = (
  _event: Electron.IpcRendererEvent,
  ...args: MessagesApi[Message]
) => void;
type RegisterFn<Messages extends string, MessagesApi extends Record<Messages, any[]>> = <Message extends Messages>(
  message: Message,
  callback: MessageCallback<Messages, MessagesApi, Message>,
) => CallbackRegistration;

type WindowExtensionMessages<Messages extends string, MessagesApi extends Record<Messages, any[]>> = {
  on: RegisterFn<Messages, MessagesApi>;
  once: RegisterFn<Messages, MessagesApi>;
};

type WindowExtension<
  Name extends string,
  Methods extends string,
  MethodsApi extends Record<Methods, any[]>,
  Messages extends string,
  MessagesApi extends Record<Messages, any[]>,
> = {
  [Key in Name]: (Utils.Types.Equals<Methods, never> extends true
    ? {}
    : { methods: WindowExtensionMethods<Methods, MethodsApi> }) &
    (Utils.Types.Equals<Messages, never> extends true
      ? {}
      : { messages: WindowExtensionMessages<Messages, MessagesApi> });
};

export type ApiDescriptor<
  Name extends string = any,
  Methods extends string = any,
  MethodsApi extends Record<Methods, any[]> = any,
  Messages extends string = any,
  MessagesApi extends Record<Messages, any[]> = any,
> = {
  name: Name;
  methods: Utils.Types.StringUnion<Methods>;
  messages: Utils.Types.StringUnion<Messages>;
  _windowExtension: WindowExtension<Name, Methods, MethodsApi, Messages, MessagesApi>;
};

export type ApiName<Descriptor extends ApiDescriptor> = Descriptor extends ApiDescriptor<infer Name> ? Name : never;
export type ApiMethods<Descriptor extends ApiDescriptor> = Descriptor extends ApiDescriptor<any, infer Methods>
  ? Methods
  : never;
export type ApiMethodSignatures<Descriptor extends ApiDescriptor> = Descriptor extends ApiDescriptor<
  any,
  any,
  infer MethodsApi
>
  ? MethodsApi
  : never;
export type ApiMessages<Descriptor extends ApiDescriptor> = Descriptor extends ApiDescriptor<
  any,
  any,
  any,
  infer Messages
>
  ? Messages
  : never;
export type ApiMessageSignatures<Descriptor extends ApiDescriptor> = Descriptor extends ApiDescriptor<
  any,
  any,
  any,
  any,
  infer MessagesApi
>
  ? MessagesApi
  : never;

type MethodSignatureBuilder<
  Methods extends string,
  MethodsApi extends Record<Methods, any[]>,
  Method extends string,
> = Method extends Methods
  ? never
  : {
      andSignature: <Return, Parameters extends any[] = []>() => MethodsBuilder<
        Methods | Method,
        MethodsApi & Record<Method, [_: Return, ...params: Parameters]>
      >;
    };

type MethodsBuilder<
  Methods extends string = never,
  MethodsApi extends Record<Methods, any[]> = Record<Methods, any[]>,
> = {
  withMethod: <Method extends string>(method: Method) => MethodSignatureBuilder<Methods, MethodsApi, Method>;
};

type DescribeMethodsCallback<Methods extends string, MethodsApi extends Record<Methods, any[]>> = (
  builder: MethodsBuilder,
) => MethodsBuilder<Methods, MethodsApi>;

type DescribeMethodsFn<Name extends string, Messages extends string, MessagesApi extends Record<Messages, any[]>> = <
  Methods extends string,
  MethodsApi extends Record<Methods, any[]>,
>(
  callback: DescribeMethodsCallback<Methods, MethodsApi>,
) => ApiBuilder<Name, Methods, MethodsApi, Messages, MessagesApi>;

type ApiBuilder_DescribeMethods<
  Name extends string,
  Methods extends string,
  Messages extends string,
  MessagesApi extends Record<Messages, any[]>,
> = Utils.Types.Equals<Methods, never> extends true
  ? { describeMethods: DescribeMethodsFn<Name, Messages, MessagesApi> }
  : {};

type MessageParametersBuilder<
  Messages extends string,
  MessagesApi extends Record<Messages, any[]>,
  Message extends string,
> = Message extends Messages
  ? {}
  : {
      andParameters: <Parameters extends any[] = []>() => MessagesBuilder<
        Messages | Message,
        MessagesApi & Record<Message, Parameters>
      >;
    };

type MessagesBuilder<
  Messages extends string = never,
  MessagesApi extends Record<Messages, any[]> = Record<Messages, any[]>,
> = {
  withMessage: <Message extends string>(message: Message) => MessageParametersBuilder<Messages, MessagesApi, Message>;
};

type DescribeMessagesCallback<Messages extends string, MessagesApi extends Record<Messages, any[]>> = (
  builder: MessagesBuilder,
) => MessagesBuilder<Messages, MessagesApi>;

type DescribeMessagesFn<Name extends string, Methods extends string, MethodsApi extends Record<Methods, any[]>> = <
  Messages extends string,
  MessagesApi extends Record<Messages, any[]>,
>(
  callback: DescribeMessagesCallback<Messages, MessagesApi>,
) => ApiBuilder<Name, Methods, MethodsApi, Messages, MessagesApi>;

type ApiBuilder_DescribeMessages<
  Name extends string,
  Methods extends string,
  MethodsApi extends Record<Methods, any[]>,
  Messages extends string,
> = Utils.Types.Equals<Messages, never> extends true
  ? { describeMessages: DescribeMessagesFn<Name, Methods, MethodsApi> }
  : {};

type ApiBuilder_GetDescriptor_Exposed<
  Name extends string,
  Methods extends string,
  MethodsApi extends Record<Methods, any[]>,
  Messages extends string,
  MessagesApi extends Record<Messages, any[]>,
> = {
  getDescriptor: () => ApiDescriptor<Name, Methods, MethodsApi, Messages, MessagesApi>;
};

type ApiBuilder_GetDescriptor<
  Name extends string,
  Methods extends string,
  MethodsApi extends Record<Methods, any[]>,
  Messages extends string,
  MessagesApi extends Record<Messages, any[]>,
> = Utils.Types.Equals<Methods, never> extends true
  ? Utils.Types.Equals<Messages, never> extends true
    ? {}
    : ApiBuilder_GetDescriptor_Exposed<Name, Methods, MethodsApi, Messages, MessagesApi>
  : ApiBuilder_GetDescriptor_Exposed<Name, Methods, MethodsApi, Messages, MessagesApi>;

type ApiBuilder<
  Name extends string = never,
  Methods extends string = never,
  MethodsApi extends Record<Methods, any[]> = Record<Methods, any[]>,
  Messages extends string = never,
  MessagesApi extends Record<Messages, any[]> = Record<Messages, any[]>,
> = ApiBuilder_DescribeMethods<Name, Methods, Messages, MessagesApi> &
  ApiBuilder_DescribeMessages<Name, Methods, MethodsApi, Messages> &
  ApiBuilder_GetDescriptor<Name, Methods, MethodsApi, Messages, MessagesApi>;
//#endregion

export const describeApi = <Name extends string>(name: Name) => {
  const methods: string[] = [];
  const describeMethods = (builderFn: (builder: any) => any) => {
    const withMethod = (method: string) => {
      methods.push(method);
      return methodsBuilder;
    };

    const andSignature = () => methodsBuilder;

    const methodsBuilder = {
      withMethod,
      andSignature,
    };

    builderFn(methodsBuilder);

    return apiBuilder;
  };

  const messages: string[] = [];
  const describeMessages = (builderFn: (builder: any) => any) => {
    const withMessage = (message: string) => {
      messages.push(message);
      return messagesBuilder;
    };

    const andParameters = () => messagesBuilder;

    const messagesBuilder = {
      withMessage,
      andParameters,
    };

    builderFn(messagesBuilder);

    return apiBuilder;
  };

  const getDescriptor = () => {
    return Object.freeze({
      name,
      methods: Utils.Types.makeStringUnion(...methods),
      messages: Utils.Types.makeStringUnion(...messages),
    });
  };

  const apiBuilder = {
    describeMethods,
    describeMessages,
    getDescriptor,
  };

  return apiBuilder as unknown as ApiBuilder<Name>;
};
