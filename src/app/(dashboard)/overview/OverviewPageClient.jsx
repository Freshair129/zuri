'use client';

import {
  TrendingUp,
  TrendingDown,
  MessageSquare,
  Users,
  DollarSign,
  ShoppingCart,
  Wallet,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

const IconMap = {
  DollarSign,
  MessageSquare,
  Users,
  ShoppingCart,
  Wallet,
};

const ColorMap = {
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/30',
    icon: 'text-emerald-600 dark:text-emerald-400',
    badge: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300',
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-900/30',
    icon: 'text-amber-600 dark:text-amber-400',
    badge: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300',
  },
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-900/30',
    icon: 'text-blue-600 dark:text-blue-400',
    badge: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300',
  },
  rose: {
    bg: 'bg-rose-50 dark:bg-rose-900/30',
    icon: 'text-rose-600 dark:text-rose-400',
    badge: 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300',
  },
};

export default function OverviewPageClient({ data }) {
  const { t } = useLanguage();
  const { kpis, recentOrders, channels } = data;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
          {t('business_overview')}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t('business_overview')} — {t('today')}
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((card) => {
          const colors = ColorMap[card.color] || ColorMap.emerald;
          const Icon = IconMap[card.icon] || DollarSign;
          const isUp = card.trend === 'up';
          const TrendIcon = isUp ? TrendingUp : TrendingDown;

          return (
            <div
              key={card.key}
              className="bg-white dark:bg-white/[0.03] rounded-xl border border-gray-200 dark:border-white/[0.05] p-4 sm:p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className={`p-3 rounded-xl ${colors.bg} shrink-0`}>
                <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${colors.icon}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{t(card.key)}</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mt-0.5 truncate">
                  {card.value}
                </p>
                {card.change && (
                  <div className="flex items-center gap-1 mt-1">
                    <TrendIcon className={`h-3.5 w-3.5 ${isUp ? 'text-emerald-500' : 'text-amber-500'}`} />
                    <span className={`text-xs font-medium ${isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {card.change}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">{t('vs_yesterday')}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent orders */}
        <div className="bg-white dark:bg-white/[0.03] rounded-xl border border-gray-200 dark:border-white/[0.05] p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
            {t('recent_orders')}
          </h3>
          <div className="space-y-3">
            {recentOrders.length > 0 ? (
              recentOrders.map((order, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-white/[0.05] last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{order.id} — {order.customer}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{order.timeVal}</p>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 shrink-0 ml-2">{order.amount}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 p-4 text-center">ยังไม่มีข้อมูลวันนี้</p>
            )}
          </div>
        </div>

        {/* Top channels */}
        <div className="bg-white dark:bg-white/[0.03] rounded-xl border border-gray-200 dark:border-white/[0.05] p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
            {t('top_channels')}
          </h3>
          <div className="space-y-3">
            {channels.map((ch) => (
              <div key={ch.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{ch.name}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{ch.pct}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 dark:bg-white/[0.05] rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${ch.color}`} style={{ width: `${ch.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
