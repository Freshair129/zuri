import {
  MessageSquare,
  Users,
  Megaphone,
  ShoppingCart,
  ChefHat,
  CalendarDays,
  UsersRound,
  ClipboardList,
  GraduationCap,
  Settings,
  LayoutDashboard,
  Inbox,
  Facebook,
  MessageCircle,
  Clock,
  UserPlus,
  Target,
  Store,
  History,
  Package,
  Tags,
  BarChart3,
  Zap,
  CalendarCheck,
  Warehouse,
  BookOpen,
  Truck,
  UserCog,
  ListChecks,
  Bolt,
  Smartphone,
  MapPin,
  Monitor,
  HelpCircle,
  FlaskConical,
  FileQuestion,
  BookOpenCheck,
  Phone,
} from 'lucide-react';

/** @type {Record<string, {label: string, icon: any, subFeatures: {label: string, path: string, icon: any}[]}>} */
const modules = {
  overview: {
    label: 'Overview',
    icon: LayoutDashboard,
    subFeatures: [
      { label: 'Dashboard', path: '/overview', icon: LayoutDashboard },
      { label: 'Quick Actions', path: '/overview/actions', icon: Bolt },
    ],
  },
  inbox: {
    label: 'Inbox',
    icon: MessageSquare,
    subFeatures: [
      { label: 'Dashboard', path: '/inbox', icon: LayoutDashboard },
      { label: 'ทั้งหมด', path: '/inbox/all', icon: Inbox },
      { label: 'Facebook', path: '/inbox/facebook', icon: Facebook },
      { label: 'LINE', path: '/inbox/line', icon: MessageCircle },
      { label: 'รอตอบ', path: '/inbox/pending', icon: Clock },
    ],
  },
  crm: {
    label: 'CRM',
    icon: Users,
    subFeatures: [
      { label: 'Dashboard', path: '/crm', icon: LayoutDashboard },
      { label: 'ลูกค้า', path: '/crm/customers', icon: Users },
      { label: 'Leads', path: '/crm/leads', icon: UserPlus },
      { label: 'Segments', path: '/crm/segments', icon: Target },
    ],
  },
  marketing: {
    label: 'Marketing',
    icon: Megaphone,
    subFeatures: [
      { label: 'Dashboard', path: '/marketing', icon: LayoutDashboard },
      { label: 'แคมเปญ', path: '/marketing/campaigns', icon: Zap },
      { label: 'Daily Brief', path: '/marketing/daily-brief', icon: BarChart3 },
    ],
  },
  pos: {
    label: 'POS',
    icon: ShoppingCart,
    subFeatures: [
      { label: 'Dashboard', path: '/pos', icon: LayoutDashboard },
      { label: 'POS Mobile', path: '/pos/mobile', icon: Smartphone },
      { label: 'จัดการโต๊ะ', path: '/pos/tables', icon: MapPin },
      { label: 'Seating Monitor', path: '/pos/monitor', icon: Monitor },
    ],
  },
  kitchen: {
    label: 'Kitchen',
    icon: ChefHat,
    subFeatures: [
      { label: 'Dashboard', path: '/kitchen', icon: LayoutDashboard },
      { label: 'สต๊อก', path: '/kitchen/stock', icon: Warehouse },
      { label: 'สูตรอาหาร', path: '/kitchen/recipes', icon: BookOpen },
      { label: 'จัดซื้อ', path: '/kitchen/procurement', icon: Truck },
    ],
  },
  schedule: {
    label: 'Schedule',
    icon: CalendarDays,
    subFeatures: [
      { label: 'Dashboard', path: '/schedule', icon: LayoutDashboard },
      { label: 'ปฏิทิน', path: '/schedule/calendar', icon: CalendarCheck },
    ],
  },
  courses: {
    label: 'Courses',
    icon: GraduationCap,
    subFeatures: [
      { label: 'Dashboard', path: '/courses', icon: LayoutDashboard },
      { label: 'หลักสูตร', path: '/courses/list', icon: BookOpen },
      { label: 'การลงทะเบียน', path: '/courses/enrollments', icon: ListChecks },
    ],
  },
  employees: {
    label: 'Employees',
    icon: UsersRound,
    subFeatures: [
      { label: 'Dashboard', path: '/employees', icon: LayoutDashboard },
      { label: 'รายชื่อ', path: '/employees', icon: UsersRound },
      { label: 'บทบาท', path: '/employees/roles', icon: UserCog },
    ],
  },
  tasks: {
    label: 'Tasks',
    icon: ClipboardList,
    subFeatures: [
      { label: 'Dashboard', path: '/tasks', icon: LayoutDashboard },
    ],
  },
  help: {
    label: 'Help Center',
    icon: HelpCircle,
    subFeatures: [
      { label: 'เริ่มต้นใช้งาน', path: '/help',            icon: BookOpenCheck },
      { label: 'FAQ',          path: '/help/faq',          icon: FileQuestion },
      { label: 'ติดต่อ Support', path: '/help/contact',    icon: Phone },
    ],
  },
  uat: {
    label: 'UAT Feedback',
    icon: FlaskConical,
    subFeatures: [
      { label: 'แบบฟอร์ม Feedback', path: '/uat',         icon: FlaskConical },
    ],
  },
};

/** Get the module key from pathname, e.g. '/pos/cart' → 'pos' */
export function getModuleFromPath(pathname) {
  if (!pathname) return null;
  const segment = pathname.split('/').filter(Boolean)[0];
  return modules[segment] ? segment : null;
}

/** Get ordered array of module entries for rendering */
export function getModuleList() {
  return Object.entries(modules).map(([key, mod]) => ({
    key,
    ...mod,
  }));
}

export default modules;
