export interface SMSPayload {
  user: {
    id?: string;
    phone: string;
    email?: string;
    [key: string]: unknown;
  };
  sms: {
    otp: string;
    [key: string]: unknown;
  };
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  rawResponse?: unknown;
}

export interface SMSAdapter {
  name: string;
  send(to: string, otp: string): Promise<SendResult>;
}
