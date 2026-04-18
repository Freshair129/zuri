# ADR-071 — Internationalization (i18n) & Theme System

**Status:** APPROVED (documenting existing implementation)
**Date:** 2026-04-09
**Author:** Boss (implementation) + Claude (documentation)

---

## 1. Context

Zuri ถูกสร้างเป็น "AI Business Platform built for Thailand" แต่ต้องรองรับภาษาอังกฤษด้วยสำหรับ:
- International staff ที่ทำงานในธุรกิจไทย
- Future expansion ไป SEA markets
- Developer experience (English docs/code)

นอกจากนี้ ยังต้องการ Dark/Light theme เพื่อรองรับการใช้งานในสภาพแวดล้อมต่างๆ (ครัวมืด, ออฟฟิศ, กลางคืน)

---

## 2. Decision

### 2.1 Language System (TH/EN)

ใช้ **React Context** (`LanguageContext`) สำหรับ client-side i18n:
- Default: Thai (`th`)
- Supported: Thai (`th`), English (`en`)
- Switcher: Iconic toggle ใน Topbar (TH|EN text switcher)
- Translation: key-based lookup — components ใช้ `useLanguage()` hook
- Persistence: localStorage (ถ้ามี) หรือ default th

**ไม่ใช้** next-intl / next-i18next เพราะ:
- Zuri เป็น client-heavy app (dashboard) ไม่ได้ต้องการ SSR i18n
- ลด dependency + complexity
- Translation keys อยู่ใน component-level (co-located)

### 2.2 Theme System (Dark/Light)

ใช้ **Amber Citrus Design System**:
- Dark theme: `#1A1710` base (warm dark, not pure black)
- Light theme: warm white variants
- Toggle: animated Sun/Moon icons ใน Topbar (Framer Motion)
- CSS: Tailwind CSS class-based theming
- Glass effects: backdrop-filter on Sidebar + Topbar

---

## 3. Implementation

| Component | ที่อยู่ | หน้าที่ |
|---|---|---|
| `LanguageContext` | `src/context/LanguageContext.jsx` | Provider + `useLanguage()` hook |
| `ThemeContext` | `src/context/ThemeContext.jsx` | Provider + `useTheme()` hook |
| `Topbar` | `src/components/layouts/Topbar.jsx` | Theme toggle + Language switcher |
| `Sidebar` | `src/components/layouts/Sidebar.jsx` | Reads from both contexts |
| `DashboardShell` | `src/components/layouts/DashboardShell.jsx` | Applies theme class to root |

---

## 4. Design System Reference

**Name:** Amber Citrus
**Source:** `docs/design/zuri-AmberCitrus-Design.html`

| Token | Dark | Light |
|---|---|---|
| Background | `#1A1710` | `#FFFBF5` |
| Surface | `rgba(255,255,255,0.05)` | `#FFFFFF` |
| Primary | Amber-500 (`#F59E0B`) | Amber-600 (`#D97706`) |
| Text | `#FAFAF5` | `#1A1710` |
| Glass | `backdrop-filter: blur(12px)` | `backdrop-filter: blur(8px)` |

---

## 5. Trade-offs

| | แนวทางนี้ (Context-based) | Alternative (next-intl) |
|---|---|---|
| **Setup** | ง่าย, zero dependency | ต้อง config middleware + locale routing |
| **SEO** | ไม่ได้ SSR translation | Full SSR i18n support |
| **Bundle** | เล็ก (translations co-located) | ใหญ่กว่า (library + locale files) |
| **Fit** | ดี — dashboard app ไม่ต้องการ SEO | Over-engineered สำหรับ dashboard |

---

*อ้างอิง: Amber Citrus Design Document · Tailwind CSS · Framer Motion*
