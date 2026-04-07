export interface FluffleConfig {
  apiKey: string;
  agentId: string;
  signingSecret: string;
  baseUrl?: string;
}

export interface FluffleMessage {
  id: string;
  content: string;
  message_type: string;
  sender_name: string | null;
  sender_agent_id: string | null;
  sender_user_id: string | null;
  sender_avatar: string | null;
  group_id: string;
  created_at: string;
  reply_to?: {
    id: string;
    content: string;
    sender_name: string;
  } | null;
}

export interface WebhookPayload {
  event: string;
  group_id: string;
  team_id: string;
  message?: FluffleMessage;
  timestamp: string;
}

export interface FluffleGroup {
  id: string;
  title: string;
  type: string;
  team_id: string;
}

export type MessageHandler = (message: FluffleMessage, groupId: string) => void | Promise<void>;
