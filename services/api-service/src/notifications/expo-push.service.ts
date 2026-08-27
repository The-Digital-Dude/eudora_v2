import { Injectable, Logger } from '@nestjs/common';

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';
// Expo's documented per-request cap.
const CHUNK_SIZE = 100;

export interface ExpoPushMessage {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Sends via Expo's push service directly over HTTP — no `expo-server-sdk`
 * dependency, no FCM/APNs credentials of our own to manage. This is the
 * "use Expo's push service initially" MVP path from the mobile plan; a
 * self-hosted APNs/FCM setup would replace this service's internals only.
 */
@Injectable()
export class ExpoPushService {
  private readonly logger = new Logger(ExpoPushService.name);

  async sendToTokens(
    tokens: string[],
    message: ExpoPushMessage,
  ): Promise<void> {
    if (tokens.length === 0) return;

    for (let i = 0; i < tokens.length; i += CHUNK_SIZE) {
      const chunk = tokens.slice(i, i + CHUNK_SIZE);
      try {
        const res = await fetch(EXPO_PUSH_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(
            chunk.map((to) => ({
              to,
              title: message.title,
              body: message.body,
              data: message.data,
              sound: 'default',
            })),
          ),
        });
        if (!res.ok) {
          this.logger.warn(
            `Expo push request failed: ${res.status} ${await res.text()}`,
          );
        }
      } catch (err) {
        this.logger.warn(`Expo push request errored: ${err}`);
      }
    }
  }
}
