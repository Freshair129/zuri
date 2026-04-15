// POS Mobile — Shared Constants
import {
  Banknote, QrCode, CreditCard,
  UtensilsCrossed, Smartphone, Truck,
  Bike, Package, Snowflake
} from 'lucide-react'

export const PAYMENT_METHODS = [
  { key: 'CASH', label: 'เงินสด', icon: Banknote, desc: 'รับเงินสด / คำนวณเงินทอน' },
  { key: 'QR', label: 'โอนเงิน', icon: QrCode, desc: 'PromptPay QR / สแกนจ่าย' },
  { key: 'CARD', label: 'เครื่องรูดบัตร', icon: CreditCard, desc: 'บัตรเครดิต / เดบิต' },
]

export const ORDER_TYPES = [
  { key: 'ONSITE', label: 'Dine-in', icon: UtensilsCrossed, desc: 'กินที่ร้าน' },
  { key: 'TAKEAWAY', label: 'Take-away', icon: Smartphone, desc: 'ซื้อกลับบ้าน' },
  { key: 'DELIVERY', label: 'Delivery', icon: Truck, desc: 'ส่งถึงบ้าน' },
]

export const DELIVERY_SUBTYPES = [
  { key: 'DELIVERY_INSTANT', label: 'สด (LineMan)', icon: Bike, desc: 'Fresh/Instant' },
  { key: 'DELIVERY_POSTAL', label: 'พัสดุ (Postal)', icon: Package, desc: 'Dry/Parcel' },
  { key: 'DELIVERY_COLD', label: 'แช่เย็น (Cold)', icon: Snowflake, desc: 'Temp Controlled' },
]

// Thai banknotes & coins for cash input — ordered by value desc
export const CASH_BILLS = [
  { value: 1000, label: '1,000', color: '#8B6914', textColor: '#FFF', type: 'bill' },
  { value: 500, label: '500', color: '#6B3FA0', textColor: '#FFF', type: 'bill' },
  { value: 100, label: '100', color: '#CC3333', textColor: '#FFF', type: 'bill' },
  { value: 50, label: '50', color: '#2E78C2', textColor: '#FFF', type: 'bill' },
  { value: 20, label: '20', color: '#2E8B57', textColor: '#FFF', type: 'bill' },
]
export const CASH_COINS = [
  { value: 10, label: '10', color: '#C0C0C0', textColor: '#333', type: 'coin' },
  { value: 5, label: '5', color: '#B8860B', textColor: '#FFF', type: 'coin' },
  { value: 2, label: '2', color: '#C0C0C0', textColor: '#333', type: 'coin' },
  { value: 1, label: '1', color: '#B8860B', textColor: '#FFF', type: 'coin' },
]

export const CAT_LABELS = {
  'japanese_culinary': 'อาหารญี่ปุ่น',
  'specialty': 'พิเศษ',
  'management': 'การจัดการ',
  'arts': 'ศิลปะ',
  'package': 'แพ็คเกจ',
  'full_course': 'คอร์สเต็ม',
  'course': 'คอร์สทั่วไป',
  'food': 'เมนูหลัก',
  'side_dish': 'เครื่องเคียง',
  'beverage': 'เครื่องดื่ม',
  'snack': 'ของว่าง',
  'dessert': 'ของหวาน',
  'knife': 'มีด',
  'kitchen': 'อุปกรณ์ครัว',
}

export const formatTHB = (n) =>
  new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n ?? 0)
