import { describe, it, expect } from 'vitest'
import {
  convertWeight,
  convertVolume,
  convertTemp,
  convertCurrency,
  toBuddhistYear,
  toChristianYear,
  convertYear,
  convert,
  convertDisplay,
} from '@/lib/utils/unitConverter'

// ─────────────────────────────────────────────────────────────────────────────
// convertWeight
// ─────────────────────────────────────────────────────────────────────────────
describe('convertWeight', () => {
  describe('g ↔ kg', () => {
    it('1000g = 1kg', () => expect(convertWeight(1000, 'g', 'kg')).toBe(1))
    it('0.5kg = 500g', () => expect(convertWeight(0.5, 'kg', 'g')).toBe(500))
    it('2.5kg = 2500g', () => expect(convertWeight(2.5, 'kg', 'g')).toBe(2500))
  })

  describe('g ↔ lb', () => {
    it('453.59g ≈ 1lb', () => expect(convertWeight(453.59237, 'g', 'lb')).toBeCloseTo(1, 4))
    it('1lb ≈ 453.59g', () => expect(convertWeight(1, 'lb', 'g')).toBeCloseTo(453.5924, 2))
  })

  describe('g ↔ oz', () => {
    it('28.35g ≈ 1oz', () => expect(convertWeight(28.3495231, 'g', 'oz')).toBeCloseTo(1, 4))
    it('16oz ≈ 453.59g', () => expect(convertWeight(16, 'oz', 'g')).toBeCloseTo(453.59, 1))
  })

  describe('kg ↔ lb', () => {
    it('1kg ≈ 2.2046lb', () => expect(convertWeight(1, 'kg', 'lb')).toBeCloseTo(2.2046, 3))
    it('2.2046lb ≈ 1kg', () => expect(convertWeight(2.2046, 'lb', 'kg')).toBeCloseTo(1, 3))
  })

  describe('mg conversions', () => {
    it('1000mg = 1g', () => expect(convertWeight(1000, 'mg', 'g')).toBe(1))
    it('1g = 1000mg', () => expect(convertWeight(1, 'g', 'mg')).toBe(1000))
  })

  describe('same unit', () => {
    it('should return same value when units are identical', () => {
      expect(convertWeight(500, 'g', 'g')).toBe(500)
      expect(convertWeight(1.5, 'kg', 'kg')).toBe(1.5)
    })
  })

  describe('case insensitivity', () => {
    it('should accept uppercase unit strings', () => {
      expect(convertWeight(1000, 'G', 'KG')).toBe(1)
    })
    it('should accept mixed case', () => {
      expect(convertWeight(1, 'Kg', 'G')).toBe(1000)
    })
  })

  describe('error handling', () => {
    it('should throw for unknown unit', () => {
      expect(() => convertWeight(1, 'stone', 'kg')).toThrow('Unknown weight unit: stone')
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// convertVolume
// ─────────────────────────────────────────────────────────────────────────────
describe('convertVolume', () => {
  describe('ml ↔ L', () => {
    it('1000ml = 1L', () => expect(convertVolume(1000, 'ml', 'l')).toBe(1))
    it('0.25L = 250ml', () => expect(convertVolume(0.25, 'l', 'ml')).toBe(250))
  })

  describe('tsp ↔ tbsp', () => {
    it('3 tsp ≈ 1 tbsp', () => expect(convertVolume(3, 'tsp', 'tbsp')).toBeCloseTo(1, 2))
    it('1 tbsp ≈ 3 tsp', () => expect(convertVolume(1, 'tbsp', 'tsp')).toBeCloseTo(3, 1))
  })

  describe('cup ↔ ml', () => {
    it('1 cup ≈ 236.59ml', () => expect(convertVolume(1, 'cup', 'ml')).toBeCloseTo(236.588, 2))
    it('250ml ≈ 1.057 cups', () => expect(convertVolume(250, 'ml', 'cup')).toBeCloseTo(1.057, 2))
  })

  describe('ml ↔ fl_oz', () => {
    it('1 fl_oz ≈ 29.57ml', () => expect(convertVolume(1, 'fl_oz', 'ml')).toBeCloseTo(29.5735, 2))
    it('100ml ≈ 3.38 fl_oz', () => expect(convertVolume(100, 'ml', 'fl_oz')).toBeCloseTo(3.38, 1))
  })

  describe('tbsp ↔ cup', () => {
    it('16 tbsp ≈ 1 cup', () => expect(convertVolume(16, 'tbsp', 'cup')).toBeCloseTo(1, 1))
  })

  describe('same unit', () => {
    it('should return same value', () => {
      expect(convertVolume(500, 'ml', 'ml')).toBe(500)
    })
  })

  describe('error handling', () => {
    it('should throw for unknown unit', () => {
      expect(() => convertVolume(1, 'barrel', 'ml')).toThrow('Unknown volume unit: barrel')
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// convertTemp
// ─────────────────────────────────────────────────────────────────────────────
describe('convertTemp', () => {
  describe('°C → °F', () => {
    it('0°C = 32°F (freezing)', () => expect(convertTemp(0, 'C', 'F')).toBe(32))
    it('100°C = 212°F (boiling)', () => expect(convertTemp(100, 'C', 'F')).toBe(212))
    it('180°C ≈ 356°F (baking oven)', () => expect(convertTemp(180, 'C', 'F')).toBe(356))
    it('37°C ≈ 98.6°F (body temp)', () => expect(convertTemp(37, 'C', 'F')).toBeCloseTo(98.6, 1))
  })

  describe('°F → °C', () => {
    it('32°F = 0°C', () => expect(convertTemp(32, 'F', 'C')).toBe(0))
    it('212°F = 100°C', () => expect(convertTemp(212, 'F', 'C')).toBe(100))
    it('350°F ≈ 176.67°C (oven)', () => expect(convertTemp(350, 'F', 'C')).toBeCloseTo(176.67, 1))
  })

  describe('°C → K', () => {
    it('0°C = 273.15K', () => expect(convertTemp(0, 'C', 'K')).toBe(273.15))
    it('100°C = 373.15K', () => expect(convertTemp(100, 'C', 'K')).toBe(373.15))
    it('-273.15°C = 0K (absolute zero)', () => expect(convertTemp(-273.15, 'C', 'K')).toBe(0))
  })

  describe('K → °C', () => {
    it('273.15K = 0°C', () => expect(convertTemp(273.15, 'K', 'C')).toBe(0))
    it('373.15K = 100°C', () => expect(convertTemp(373.15, 'K', 'C')).toBe(100))
  })

  describe('°F → K', () => {
    it('32°F = 273.15K', () => expect(convertTemp(32, 'F', 'K')).toBeCloseTo(273.15, 2))
    it('212°F = 373.15K', () => expect(convertTemp(212, 'F', 'K')).toBeCloseTo(373.15, 2))
  })

  describe('same unit', () => {
    it('should return same value', () => {
      expect(convertTemp(100, 'C', 'C')).toBe(100)
      expect(convertTemp(72, 'F', 'F')).toBe(72)
    })
  })

  describe('case insensitivity', () => {
    it('should accept lowercase unit strings', () => {
      expect(convertTemp(100, 'c', 'f')).toBe(212)
    })
  })

  describe('error handling', () => {
    it('should throw for unknown unit', () => {
      expect(() => convertTemp(100, 'X', 'C')).toThrow('Unknown temperature unit: X')
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// convertCurrency
// ─────────────────────────────────────────────────────────────────────────────
describe('convertCurrency', () => {
  it('should convert THB to USD at given rate', () => {
    // 100 THB at 0.028 USD/THB = 2.8 USD
    expect(convertCurrency(100, 0.028)).toBeCloseTo(2.8, 4)
  })

  it('should convert USD to THB at given rate', () => {
    // 1 USD at 35 THB/USD = 35 THB
    expect(convertCurrency(1, 35)).toBe(35)
  })

  it('should handle rate of 1 (same currency)', () => {
    expect(convertCurrency(500, 1)).toBe(500)
  })

  it('should throw if rate is 0', () => {
    expect(() => convertCurrency(100, 0)).toThrow('Rate must be a positive number')
  })

  it('should throw if rate is negative', () => {
    expect(() => convertCurrency(100, -1)).toThrow('Rate must be a positive number')
  })

  it('should throw if rate is not a number', () => {
    expect(() => convertCurrency(100, 'fast')).toThrow('Rate must be a positive number')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// convert (auto-detect wrapper)
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// toBuddhistYear / toChristianYear
// ─────────────────────────────────────────────────────────────────────────────
describe('toBuddhistYear', () => {
  it('2026 CE → 2569 BE', () => expect(toBuddhistYear(2026)).toBe(2569))
  it('2000 CE → 2543 BE', () => expect(toBuddhistYear(2000)).toBe(2543))
  it('1 CE → 544 BE', ()   => expect(toBuddhistYear(1)).toBe(544))
  it('0 CE → 543 BE', ()   => expect(toBuddhistYear(0)).toBe(543))
  it('-543 CE → 0 BE (edge)', () => expect(toBuddhistYear(-543)).toBe(0))

  it('should throw for non-number input', () => {
    expect(() => toBuddhistYear('2026')).toThrow('ceYear must be a finite number')
    expect(() => toBuddhistYear(NaN)).toThrow()
    expect(() => toBuddhistYear(Infinity)).toThrow()
  })
})

describe('toChristianYear', () => {
  it('2569 BE → 2026 CE', () => expect(toChristianYear(2569)).toBe(2026))
  it('2543 BE → 2000 CE', () => expect(toChristianYear(2543)).toBe(2000))
  it('544 BE → 1 CE', ()   => expect(toChristianYear(544)).toBe(1))
  it('543 BE → 0 CE', ()   => expect(toChristianYear(543)).toBe(0))

  it('should throw for non-number input', () => {
    expect(() => toChristianYear('2569')).toThrow('beYear must be a finite number')
    expect(() => toChristianYear(null)).toThrow()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// convertYear (alias-aware wrapper)
// ─────────────────────────────────────────────────────────────────────────────
describe('convertYear', () => {
  describe('CE → BE', () => {
    it('should convert using "CE" and "BE" aliases', () => {
      expect(convertYear(2026, 'CE', 'BE')).toBe(2569)
    })
    it('should convert using "AD" alias for CE', () => {
      expect(convertYear(2026, 'AD', 'BE')).toBe(2569)
    })
    it('should convert using Thai aliases "ค.ศ." → "พ.ศ."', () => {
      expect(convertYear(2026, 'ค.ศ.', 'พ.ศ.')).toBe(2569)
    })
    it('should convert using short Thai "คศ" → "พศ"', () => {
      expect(convertYear(2026, 'คศ', 'พศ')).toBe(2569)
    })
  })

  describe('BE → CE', () => {
    it('should convert using "BE" and "CE" aliases', () => {
      expect(convertYear(2569, 'BE', 'CE')).toBe(2026)
    })
    it('should convert using "พ.ศ." → "ค.ศ."', () => {
      expect(convertYear(2569, 'พ.ศ.', 'ค.ศ.')).toBe(2026)
    })
    it('should convert using "b.e." alias', () => {
      expect(convertYear(2569, 'b.e.', 'CE')).toBe(2026)
    })
  })

  describe('same system', () => {
    it('should return same value when both sides are CE', () => {
      expect(convertYear(2026, 'CE', 'AD')).toBe(2026)
    })
    it('should return same value when both sides are BE', () => {
      expect(convertYear(2569, 'BE', 'พ.ศ.')).toBe(2569)
    })
  })

  describe('error handling', () => {
    it('should throw for unknown year system', () => {
      expect(() => convertYear(2026, 'Gregorian', 'BE')).toThrow('Unknown year system: Gregorian')
    })
    it('should throw for unknown target system', () => {
      expect(() => convertYear(2026, 'CE', 'Japanese')).toThrow('Unknown year system: Japanese')
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// convert() wrapper — year auto-detection
// ─────────────────────────────────────────────────────────────────────────────
describe('convert (generic wrapper)', () => {
  it('should auto-detect weight units and convert', () => {
    expect(convert(1000, 'g', 'kg')).toBe(1)
  })

  it('should auto-detect volume units and convert', () => {
    expect(convert(1000, 'ml', 'l')).toBe(1)
  })

  it('should auto-detect temperature units and convert', () => {
    expect(convert(100, 'C', 'F')).toBe(212)
  })

  it('should auto-detect year units and convert CE → BE', () => {
    expect(convert(2026, 'CE', 'BE')).toBe(2569)
  })

  it('should auto-detect year units and convert BE → CE', () => {
    expect(convert(2569, 'BE', 'CE')).toBe(2026)
  })

  it('should auto-detect Thai year aliases', () => {
    expect(convert(2026, 'ค.ศ.', 'พ.ศ.')).toBe(2569)
  })

  it('should throw for completely unknown units', () => {
    expect(() => convert(1, 'furlong', 'mile')).toThrow()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// convertDisplay (formatted string output)
// ─────────────────────────────────────────────────────────────────────────────
describe('convertDisplay', () => {
  it('should return value with unit string', () => {
    expect(convertDisplay(1000, 'g', 'kg')).toBe('1 kg')
  })

  it('should round display to 2 decimal places', () => {
    const result = convertDisplay(1, 'cup', 'ml')
    expect(result).toContain('ml')
    expect(result).toContain('236.59')
  })

  it('should strip trailing zeros from display', () => {
    // 500ml → 0.5L → display "0.5 l" not "0.50 l"
    expect(convertDisplay(500, 'ml', 'l')).toBe('0.5 l')
  })

  it('should work for temperature', () => {
    expect(convertDisplay(100, 'C', 'F')).toBe('212 F')
  })
})
