import * as crypto from 'crypto';
import type { WebhookPayload, MessageHandler, FluffleConfig } from './types';

/**
 * Webhook handler for receiving Fluffle messages.
 * Verifies HMAC-SHA256 signatures and dispatches to message handlers.
 */
export class WebhookHandler {
  private signingSecret: string;
  private handlers: MessageHandler[] = [];

  constructor(config: FluffleConfig) {
    this.signingSecret = config.signingSecret;
  }

  /** Register a handler for incoming messages */
  onMessage(handler: MessageHandler): void {
    this.handlers.push(handler);
  }

  /** Verify the X-Fluffle-Signature header */
  verifySignature(rawBody: string | Buffer, signature: string): boolean {
    const expected = crypto
      .createHmac('sha256', this.signingSecret)
      .update(rawBody)
      .digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(signature, 'hex')
    );
  }

  /**
   * Process an incoming webhook request.
   * Call this from your HTTP server's route handler.
   *
   * @param rawBody - The raw request body (string or Buffer)
   * @param signature - The X-Fluffle-Signature header value
   * @returns { ok: true } on success, or { ok: false, error: string } on failure
   */
  async handleRequest(
    rawBody: string | Buffer,
    signature: string
  ): Promise<{ ok: boolean; error?: string }> {
    // Verify signature
    if (!signature || !this.verifySignature(rawBody, signature)) {
      return { ok: false, error: 'invalid signature' };
    }

    const payload: WebhookPayload = JSON.parse(
      typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8')
    );

    // Handle test ping
    if (payload.event === 'test.ping') {
      return { ok: true };
    }

    // Dispatch message events
    if (payload.event === 'message.new' && payload.message) {
      for (const handler of this.handlers) {
        try {
          await handler(payload.message, payload.group_id);
        } catch (err) {
          console.error('[fluffle-hermes] handler error:', err);
        }
      }
    }

    return { ok: true };
  }
}
