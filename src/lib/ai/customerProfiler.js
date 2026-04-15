import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

/**
 * Infer customer demographics and profile from conversation
 * @param {Object} conversation - { id, firstTouchAdId, customer: { facebookName, lineName, name, lifecycleStage } }
 * @param {Array} messages - List of { sender: 'customer'|'staff', content: string, createdAt: Date }
 * @returns {Promise<Object|null>} { gender, ageRange, hasChildren, occupation, educationLevel, location, cookingLevel, motivation, budgetSignal } or null on error
 */
export async function inferCustomerProfile(conversation, messages) {
  if (!conversation || !messages || messages.length === 0) {
    console.error('[customerProfiler] Missing conversation or messages')
    return null
  }

  const customerName = conversation.customer?.name || conversation.customer?.facebookName || conversation.customer?.lineName || 'Customer'

  // Format messages into dialog
  const messageDialog = messages
    .map((m) => `${m.sender === 'customer' ? 'Customer' : 'Staff'}: ${m.content}`)
    .join('\n')

  const prompt = `
You are inferring customer demographics and profile from a conversation at a Thai culinary/business school.

**Customer Name:** ${customerName}

**Conversation:**
${messageDialog}

**Your Task:** Infer customer profile from conversation clues. Return ONLY a valid JSON object (no markdown, no extra text).

**CRITICAL RULE:** If you cannot confidently infer a field, set it to UNKNOWN (for strings/enums) or null (for booleans/optional fields). UNKNOWN is better than guessing.

**Output Format (JSON only):**
{
  "gender": "M|F|OTHER|UNKNOWN",
  "ageRange": "20-30|30-40|40-50|50-60|60+|UNKNOWN",
  "hasChildren": true|false|null,
  "occupation": "free text string or null",
  "educationLevel": "free text string or null",
  "location": "district/province only or null",
  "cookingLevel": "BEGINNER|INTERMEDIATE|ADVANCED|UNKNOWN",
  "motivation": ["hobby", "open_restaurant", "gift", "career", "health"],
  "budgetSignal": "LOW|MID|HIGH|UNKNOWN"
}

**Field Rules:**

**gender:** Detect from Thai pronouns (if message is in Thai):
- ผม/ครับ/ผมครับ → M
- หนู/ค่ะ/คะ/ฉัน/ดิฉัน → F
- เรา/จ้า → OTHER
- English: "I'm a man/boy/guy" → M, "I'm a woman/girl/lady" → F
- If no clear signal: UNKNOWN

**ageRange:** Look for:
- Mentions of kids/family status
- School/career stage ("just graduated", "20-year career")
- Life stage language
- If unclear: UNKNOWN

**hasChildren:** true/false/null only
- true: "I have 2 kids", "my children", "my son"
- false: "no kids", "don't have children"
- null: not mentioned

**occupation:** Free text. Examples: "freelancer", "accountant", "homemaker", "retired". null if not mentioned.

**educationLevel:** Free text. Examples: "high school", "bachelor's degree", "vocational", "MBA". null if not mentioned.

**location:** DISTRICT/PROVINCE NAME ONLY (ไม่มีบ้านเลขที่, ไม่มี street address).
- Examples: "Bangkok", "Chiang Mai", "Sukhumvit" (ถ้า mention district)
- null if not mentioned
- NEVER include street addresses, house numbers, or specific coordinates

**cookingLevel:**
- BEGINNER: "never cooked", "first time", "don't know how"
- INTERMEDIATE: "cook at home", "make dinner", "some experience"
- ADVANCED: "professional chef", "teach cooking", "run restaurant"
- UNKNOWN: No clear signal

**motivation:** Array (0-5 items). Can be multiple. Examples:
- hobby: "want to cook better", "for fun"
- open_restaurant: "want to start a cafe", "dream of restaurant"
- gift: "gift for someone", "class for friend"
- career: "want to teach", "professional development"
- health: "diet concerns", "healthy eating"
- If none found: empty array []

**budgetSignal:**
- HIGH: "premium tier", "don't mind price", luxury mentions
- MID: "normal price", typical purchasing
- LOW: "price-sensitive", "budget option", "how much does it cost?"
- UNKNOWN: No price signal

**Examples:**

Input: "Hi, I want to learn baking for my 3-year-old and I love pastries. Just started a small cafe in Rama 6."
Output: {
  "gender": "UNKNOWN",
  "ageRange": "UNKNOWN",
  "hasChildren": true,
  "occupation": "cafe owner",
  "educationLevel": null,
  "location": "Rama 6",
  "cookingLevel": "INTERMEDIATE",
  "motivation": ["open_restaurant", "hobby"],
  "budgetSignal": "MID"
}

Input: "ผมเป็นหัวหน้าที่ทำงาน อยากเรียนอาหารเอง วันสุดสัปดาห์ เพราะหน้างานดี"
Output: {
  "gender": "M",
  "ageRange": "30-40",
  "hasChildren": null,
  "occupation": "manager",
  "educationLevel": null,
  "location": null,
  "cookingLevel": "BEGINNER",
  "motivation": ["hobby"],
  "budgetSignal": "HIGH"
}

Return ONLY the JSON object, nothing else.
`

  try {
    const result = await model.generateContent(prompt)
    const responseText = result.response.text()
    const cleanedText = responseText.replace(/```json|```/g, '').trim()
    const profile = JSON.parse(cleanedText)
    return profile
  } catch (error) {
    console.error('[customerProfiler]', error)
    return null
  }
}
