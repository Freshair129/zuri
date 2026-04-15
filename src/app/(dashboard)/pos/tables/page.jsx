'use client'

import { useState, useEffect } from 'react'
import { 
  Plus, MapPin, Grid, Settings, Loader2, 
  Trash2, Edit2, Check, X, Layers,
  Square, Circle, MoreHorizontal
} from 'lucide-react'

// --- Table Model Defaults ---
const SHAPES = [
  { key: 'rect', label: 'สี่เหลี่ยม', icon: Square },
  { key: 'circle', label: 'วงกลม', icon: Circle },
]

export default function TableManagementPage() {
  const [activeTab, setActiveTab] = useState('floor') // floor | zones
  const [loading, setLoading] = useState(true)
  const [zones, setZones] = useState([])
  const [tables, setTables] = useState([])
  const [selectedZone, setSelectedZone] = useState('all')

  // --- Modal / Form State ---
  const [showTableModal, setShowTableModal] = useState(false)
  const [showZoneModal, setShowZoneModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)

  // --- Fetch Data ---
  const fetchData = async () => {
    setLoading(true)
    try {
      const [zRes, tRes] = await Promise.all([
        fetch('/api/pos/zones'),
        fetch('/api/pos/tables?includeExtra=true')
      ])
      const zJson = await zRes.json()
      const tJson = await tRes.json()
      setZones(zJson.data || [])
      setTables(tJson.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  // --- Handlers ---
  const handleSaveTable = async (data) => {
    try {
      const method = editingItem ? 'POST' : 'POST' // Both use POST/tables in our API
      const res = await fetch('/api/pos/tables', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingItem ? { ...data, id: editingItem.id } : data)
      })
      if (res.ok) {
        setShowTableModal(false)
        setEditingItem(null)
        fetchData()
      }
    } catch (err) { console.error(err) }
  }

  const handleSaveZone = async (data) => {
    try {
      const res = await fetch('/api/pos/zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingItem ? { ...data, id: editingItem.id } : data)
      })
      if (res.ok) {
        setShowZoneModal(false)
        setEditingItem(null)
        fetchData()
      }
    } catch (err) { console.error(err) }
  }

  const handleDeleteItem = async (type, id) => {
    if (!window.confirm('ยืนยันการลบรายการนี้?')) return
    try {
      const url = type === 'table' ? '/api/pos/tables' : '/api/pos/zones'
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'delete' })
      })
      if (res.ok) fetchData()
    } catch (err) { console.error(err) }
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Table Management</h1>
          <p className="text-sm text-gray-500">จัดการผังโต๊ะ โซนที่นั่ง และพื้นที่บริการ</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'floor' ? (
            <button 
              onClick={() => { setEditingItem(null); setShowTableModal(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-100"
            >
              <Plus size={18} />
              เพิ่มโต๊ะ
            </button>
          ) : (
            <button 
              onClick={() => { setEditingItem(null); setShowZoneModal(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
            >
              <Plus size={18} />
              เพิ่มโซน
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white p-1 rounded-2xl border border-gray-100 w-fit">
        <button 
          onClick={() => setActiveTab('floor')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'floor' ? 'bg-orange-50 text-orange-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <Grid size={18} />
          ผังโต๊ะ (Floor Plan)
        </button>
        <button 
          onClick={() => setActiveTab('zones')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'zones' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <MapPin size={18} />
          จัดการโซน (Zones)
        </button>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="animate-spin text-orange-500" size={40} />
        </div>
      ) : activeTab === 'floor' ? (
        <div className="space-y-4">
          {/* Zone Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button 
              onClick={() => setSelectedZone('all')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${selectedZone === 'all' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-200'}`}
            >
              ทั้งหมด
            </button>
            {zones.map(z => (
              <button 
                key={z.id}
                onClick={() => setSelectedZone(z.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${selectedZone === z.id ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-500 border-gray-200'}`}
              >
                {z.name}
              </button>
            ))}
          </div>

          {/* Grid View */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {tables
              .filter(t => selectedZone === 'all' || t.zoneId === selectedZone)
              .map(table => (
                <div key={table.id} className="group relative bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:border-orange-300 hover:shadow-md transition-all text-center">
                   <div className={`mx-auto mb-3 w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${table.status === 'OCCUPIED' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                    {table.shape === 'circle' ? <Circle size={24} /> : <Square size={24} />}
                   </div>
                   <h3 className="font-black text-gray-900">{table.name}</h3>
                   <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">Capacity: {table.capacity}</p>
                   <div className="flex items-center justify-center gap-1 mt-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${table.status === 'OCCUPIED' ? 'bg-red-500' : 'bg-green-500'}`} />
                    <span className="text-[9px] font-bold text-gray-500">{table.status}</span>
                   </div>

                   {/* Actions Overlay */}
                   <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => { setEditingItem(table); setShowTableModal(true); }}
                        className="p-1.5 bg-gray-50 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button 
                        onClick={() => handleDeleteItem('table', table.id)}
                        className="p-1.5 bg-gray-50 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg ml-1"
                      >
                        <Trash2 size={12} />
                      </button>
                   </div>
                </div>
              ))}
          </div>
        </div>
      ) : (
        /* Zones List view */
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {zones.map(zone => (
            <div key={zone.id} className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: zone.color }}>
                      <MapPin size={20} />
                    </div>
                    <div>
                      <h3 className="font-black text-gray-900">{zone.name}</h3>
                      <p className="text-xs text-gray-400">ชั้นที่ {zone.floor}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => { setEditingItem(zone); setShowZoneModal(true); }}
                      className="p-2 bg-gray-50 text-gray-400 hover:text-blue-600 rounded-xl"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDeleteItem('zone', zone.id)}
                      className="p-2 bg-gray-50 text-gray-400 hover:text-red-600 rounded-xl"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 flex justify-between items-center text-sm">
                  <span className="text-gray-500">จำนวนโต๊ะในโซน</span>
                  <span className="font-bold text-gray-900">{tables.filter(t => t.zoneId === zone.id).length}</span>
                </div>
            </div>
          ))}
        </div>
      )}

      {/* --- Table Modal --- */}
      {showTableModal && (
        <TableFormModal 
          item={editingItem} 
          zones={zones}
          onClose={() => setShowTableModal(false)} 
          onSave={handleSaveTable}
        />
      )}

      {/* --- Zone Modal --- */}
      {showZoneModal && (
        <ZoneFormModal 
          item={editingItem} 
          onClose={() => setShowZoneModal(false)} 
          onSave={handleSaveZone}
        />
      )}
    </div>
  )
}

function TableFormModal({ item, zones, onClose, onSave }) {
  const [name, setName] = useState(item?.name || '')
  const [capacity, setCapacity] = useState(item?.capacity || 4)
  const [shape, setShape] = useState(item?.shape || 'rect')
  const [zoneId, setZoneId] = useState(item?.zoneId || (zones[0]?.id || ''))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-slide-up">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">{item ? 'แก้ไขข้อมูลโต๊ะ' : 'เพิ่มโต๊ะใหม่'}</h2>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"><X size={20} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">ชื่อโต๊ะ</label>
            <input 
              value={name} onChange={e => setName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none font-bold"
              placeholder="เช่น T-01, VIP-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">จำนวนที่นั่ง</label>
              <input 
                type="number" value={capacity} onChange={e => setCapacity(parseInt(e.target.value))}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">รูปทรง</label>
              <select 
                value={shape} onChange={e => setShape(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none font-bold appearance-none"
              >
                {SHAPES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">โซน / ห้อง</label>
            <select 
              value={zoneId} onChange={e => setZoneId(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none font-bold appearance-none"
            >
              {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
          </div>
          <button 
            onClick={() => onSave({ name, capacity, shape, zoneId })}
            className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black text-lg shadow-lg shadow-orange-100 mt-4 active:scale-95 transition-all"
          >
            บันทึกข้อมูล
          </button>
        </div>
      </div>
    </div>
  )
}

function ZoneFormModal({ item, onClose, onSave }) {
  const [name, setName] = useState(item?.name || '')
  const [floor, setFloor] = useState(item?.floor || 1)
  const [color, setColor] = useState(item?.color || '#f97316')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 animate-slide-up">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">{item ? 'แก้ไขข้อมูลโซน' : 'เพิ่มโซนใหม่'}</h2>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"><X size={20} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">ชื่อโซน</label>
            <input 
              value={name} onChange={e => setName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
              placeholder="เช่น ห้อง VIP, โซนกลาง"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">ชั้น (Floor)</label>
            <input 
              type="number" value={floor} onChange={e => setFloor(parseInt(e.target.value))}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">สีสัญลักษณ์</label>
            <div className="flex gap-3">
              <input 
                type="color" value={color} onChange={e => setColor(e.target.value)}
                className="w-12 h-12 rounded-xl p-1 bg-white border border-gray-200 cursor-pointer flex-shrink-0"
              />
              <input 
                value={color} onChange={e => setColor(e.target.value)}
                className="flex-1 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-mono text-sm"
              />
            </div>
          </div>
          <button 
            onClick={() => onSave({ name, floor, color })}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-100 mt-4 active:scale-95 transition-all"
          >
            บันทึกข้อมูล
          </button>
        </div>
      </div>
    </div>
  )
}
