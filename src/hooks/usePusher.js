import { useEffect, useRef } from 'react'
import Pusher from 'pusher-js'

/**
 * Subscribes to a Pusher channel and binds event handlers.
 * Cleans up subscription on unmount or when channelName changes.
 *
 * Uses ref pattern for handlers — avoids reconnecting Pusher when handler identity
 * changes between renders while still calling the latest version of the callback.
 *
 * Supported events: 'new-message', 'customer-updated'
 *
 * @param {string} channelName - Pusher channel to subscribe to
 * @param {{ onNewMessage?: Function, onCustomerUpdated?: Function }} handlers
 */
export function usePusher(channelName, { onNewMessage, onCustomerUpdated } = {}) {
  // Keep latest handler refs — avoids stale closure without reconnecting on each render
  const onNewMessageRef     = useRef(onNewMessage)
  const onCustomerUpdatedRef = useRef(onCustomerUpdated)

  useEffect(() => { onNewMessageRef.current = onNewMessage },     [onNewMessage])
  useEffect(() => { onCustomerUpdatedRef.current = onCustomerUpdated }, [onCustomerUpdated])

  useEffect(() => {
    if (!channelName) return

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    })

    const channel = pusher.subscribe(channelName)

    // Delegate to ref so latest handler is always called without re-subscribing
    channel.bind('new-message',      (data) => onNewMessageRef.current?.(data))
    channel.bind('customer-updated', (data) => onCustomerUpdatedRef.current?.(data))

    return () => {
      channel.unbind_all()
      pusher.unsubscribe(channelName)
      pusher.disconnect()
    }
  }, [channelName])  // Only reconnect when channel changes
}
