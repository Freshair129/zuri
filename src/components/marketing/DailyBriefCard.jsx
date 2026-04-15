import { Users, UserPlus, Flame, DollarSign } from 'lucide-react';
import Card from '../ui/Card';

const metrics = [
  {
    key: 'contacts',
    label: 'New Contacts',
    icon: Users,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
  {
    key: 'leads',
    label: 'Leads',
    icon: UserPlus,
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
  },
  {
    key: 'hot',
    label: 'Hot Prospects',
    icon: Flame,
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
  },
  {
    key: 'revenue',
    label: "Today's Revenue",
    icon: DollarSign,
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    prefix: '฿',
  },
];

export default function DailyBriefCard({
  date,
  contacts = 0,
  leads = 0,
  hot = 0,
  revenue = 0,
}) {
  const values = { contacts, leads, hot, revenue };

  return (
    <Card
      header={
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Daily Brief</h3>
          <span className="text-sm text-gray-500">{date ?? new Date().toLocaleDateString('th-TH')}</span>
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        {metrics.map(({ key, label, icon: Icon, iconBg, iconColor, prefix }) => (
          <div key={key} className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
              <Icon className={`h-5 w-5 ${iconColor}`} />
            </div>
            <div>
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-lg font-bold text-gray-900">
                {prefix ?? ''}{key === 'revenue' ? values[key].toLocaleString() : values[key]}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
