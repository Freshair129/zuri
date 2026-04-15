/**
 * Culinary Industry Plugin — V School and culinary schools
 * @module industry/culinary
 *
 * This plugin provides:
 * - Course & Package enrollment
 * - Class scheduling & QR attendance
 * - Kitchen operations (recipes, FEFO stock, prep sheets)
 * - Certificate generation
 */

// Sub-modules
export { default as enrollment } from './enrollment/index.js'
export { default as kitchen } from './kitchen/index.js'

// Plugin manifest (loaded by core at runtime)
export default {
  name: 'culinary',
  displayName: 'Culinary School',
  version: '1.0.0',

  // Models this plugin owns
  models: [
    'Package', 'PackageCourse', 'PackageGift', 'PackageEnrollment', 'PackageEnrollmentCourse',
    'Enrollment', 'EnrollmentItem', 'Certificate',
    'CourseSchedule', 'CourseMenu', 'CourseEquipment', 'ClassAttendance',
    'Ingredient', 'IngredientLot', 'Recipe', 'RecipeIngredient', 'RecipeEquipment',
    'StockDeductionLog', 'StockMovement',
  ],

  // Pages to register in sidebar
  navigation: [
    { label: 'Courses', icon: 'BookOpen', path: '/courses', order: 40, roles: ['MANAGER', 'SALES'] },
    { label: 'Schedule', icon: 'Calendar', path: '/schedule', order: 41, roles: ['MANAGER', 'KITCHEN'] },
    { label: 'Kitchen', icon: 'ChefHat', path: '/kitchen', order: 50, roles: ['MANAGER', 'KITCHEN', 'STAFF'] },
  ],

  // Core events this plugin subscribes to
  hooks: {
    'order.created': 'enrollment/handlers/onOrderCreated',
    'schedule.started': 'kitchen/handlers/onClassStarted',
  },
}
