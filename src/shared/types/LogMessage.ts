export interface LogMessage {
  Timestamp: string;
  MessageTemplate: string;
  RenderedMessage: string;
  Level: string;
  Properties?: {
    Key: string;
  };
}
