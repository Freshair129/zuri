'use client'

import { useState, useEffect } from 'react'
import { 
  Users, Clock, DollarSign, MapPin, 
  RefreshCw, ChefHat, LayoutGrid, 
  AlertCircle, CheckCircle2, MoreVertical
} from 'lucide-react'

const REFRESH_INTERVAL = 30000 // 30 seconds

export default function SeatingMonitorPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState([])
  const [zones, setZones] = useState([])
  const [filterZone, setFilterZone] = useState('all')

  const fetchData = async () => {
    try {
      const [zRes, tRes] = await Promise.all([
        fetch('/api/pos/zones'),
        fetch('/api/pos/tables?monitor=true')
      ])
      const zJson = await zRes.json()
      const tJson = await tRes.json()
      setZones(zJson.data || [])
      setData(tJson.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const timer = setInterval(fetchData, REFRESH_INTERVAL)
    return () => clearInterval(timer)
  }, [])

  // --- Stats Calculation ---
  const occupiedTables = data.filter(t => t.status === 'OCCUPIED')
  const totalGuests = occupiedTables.reduce((sum, t) => sum + (t.activeOrder?.guestCount || 0), 0)
  const totalExtra = occupiedTables.reduce((sum, t) => sum + (t.activeOrder?.extraSeats || 0), 0)
  const availableCount = data.filter(t => t.status === 'AVAILABLE').length

  const filteredData = filterZone === 'all' ? data : data.filter(t => t.zoneId === filterZone)

  return (
    <div className="p-6 space-y-6 bg-gray-50/50 min-h-[calc(100vh-64px)] animate-fade-in">
      {/* Header & Global Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 flex items-center justify-between bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Seating Monitor</h1>
            <p className="text-sm text-gray-500 flex items-center gap-2">
              <RefreshCw size={14} className={loading ? 'animate-spin text-orange-500' : 'text-gray-300'} />
              อัปเดตทุก 30 วินาที
            </p>
          </div>
          <div className="flex gap-2">
             <div className="text-right">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">In-house Guests</p>
                <div className="flex items-center gap-2 justify-end">
                   <Users size={18} className="text-orange-500" />
                   <span className="text-2xl font-black text-gray-900">{totalGuests}</span>
                   {totalExtra > 0 && <span className="text-sm font-bold text-orange-400">+{totalExtra}</span>}
                </div>
             </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
           <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center">
              <CheckCircle2 size={24} />
           </div>
           <div>
              <p className="text-xs font-bold text-gray-400 uppercase">Available</p>
              <p className="text-xl font-black text-gray-900">{availableCount} โต๊ะ</p>
           </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
           <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center">
              <ChefHat size={24} />
           </div>
           <div>
              <p className="text-xs font-bold text-gray-400 uppercase">Occupied</p>
              <p className="text-xl font-black text-gray-900">{occupiedTables.length} โต๊ะ</p>
           </div>
        </div>
      </div>

      {/* Zone Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <button 
          onClick={() => setFilterZone('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border whitespace-nowrap ${filterZone === 'all' ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-100' : 'bg-white text-gray-500 border-gray-200'}`}
        >
          ทั้งหมด
        </button>
        {zones.map(z => (
          <button 
            key={z.id}
            onClick={() => setFilterZone(z.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border whitespace-nowrap ${filterZone === z.id ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-100' : 'bg-white text-gray-500 border-gray-200'}`}
          >
            {z.name}
          </button>
        ))}
      </div>

      {/* Monitor Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredData.map(table => (
          <TableMonitorCard key={table.id} table={table} />
        ))}
      </div>
    </div>
  )
}

function TableMonitorCard({ table }) {
  const isActive = table.status === 'OCCUPIED'
  const activeOrder = table.activeOrder

  // Calculate elapsed minutes
  const [elapsed, setElapsed] = useState('')

  useEffect(() => {
    if (!isActive || !activeOrder?.createdAt) return
    
    const updateTime = () => {
      const start = new Date(activeOrder.createdAt)
      const diff = Math.floor((new Date() - start) / 60000)
      if (diff < 60) setElapsed(`${diff}m`)
      else setElapsed(`${Math.floor(diff/60)}h ${diff%60}m`)
    }

    updateTime()
    const t = setInterval(updateTime, 60000)
    return () => clearInterval(t)
  }, [isActive, activeOrder])

  return (
    <div className={`relative bg-white border-2 rounded-[2rem] p-6 transition-all duration-300 overflow-hidden ${isActive ? 'border-red-100 shadow-xl shadow-red-50/50' : 'border-gray-100 opacity-80'}`}>
      {/* Background Icon Watermark */}
      <div className="absolute -right-4 -bottom-4 opacity-[0.03] rotate-12">
        <LayoutGrid size={120} />
      </div>

      <div className="relative z-10 flex flex-col h-full">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${isActive ? 'bg-red-500 text-white shadow-lg shadow-red-200' : 'bg-gray-100 text-gray-400'}`}>
              {table.name}
            </div>
            <div>
              <p className="font-black text-gray-900 leading-tight">{table.zone?.name || 'Main Hall'}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cap: {table.capacity}</p>
            </div>
          </div>
          {isActive && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 rounded-full text-[10px] font-black border border-red-100">
              <Clock size={10} />
               {elapsed}
            </div>
          )}
        </div>

        {isActive ? (
          <div className="space-y-4">
            <div className="flex justify-between items-end">
               <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Guests</p>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(6, activeOrder.guestCount) }).map((_, i) => (
                       <Users key={i} size={12} className="text-orange-400" />
                    ))}
                    {activeOrder.guestCount > 6 && <span className="text-[10px] font-bold text-orange-400">+{activeOrder.guestCount - 6}</span>}
                  </div>
               </div>
               <div className="text-right">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Bill</p>
                  <p className="text-lg font-black text-gray-900">฿{new Intl.NumberFormat('th-TH').format(activeOrder.totalAmount || 0)}</p>
               </div>
            </div>
            <div className="pt-4 border-t border-red-50 flex gap-2">
               <button 
                onClick={() => window.location.href = `/pos?tableId=${table.id}`}
                className="flex-1 py-2.5 bg-gray-900 text-white rounded-xl font-bold text-xs hover:bg-black transition-colors"
               >
                 View Order
               </button>
               <button className="p-2.5 bg-gray-50 text-gray-400 hover:text-red-500 rounded-xl transition-colors">
                  <MoreHorizontal size={16} />
               </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-6 text-gray-300">
            <CheckCircle2 size={32} className="mb-2 opacity-20" />
            <p className="text-xs font-bold uppercase tracking-widest">Ready for Guest</p>
          </div>
        )}
      </div>
    </div>
  )
}
