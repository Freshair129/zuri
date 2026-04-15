// Created At: 2026-04-10 12:45:00 +07:00 (v1.0.0)
// Previous version: —
// Last Updated: 2026-04-10 12:45:00 +07:00 (v1.0.0)

/**
 * Industry Configuration Registry — MT-4 Tenant Onboarding
 * 
 * Defines the initial seed data structure and branding for new tenants
 * across different business domains.
 */

export const INDUSTRIES = {
  culinary: {
    label: 'Culinary School',
    brandColor: '#E8820C', // Zuri Amber
    zones: [
      { name: 'Kitchen 1', color: '#E8820C' },
      { name: 'Dining Hall', color: '#92400E' }
    ],
    categories: ['Cooking Courses', 'Bakery Workshops', 'Equipments'],
    products: [
      {
        name: 'Basic Thai Cooking (Sample)',
        category: 'Cooking Courses',
        price: 1500,
        description: 'A 3-hour introduction to essential Thai herbs and spices.'
      }
    ]
  },
  beauty: {
    label: 'Beauty & Salon',
    brandColor: '#D946EF', // Fuchsia/Pink
    zones: [
      { name: 'Main Salon Area', color: '#D946EF' },
      { name: 'Private Room', color: '#701A75' }
    ],
    categories: ['Hair Services', 'Nail Art', 'Treatments'],
    products: [
      {
        name: 'Signature Haircut (Sample)',
        category: 'Hair Services',
        price: 850,
        description: 'Professional cut and style with our senior stylist.'
      }
    ]
  },
  fitness: {
    label: 'Fitness Studio',
    brandColor: '#10B981', // Emerald/Green
    zones: [
      { name: 'Workout Floor', color: '#10B981' },
      { name: 'Yoga Studio', color: '#065F46' }
    ],
    categories: ['Group Classes', 'Personal Training', 'Memberships'],
    products: [
      {
        name: 'Daily Pass (Sample)',
        category: 'Group Classes',
        price: 500,
        description: 'Access to all gym facilities and one group class.'
      }
    ]
  }
};

export const DEFAULT_INDUSTRY = 'culinary';
