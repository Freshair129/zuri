// Created At: 2026-04-14T14:00:00+07:00
// Part of ZRI-IMP-0101 (Inbox Implementation)

/**
 * Sends a message (text or attachment) to a Facebook user via the Graph API.
 * 
 * @param {string} token - Page Access Token
 * @param {string} to - PSID (Recipient ID)
 * @param {object} message - Message object { text: string } or { attachment: object }
 */
export async function sendFacebookMessage(token, to, message) {
  if (!token) throw new Error('FACEBOOK_PAGE_ACCESS_TOKEN is missing')

  const res = await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${token}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      recipient: { id: to },
      message: message,
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Facebook Send Failed: ${err.error?.message || JSON.stringify(err)}`)
  }

  return res.json()
}

/**
 * Specialized text sender
 */
export async function sendFacebookText(token, to, text) {
  return sendFacebookMessage(token, to, { text })
}
