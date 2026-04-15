/**
 * FlowAccount REST API Adapter
 * Ref: FEAT17-ACCOUNTING-PLATFORM.md § 6.2
 * Sanitized for Edge Runtime compatibility.
 */
import { decrypt, encrypt } from '@/lib/crypto'
import { getPrisma } from '@/lib/db'

const FA_BASE = 'https://openapi.flowaccount.com/v1'
const FA_TOKEN_URL = 'https://auth.flowaccount.com/connect/token'

/**
 * Return a valid access token, refreshing if expired.
 * Updates config in DB if refresh occurs.
 */
export async function getAccessToken(config) {
  const expiresAt = config.oauthExpiresAt ? new Date(config.oauthExpiresAt) : null
  const isExpired = !expiresAt || expiresAt <= new Date(Date.now() + 60_000)

  if (!isExpired) {
    return await decrypt(config.oauthAccessTokenEnc)
  }

  // Refresh
  const refreshToken = await decrypt(config.oauthRefreshTokenEnc)
  const res = await fetch(FA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: process.env.FLOWACCOUNT_CLIENT_ID,
      client_secret: process.env.FLOWACCOUNT_CLIENT_SECRET,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`FlowAccount token refresh failed: ${err.error_description ?? res.status}`)
  }

  const tokens = await res.json()
  const newExpiry = new Date(Date.now() + tokens.expires_in * 1000)

  const prisma = await getPrisma()
  await prisma.integrationConfig.update({
    where: { id: config.id },
    data: {
      oauthAccessTokenEnc: await encrypt(tokens.access_token),
      oauthRefreshTokenEnc: await encrypt(tokens.refresh_token ?? refreshToken),
      oauthExpiresAt: newExpiry,
    },
  })

  return tokens.access_token
}

async function faPost(path, body, accessToken) {
  const res = await fetch(`${FA_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`FlowAccount ${path} ${res.status}: ${JSON.stringify(err)}`)
  }
  return res.json()
}

async function faGet(path, params = {}, accessToken) {
  const qs = new URLSearchParams(params)
  const res = await fetch(`${FA_BASE}${path}?${qs}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`FlowAccount GET ${path} ${res.status}: ${JSON.stringify(err)}`)
  }
  return res.json()
}

async function checkDuplicate(referenceNumber, accessToken) {
  try {
    const data = await faGet('/cash-invoices', { referenceNumber }, accessToken)
    return data?.data?.length > 0
  } catch {
    return false 
  }
}

export async function syncInvoice(order, config) {
  const accessToken = await getAccessToken(config)
  const referenceNumber = `ZRI-${order.orderId}`

  const isDuplicate = await checkDuplicate(referenceNumber, accessToken)
  if (isDuplicate) {
    return { skipped: true, reason: 'duplicate', referenceNumber }
  }

  const items = (order.items || []).map((item) => ({
    description: item.name,
    quantity: item.qty,
    pricePerUnit: item.unitPrice,
    discountAmount: item.discount || 0,
    vatType: config.syncOptionsJson?.vatType ?? 'NO_VAT',
  }))

  const payload = {
    referenceNumber,
    documentDate: order.date ?? order.createdAt,
    contactName: order.customer?.name ?? 'Walk-in Customer',
    items,
    discountAmount: order.discountAmount || 0,
    taxAmount: order.vatAmount || 0,
    totalAmount: order.totalAmount,
    remarks: `Zuri POS Order — ${order.orderType ?? 'TAKEAWAY'}`,
  }

  const result = await faPost('/cash-invoices', payload, accessToken)
  return { synced: true, referenceNumber, flowAccountId: result?.data?.id }
}

export async function syncContact(customer, config) {
  const accessToken = await getAccessToken(config)

  const payload = {
    contactType: 'INDIVIDUAL',
    name: customer.name ?? customer.facebookName ?? 'Unknown',
    email: customer.email ?? undefined,
    phone: customer.phonePrimary ?? undefined,
    address: undefined,
    remarks: `Zuri CRM ID: ${customer.customerId}`,
  }

  const result = await faPost('/contacts', payload, accessToken)
  return { synced: true, flowAccountId: result?.data?.id }
}

export async function syncExpense(po, config) {
  const accessToken = await getAccessToken(config)
  const referenceNumber = `ZRI-PO-${po.poId}`

  const accountMapping = config.accountMappingJson ?? {}

  const payload = {
    referenceNumber,
    documentDate: po.createdAt,
    contactName: po.supplier?.name ?? 'Unknown Supplier',
    expenseCategory: accountMapping[po.category] ?? 'ต้นทุนสินค้า',
    amount: po.totalAmount,
    vatAmount: po.vatAmount || 0,
    remarks: `Zuri PO — ${po.poId}`,
  }

  const result = await faPost('/expenses', payload, accessToken)
  return { synced: true, referenceNumber, flowAccountId: result?.data?.id }
}
