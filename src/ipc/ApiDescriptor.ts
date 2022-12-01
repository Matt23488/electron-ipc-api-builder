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

type WindowExtensionWindowData<DataKeys extends string, Data extends Record<DataKeys, any>> = {
  set: <DataKey extends DataKeys>(dataKey: DataKey, value: Data[DataKey]) => void;
};

type WindowExtension<
  Name extends string,
  Methods extends string,
  MethodsApi extends Record<Methods, any[]>,
  Messages extends string,
  MessagesApi extends Record<Messages, any[]>,
  DataKeys extends string,
  Data extends Record<DataKeys, any>
> = {
  [Key in Name]: (Utils.Types.Equals<Methods, string> extends true
    ? {}
    : { methods: WindowExtensionMethods<Methods, MethodsApi> }) &
    (Utils.Types.Equals<Messages, string> extends true
    ? {}
    : { messages: WindowExtensionMessages<Messages, MessagesApi> }) &
    (Utils.Types.Equals<DataKeys, string> extends true
    ? {}
    : { windowData: WindowExtensionWindowData<DataKeys, Data> });
};

export type ApiDescriptor<
  Name extends string = any,
  Methods extends string = any,
  MethodsApi extends Record<Methods, any[]> = any,
  Messages extends string = any,
  MessagesApi extends Record<Messages, any[]> = any,
  DataKeys extends string = any,
  Data extends Record<DataKeys, any> = any,
> = {
  name: Name;
  methods: Utils.Types.StringUnion<Methods>;
  messages: Utils.Types.StringUnion<Messages>;
  dataKeys: Utils.Types.StringUnion<DataKeys>;
  _windowExtension: WindowExtension<Name, Methods, MethodsApi, Messages, MessagesApi, DataKeys, Data>;
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

export type ApiWindowDataKeys<Descriptor extends ApiDescriptor> = Descriptor extends ApiDescriptor<
  any,
  any,
  any,
  any,
  any,
  infer DataKeys
>
  ? DataKeys
  : never;

export type ApiWindowData<Descriptor extends ApiDescriptor> = Descriptor extends ApiDescriptor<
  any,
  any,
  any,
  any,
  any,
  any,
  infer Data
>
  ? Data
  : never;

type MethodSignatureBuilder<
  Methods extends string,
  MethodsApi extends Record<Methods, any[]>,
  Method extends string,
  _AndSignatureFnFirst = <Return = void, Parameters extends any[] = []>() => MethodsBuilder<
    Method,
    Record<Method, [_: Return, ...params: Parameters]>
  >,
  _AndSignatureFnGeneral = <Return = void, Parameters extends any[] = []>() => MethodsBuilder<
    Methods | Method,
    MethodsApi & Record<Method, [_: Return, ...params: Parameters]>
  >,
> = Utils.Types.Equals<Methods, string> extends true
  ? {
      andSignature: _AndSignatureFnFirst;
    }
  : Method extends Methods
  ? never
  : {
      andSignature: _AndSignatureFnGeneral;
    };

type MethodsBuilder<
  Methods extends string = string,
  MethodsApi extends Record<Methods, any[]> = Record<Methods, any[]>,
> = {
  withMethod: <Method extends string>(method: Method) => MethodSignatureBuilder<Methods, MethodsApi, Method>;
};

type DescribeMethodsCallback<Methods extends string, MethodsApi extends Record<Methods, any[]>> = (
  builder: MethodsBuilder,
) => MethodsBuilder<Methods, MethodsApi>;

type DescribeMethodsFn<
  Name extends string,
  Messages extends string,
  MessagesApi extends Record<Messages, any[]>,
  DataKeys extends string,
  Data extends Record<DataKeys, any>
> = <
  Methods extends string,
  MethodsApi extends Record<Methods, any[]>,
>(
  callback: DescribeMethodsCallback<Methods, MethodsApi>,
) => ApiBuilder<Name, Methods, MethodsApi, Messages, MessagesApi, DataKeys, Data>;

type ApiBuilder_DescribeMethods<
  Name extends string,
  Messages extends string,
  MessagesApi extends Record<Messages, any[]>,
  DataKeys extends string,
  Data extends Record<DataKeys, any>,
  Methods extends string,
> = Utils.Types.Equals<Methods, string> extends true
  ? { describeMethods: DescribeMethodsFn<Name, Messages, MessagesApi, DataKeys, Data> }
  : {};

type MessageParametersBuilder<
  Messages extends string,
  MessagesApi extends Record<Messages, any[]>,
  Message extends string,
  _AndParametersFnFirst = <Parameters extends any[] = []>() => MessagesBuilder<Message, Record<Message, Parameters>>,
  _AndParametersFnGeneral = <Parameters extends any[] = []>() => MessagesBuilder<
    Messages | Message,
    MessagesApi & Record<Message, Parameters>
  >,
> = Utils.Types.Equals<Messages, string> extends true
  ? {
      andParameters: _AndParametersFnFirst;
    }
  : Message extends Messages
  ? never
  : {
      andParameters: _AndParametersFnGeneral;
    };

type MessagesBuilder<
  Messages extends string = string,
  MessagesApi extends Record<Messages, any[]> = Record<Messages, any[]>,
> = {
  withMessage: <Message extends string>(message: Message) => MessageParametersBuilder<Messages, MessagesApi, Message>;
};

type DescribeMessagesCallback<Messages extends string, MessagesApi extends Record<Messages, any[]>> = (
  builder: MessagesBuilder,
) => MessagesBuilder<Messages, MessagesApi>;

type DescribeMessagesFn<
  Name extends string,
  Methods extends string,
  MethodsApi extends Record<Methods, any[]>,
  DataKeys extends string,
  Data extends Record<DataKeys, any>
> = <
  Messages extends string,
  MessagesApi extends Record<Messages, any[]>,
>(
  callback: DescribeMessagesCallback<Messages, MessagesApi>,
) => ApiBuilder<Name, Methods, MethodsApi, Messages, MessagesApi, DataKeys, Data>;

type ApiBuilder_DescribeMessages<
  Name extends string,
  Methods extends string,
  MethodsApi extends Record<Methods, any[]>,
  DataKeys extends string,
  Data extends Record<DataKeys, any>,
  Messages extends string,
> = Utils.Types.Equals<Messages, string> extends true
  ? { describeMessages: DescribeMessagesFn<Name, Methods, MethodsApi, DataKeys, Data>; }
  : {};

type WindowDataTypeBuilder<
  DataKeys extends string,
  Data extends Record<DataKeys, any>,
  DataKey extends string,
  _AndTypeFnFirst = <T>() => WindowDataBuilder<DataKey, Record<DataKey, T>>,
  _AndTypeFnGeneral = <T>() => WindowDataBuilder<
    DataKeys | DataKey,
    Data & Record<DataKey, T>
  >,
> = Utils.Types.Equals<DataKeys, string> extends true
  ? {
      andType: _AndTypeFnFirst;
    }
  : DataKey extends DataKeys
    ? never
    : {
        andType: _AndTypeFnGeneral;
      };

type WindowDataBuilder<
  DataKeys extends string = string,
  Data extends Record<DataKeys, any> = Record<DataKeys, any>
> = {
  withKey: <DataKey extends string>(dataKey: DataKey) => WindowDataTypeBuilder<DataKeys, Data, DataKey>;
};

type DescribeWindowDataCallback<DataKeys extends string, Data extends Record<DataKeys, any>> = (
  builder: WindowDataBuilder
) => WindowDataBuilder<DataKeys, Data>;

type DescribeWindowDataFn<
  Name extends string,
  Methods extends string,
  MethodsApi extends Record<Methods, any[]>,
  Messages extends string,
  MessagesApi extends Record<Messages, any[]>,
> = <
  DataKeys extends string,
  Data extends Record<DataKeys, any>
>(
  callback: DescribeWindowDataCallback<DataKeys, Data>
) => ApiBuilder<Name, Methods, MethodsApi, Messages, MessagesApi, DataKeys, Data>;

type ApiBuilder_DescribeWindowData<
  Name extends string,
  Methods extends string,
  MethodsApi extends Record<Methods, any[]>,
  Messages extends string,
  MessagesApi extends Record<Messages, any[]>,
  DataKeys extends string,
> = Utils.Types.Equals<DataKeys, string> extends true
    ? { describeWindowData: DescribeWindowDataFn<Name, Methods, MethodsApi, Messages, MessagesApi>; }
    : {};

type ApiBuilder_GetDescriptor_Exposed<
  Name extends string,
  Methods extends string,
  MethodsApi extends Record<Methods, any[]>,
  Messages extends string,
  MessagesApi extends Record<Messages, any[]>,
  DataKeys extends string,
  Data extends Record<DataKeys, any>
> = {
  getDescriptor: () => ApiDescriptor<Name, Methods, MethodsApi, Messages, MessagesApi, DataKeys, Data>;
};

type ApiBuilder_GetDescriptor<
  Name extends string,
  Methods extends string,
  MethodsApi extends Record<Methods, any[]>,
  Messages extends string,
  MessagesApi extends Record<Messages, any[]>,
  DataKeys extends string,
  Data extends Record<DataKeys, any>
> = Utils.Types.IfAll<[
      Utils.Types.Equals<Methods, string>,
      Utils.Types.Equals<Messages, string>,
      Utils.Types.Equals<DataKeys, string>,
    ]> extends true
    ? {}
    : ApiBuilder_GetDescriptor_Exposed<Name, Methods, MethodsApi, Messages, MessagesApi, DataKeys, Data>;

type ApiBuilder<
  Name extends string = string,
  Methods extends string = string,
  MethodsApi extends Record<Methods, any[]> = Record<Methods, any[]>,
  Messages extends string = string,
  MessagesApi extends Record<Messages, any[]> = Record<Messages, any[]>,
  DataKeys extends string = string,
  Data extends Record<DataKeys, any> = Record<DataKeys, any>
> = ApiBuilder_DescribeMethods<Name, Messages, MessagesApi, DataKeys, Data, Methods> &
  ApiBuilder_DescribeMessages<Name, Methods, MethodsApi, DataKeys, Data, Messages> &
  ApiBuilder_DescribeWindowData<Name, Methods, MethodsApi, Messages, MessagesApi, DataKeys> &
  ApiBuilder_GetDescriptor<Name, Methods, MethodsApi, Messages, MessagesApi, DataKeys, Data>;
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

  const dataKeys: string[] = [];
  const describeWindowData = (builderFn: (builder: any) => any) => {
    const withKey = (dataKey: string) => {
      dataKeys.push(dataKey);
      return windowDataBuilder;
    };

    const andType = () => windowDataBuilder;

    const windowDataBuilder = {
      withKey,
      andType
    };

    builderFn(windowDataBuilder);

    return apiBuilder;
  };

  const getDescriptor = () => {
    return Object.freeze({
      name,
      methods: Utils.Types.makeStringUnion(...methods),
      messages: Utils.Types.makeStringUnion(...messages),
      dataKeys: Utils.Types.makeStringUnion(...dataKeys)
    });
  };

  const apiBuilder = {
    describeMethods,
    describeMessages,
    describeWindowData,
    getDescriptor,
  };

  return apiBuilder as unknown as ApiBuilder<Name>;
};
