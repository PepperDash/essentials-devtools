export interface LogMessage {
  Timestamp: string;
  MessageTemplate: string;
  RenderedMessage: String;
  Level: string;
  Properties?: {
    Key: string;
  };
}