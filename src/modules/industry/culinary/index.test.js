import { describe, it, expect } from 'vitest'
import manifest from './index.js'

describe('Culinary Industry Plugin Manifest', () => {
  it('should have the correct plugin name', () => {
    expect(manifest.name).toBe('culinary')
  })

  it('should define navigation items with correct persona roles (ADR-068 Sync)', () => {
    expect(manifest.navigation).toBeDefined()
    expect(manifest.navigation.length).toBeGreaterThan(0)

    // Verify 'Courses' roles
    const coursesNav = manifest.navigation.find(n => n.label === 'Courses')
    expect(coursesNav.roles).toContain('MANAGER')
    expect(coursesNav.roles).toContain('SALES')

    // Verify 'Schedule' roles
    const scheduleNav = manifest.navigation.find(n => n.label === 'Schedule')
    expect(scheduleNav.roles).toContain('MANAGER')
    expect(scheduleNav.roles).toContain('KITCHEN')

    // Verify 'Kitchen' roles
    const kitchenNav = manifest.navigation.find(n => n.label === 'Kitchen')
    expect(kitchenNav.roles).toContain('MANAGER')
    expect(kitchenNav.roles).toContain('KITCHEN')
    expect(kitchenNav.roles).toContain('STAFF')
  })

  it('should use only canonical persona codes', () => {
    const CANONICAL_ROLES = ['MANAGER', 'KITCHEN', 'SALES', 'FINANCE', 'STAFF', 'DEV']
    
    manifest.navigation.forEach(item => {
      item.roles.forEach(role => {
        expect(CANONICAL_ROLES).toContain(role)
      })
    })
  })
})
