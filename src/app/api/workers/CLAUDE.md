# API Workers — Agent Context (QStash Cron)

**NFR3:** ทุก worker ต้อง retry ≥ 5 ครั้ง — ห้าม catch error แบบ silent

## Workers ที่มี
```
src/app/api/workers/
├── sync-hourly/      — Meta Ads sync (Campaign/AdSet/Ad/Metrics)
├── crm-enrich/       — Customer enrichment (AI insight)
└── [เพิ่มตาม M3-M6]  — DSB v2, auto-tag, market price scraper
```

## Worker Pattern บังคับ
```js
export async function POST(req) {
  // 1. Verify QStash signature
  const isValid = await verifyQStashSignature(req)
  if (!isValid) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    // 2. Process
    await doWork()

    // 3. Return 200 เมื่อสำเร็จ
    return Response.json({ ok: true })
  } catch (error) {
    console.error('[WorkerName]', error)
    // 4. throw เพื่อให้ QStash retry — ห้าม return 200 เมื่อ error
    throw error
  }
}
```

## Cron Schedule
| Worker | เวลา | หมายเหตุ |
|---|---|---|
| sync-hourly | ทุก 1 ชม. | Meta Ads data |
| dsb-generate | 00:05 ICT | Daily Brief (M3) |
| prep-sheet | 18:00 ICT | Kitchen prep (M2) |
| market-price | 06:00 ICT | ราคาวัตถุดิบ (M6) |

## Rate Limits (จาก system_config.yaml)
- Meta API: batch_size 50, max_retries 4, backoff `[60, 120, 240, 480]` วินาที
- QStash free tier: 500 messages/day

## Gotchas
- ห้าม process sync ขนาดใหญ่แบบ synchronous — ใช้ batch + delay ระหว่าง batch
- Worker ที่ fail ต้อง log `console.error('[WorkerName]', error)` ก่อน throw เสมอ
- ห้าม call Meta API จากที่อื่นนอกจาก worker — UI อ่านจาก DB เท่านั้น
