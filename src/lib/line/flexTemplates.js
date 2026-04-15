/**
 * Branded LINE Flex Message templates.
 * All templates accept a `tenant` object from shapeTenantConfig() so that
 * colors, logo, and name are per-tenant — never hardcoded.
 */

/**
 * Build a branded header box for use in Flex containers.
 * @param {Object} tenant  — from shapeTenantConfig()
 * @returns {Object}  LINE Flex box component
 */
export function buildBrandedHeader(tenant) {
  const color  = tenant?.brandColor          ?? '#E8820C'
  const name   = tenant?.name                ?? 'Zuri'
  const logoUrl = tenant?.logoUrl

  const contents = []

  if (logoUrl) {
    contents.push({
      type:   'image',
      url:    logoUrl,
      size:   '40px',
      align:  'start',
      aspectMode: 'fit',
    })
  }

  contents.push({
    type:   'text',
    text:   name,
    color:  '#ffffff',
    weight: 'bold',
    size:   'md',
    gravity: 'center',
  })

  return {
    type:            'box',
    layout:          'horizontal',
    backgroundColor: color,
    paddingAll:      'md',
    contents,
  }
}

/**
 * Build a full receipt as a LINE Flex Message.
 * @param {Object} tenant  — from shapeTenantConfig()
 * @param {Object} order   — { orderId, items, subtotal, discountAmount, vatAmount, totalAmount, paymentMethod }
 * @returns {Object}  LINE Flex Message object (type: 'flex')
 */
export function buildReceiptFlex(tenant, order) {
  const primary = tenant?.brandColor ?? '#E8820C'

  const itemRows = (order.items ?? []).map((item) => ({
    type:   'box',
    layout: 'horizontal',
    contents: [
      { type: 'text', text: `${item.name} x${item.qty}`, flex: 3, size: 'sm', color: '#333333', wrap: true },
      { type: 'text', text: `฿${(item.unitPrice * item.qty).toLocaleString()}`, flex: 1, size: 'sm', align: 'end', color: '#333333' },
    ],
  }))

  const summaryRows = []

  if (order.discountAmount > 0) {
    summaryRows.push({
      type:   'box',
      layout: 'horizontal',
      contents: [
        { type: 'text', text: 'ส่วนลด', flex: 3, size: 'sm', color: '#e53e3e' },
        { type: 'text', text: `-฿${order.discountAmount.toLocaleString()}`, flex: 1, size: 'sm', align: 'end', color: '#e53e3e' },
      ],
    })
  }

  if (order.vatAmount > 0) {
    summaryRows.push({
      type:   'box',
      layout: 'horizontal',
      contents: [
        { type: 'text', text: `VAT ${tenant?.vatRate ?? 7}%`, flex: 3, size: 'sm', color: '#666666' },
        { type: 'text', text: `+฿${order.vatAmount.toLocaleString()}`, flex: 1, size: 'sm', align: 'end', color: '#666666' },
      ],
    })
  }

  summaryRows.push({
    type:   'box',
    layout: 'horizontal',
    margin: 'sm',
    contents: [
      { type: 'text', text: 'ยอดสุทธิ', flex: 3, size: 'md', weight: 'bold', color: '#1a202c' },
      { type: 'text', text: `฿${order.totalAmount.toLocaleString()}`, flex: 1, size: 'md', weight: 'bold', align: 'end', color: primary },
    ],
  })

  return {
    type:    'flex',
    altText: `ใบเสร็จ #${order.orderId} — ฿${order.totalAmount.toLocaleString()}`,
    contents: {
      type: 'bubble',
      header: {
        type:   'box',
        layout: 'vertical',
        contents: [buildBrandedHeader(tenant)],
      },
      body: {
        type:       'box',
        layout:     'vertical',
        paddingAll: 'md',
        spacing:    'sm',
        contents: [
          {
            type:   'text',
            text:   `ใบเสร็จ #${order.orderId}`,
            size:   'sm',
            color:  '#888888',
            margin: 'none',
          },
          { type: 'separator', margin: 'md' },
          ...itemRows,
          { type: 'separator', margin: 'md' },
          ...summaryRows,
        ],
      },
      footer: {
        type:            'box',
        layout:          'vertical',
        paddingAll:      'md',
        backgroundColor: '#f7f7f7',
        contents: [
          {
            type:  'text',
            text:  'ขอบคุณที่ใช้บริการ 🙏',
            size:  'xs',
            color: '#aaaaaa',
            align: 'center',
          },
        ],
      },
    },
  }
}
