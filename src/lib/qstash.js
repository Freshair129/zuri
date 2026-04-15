import { Client } from '@upstash/qstash'
import { Receiver } from '@upstash/qstash'

let client = null
let receiver = null

export function getQStash() {
  if (!client) {
    client = new Client({ token: process.env.QSTASH_TOKEN })
  }
  return client
}

export function getReceiver() {
  if (!receiver) {
    receiver = new Receiver({
      currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
      nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY,
    })
  }
  return receiver
}

/**
 * Verify QStash signature on worker endpoints
 * @param {Request} req
 * @returns {Promise<{isValid: boolean, body: string|null}>}
 */
export async function verifyQStashSignature(req) {
  const signature = req.headers.get('upstash-signature')
  if (!signature) return { isValid: false, body: null }

  const body = await req.text()
  try {
    await getReceiver().verify({ 
      signature, 
      body,
      url: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/api/workers/` : undefined 
    })
    return { isValid: true, body }
  } catch (err) {
    console.error('QStash Verification Error:', err)
    return { isValid: false, body: null }
  }
}
