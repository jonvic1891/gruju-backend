// SMS Configuration types for backend
export interface ACSConnectionConfig {
  id?: number;
  name: string;
  connectionString: string;
  phoneNumber: string;
  endpoint: string;
  isActive: boolean;
  isDefault: boolean;
  environment: 'development' | 'staging' | 'production';
  created_at?: string;
  updated_at?: string;
}

export interface SMSTemplate {
  id: number;
  name: string;
  content: string;
  variables: string[];
  category: string;
  isActive: boolean;
  created_at: string;
  updated_at: string;
}

export interface SMSMessageLog {
  id: number;
  connectionConfigId: number;
  to: string;
  message: string;
  messageId?: string;
  status: 'sent' | 'failed' | 'pending';
  errorMessage?: string;
  sent_at: string;
}

export interface SMSConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  connectionTest?: {
    success: boolean;
    error?: string;
    responseTime?: number;
  };
}

export interface SendSMSRequest {
  to: string;
  message: string;
  configId?: number; // Optional: use specific config, otherwise use default
}

export interface SendSMSResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  deliveryStatus?: string;
}