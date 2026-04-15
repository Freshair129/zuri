# Technology Stack: External Integrations

| Integration | Token/Config | Webhook |
|---|---|---|
| **FB Messenger** | `FB_ACCESS_TOKEN` (System User) | `/api/webhooks/facebook` |
| **LINE OA** | `LINE_CHANNEL_ACCESS_TOKEN` | `/api/webhooks/line` |
| **Meta Ads API** | Same System User token | via `sync-hourly` worker |
| **Pusher** | `PUSHER_APP_ID` + secret | events: new-message, customer-updated |
| **Upstash Redis** | `UPSTASH_REDIS_REST_URL` | cache: 60s–5min TTL |
| **Upstash QStash** | `QSTASH_TOKEN` | retry >= 5, exponential backoff |
| **Gemini AI** | `GEMINI_API_KEY` | compose-reply, ask-AI, daily brief |

---

### Sync Rules
- UI reads from **DB only**. Never call external APIs directly from UI.
- QStash workers sync data every 1 hour.
- Webhooks must respond `< 200ms` (async via QStash).
