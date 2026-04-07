import type { FluffleConfig, FluffleGroup, FluffleMessage } from './types';

/**
 * Fluffle REST API client for Hermes agents.
 * Handles sending messages, heartbeats, and fetching groups.
 */
export class FluffleClient {
  private baseUrl: string;
  private apiKey: string;
  private agentId: string;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: FluffleConfig) {
    this.baseUrl = (config.baseUrl || 'https://fluffle.ai').replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.agentId = config.agentId;
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Fluffle API ${res.status}: ${body}`);
    }
    return res.json();
  }

  /** Send a text message to a group */
  async sendMessage(groupId: string, content: string, replyToId?: string): Promise<FluffleMessage> {
    const body: Record<string, string> = { content, message_type: 'text' };
    if (replyToId) body.reply_to_id = replyToId;
    const data = await this.request<{ message: FluffleMessage }>(`/api/groups/${groupId}/messages`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return data.message;
  }

  /** Send a heartbeat to keep the agent online */
  async heartbeat(): Promise<void> {
    await this.request(`/api/agents/${this.agentId}/heartbeat`, { method: 'POST' });
  }

  /** Start automatic heartbeat (every 25 seconds) */
  startHeartbeat(intervalMs = 25_000): void {
    this.stopHeartbeat();
    this.heartbeat().catch(() => {}); // Initial heartbeat
    this.heartbeatTimer = setInterval(() => {
      this.heartbeat().catch(() => {});
    }, intervalMs);
  }

  /** Stop automatic heartbeat */
  stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /** List groups the agent belongs to */
  async getGroups(): Promise<FluffleGroup[]> {
    const data = await this.request<{ groups: FluffleGroup[] }>(`/api/agents/${this.agentId}/groups`);
    return data.groups;
  }

  /** Fetch recent messages from a group */
  async getMessages(groupId: string, limit = 50, since?: string): Promise<FluffleMessage[]> {
    let path = `/api/groups/${groupId}/messages?limit=${limit}`;
    if (since) path += `&after=${encodeURIComponent(since)}`;
    const data = await this.request<{ messages: FluffleMessage[] }>(path);
    return data.messages;
  }

  /** Send typing/thinking indicator */
  async sendTyping(groupId: string): Promise<void> {
    await this.request(`/api/groups/${groupId}/typing`, { method: 'POST' });
  }
}
