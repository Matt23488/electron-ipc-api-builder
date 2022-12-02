export const getMethodChannelName = (apiName: string, methodName: string) => `${apiName}-method-${methodName}`;
export const getMessageChannelName = (apiName: string, messageName: string) => `${apiName}-message-${messageName}`;
export const getWindowDataChannelName = (apiName: string, dataKey: string) => `${apiName}-set-window-data-${dataKey}`;