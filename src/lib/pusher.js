import Pusher from 'pusher'

let pusher = null

export function getPusher() {
  if (!pusher) {
    pusher = new Pusher({
      appId: process.env.PUSHER_APP_ID,
      key: process.env.NEXT_PUBLIC_PUSHER_KEY,
      secret: process.env.PUSHER_APP_SECRET,
      cluster: process.env.PUSHER_APP_CLUSTER,
      useTLS: true,
    })
  }
  return pusher
}

/**
 * Trigger a Pusher event
 * @param {string} channel
 * @param {string} event
 * @param {object} data
 */
export async function triggerEvent(channel, event, data) {
  return getPusher().trigger(channel, event, data)
}
