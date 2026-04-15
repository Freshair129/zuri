/**
 * Shared LINE Messaging API Utilities
 */

/**
 * Sends a push message (text, flex, etc.) to a LINE user.
 * 
 * @param {string} token - Channel Access Token
 * @param {string} to - LINE User ID
 * @param {Array} messages - Array of LINE message objects
 */
export async function sendLinePush(token, to, messages) {
  if (!token) throw new Error('LINE_CHANNEL_ACCESS_TOKEN is missing')

  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ to, messages }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`LINE Push Failed: ${err}`)
  }
}

/**
 * Downloads binary content (image, video, etc.) from LINE servers.
 * 
 * @param {string} token - Channel Access Token
 * @param {string} messageId - LINE Message ID
 * @returns {Promise<Buffer>} binary content
 */
export async function getLineContent(token, messageId) {
  if (!token) throw new Error('LINE_CHANNEL_ACCESS_TOKEN is missing')

  const res = await fetch(`https://api.line.me/v2/bot/message/${messageId}/content`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`LINE Content Fetch Failed: ${err}`)
  }

  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

/**
 * Sends messages as a reply to a previous message.
 * 
 * @param {string} token - Channel Access Token
 * @param {string} replyToken - LINE Reply Token
 * @param {Array} messages - Array of LINE message objects
 */
export async function replyLineMessages(token, replyToken, messages) {
  if (!token) throw new Error('LINE_CHANNEL_ACCESS_TOKEN is missing')

  const res = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ replyToken, messages }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`LINE Reply Failed: ${err}`)
  }
}

/**
 * Sends a simple text reply.
 * @param {string} token 
 * @param {string} to 
 * @param {string} text 
 */
export async function sendLineText(token, to, text) {
  return sendLinePush(token, to, [{ type: 'text', text }])
}
