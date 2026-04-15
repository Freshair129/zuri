'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, Tags, Loader2, Package, ArrowDownToLine, Calendar, AlertCircle, TrendingDown } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import DataTable from '@/components/ui/DataTable'

/**
 * IngredientsPage — Kitchen Master Data & Goods Receipt (FEAT08)
 */
export default function IngredientsPage() {
  const [ingredients, setIngredients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLotModalOpen, setIsLotModalOpen] = useState(false)
  const [selectedIngredient, setSelectedIngredient] = useState(null)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    unit: 'g',
    minStock: 0,
    ingredientId: '',
    isActive: true
  })

  useEffect(() => {
    fetchIngredients()
  }, [])

  async function fetchIngredients() {
    try {
      setLoading(true)
      const res = await fetch('/api/kitchen/ingredients')
      const json = await res.json()
      setIngredients(json.data || [])
    } catch (err) {
      console.error('Failed to fetch ingredients', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    const method = selectedIngredient ? 'PUT' : 'POST'
    const url = selectedIngredient 
      ? `/api/kitchen/ingredients/${selectedIngredient.id}` 
      : '/api/kitchen/ingredients'

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      if (res.ok) {
        setIsModalOpen(false)
        fetchIngredients()
      }
    } catch (err) {
      console.error('Save failed', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleAddLot(e) {
    e.preventDefault()
    setSaving(true)
    const data = {
      lotId: e.target.lotId.value,
      initialQty: parseFloat(e.target.initialQty.value),
      expiresAt: e.target.expiresAt.value
    }

    try {
      const res = await fetch(`/api/kitchen/ingredients/${selectedIngredient.id}/lots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (res.ok) {
        setIsLotModalOpen(false)
        fetchIngredients()
      }
    } catch (err) {
      console.error('GR failed', err)
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { key: 'name', label: 'Ingredient', render: (val, row) => (
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
          <Tags size={20} />
        </div>
        <div>
          <p className="font-medium text-gray-900">{val}</p>
          <p className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">{row.ingredientId}</p>
        </div>
      </div>
    )},
    { key: 'currentStock', label: 'Stock', render: (val, row) => (
      <div className="flex flex-col">
        <span className={`font-bold tabular-nums ${val < row.minStock ? 'text-red-600' : 'text-gray-900'}`}>
          {val.toLocaleString()} {row.unit}
        </span>
        {val < row.minStock && (
          <span className="text-[10px] text-red-500 font-bold flex items-center gap-0.5">
            <TrendingDown size={10} /> LOW STOCK
          </span>
        )}
      </div>
    )},
    { key: 'minStock', label: 'Min', render: (val, row) => `${val} ${row.unit}` },
    { key: 'isActive', label: 'Status', render: (val) => val ? <Badge variant="green">Active</Badge> : <Badge variant="gray">Inactive</Badge> },
    { key: 'actions', label: '', render: (_, row) => (
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => {
          setSelectedIngredient(row)
          setFormData({
            name: row.name,
            unit: row.unit,
            minStock: row.minStock,
            ingredientId: row.ingredientId,
            isActive: row.isActive
          })
          setIsModalOpen(true)
        }}>
          <Edit2 size={16} />
        </Button>
        <Button variant="outline" size="sm" onClick={() => {
          setSelectedIngredient(row)
          setIsLotModalOpen(true)
        }} className="text-orange-600 border-orange-100 hover:bg-orange-50">
          <ArrowDownToLine size={16} className="mr-1.5" /> Receipt
        </Button>
      </div>
    )}
  ]

  const filtered = ingredients.filter(i => 
    i.name.toLowerCase().includes(search.toLowerCase()) || 
    i.ingredientId.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Ingredient Management</h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">Master list of ingredients and goods receipt entry.</p>
        </div>
        <Button onClick={() => {
          setSelectedIngredient(null)
          setFormData({ name: '', unit: 'g', minStock: 0, ingredientId: '', isActive: true })
          setIsModalOpen(true)
        }} className="bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-100 font-bold">
          <Plus className="mr-2 h-4 w-4" /> Add Ingredient
        </Button>
      </div>

      <div className="relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4 group-focus-within:text-orange-500 transition-colors" />
        <Input 
          placeholder="Search ingredients by name or ID..." 
          className="pl-10 h-11 border-gray-200 focus:border-orange-500 transition-all"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <DataTable 
          columns={columns} 
          rows={filtered} 
          loading={loading}
          emptyTitle="No ingredients found"
          emptyDescription="Add your first ingredient to start tracking stock."
          className="border-none"
        />
      </div>

      {/* Add/Edit Ingredient Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title={selectedIngredient ? 'Edit Ingredient' : 'New Ingredient'}
      >
        <form onSubmit={handleSubmit} className="p-1 space-y-4">
          <Input 
            label="Ingredient Name" 
            placeholder="e.g. Premium Flour"
            value={formData.name} 
            onChange={e => setFormData({...formData, name: e.target.value})} 
            required 
          />
          
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Unit" 
              placeholder="e.g. g, kg, ml, unit"
              value={formData.unit} 
              onChange={e => setFormData({...formData, unit: e.target.value})} 
              required 
            />
            <Input 
              label="Min Stock (Reorder Point)" 
              type="number" 
              value={formData.minStock} 
              onChange={e => setFormData({...formData, minStock: parseFloat(e.target.value)})} 
            />
          </div>

          <Input 
            label="Internal ID (optional)" 
            placeholder="e.g. ING-FLOUR-001"
            value={formData.ingredientId} 
            onChange={e => setFormData({...formData, ingredientId: e.target.value})} 
          />
          
          <div className="flex items-center gap-3 py-3 px-4 bg-gray-50 rounded-xl">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={formData.isActive} 
                onChange={e => setFormData({...formData, isActive: e.target.checked})} 
                className="h-5 w-5 rounded-md text-orange-600 border-gray-300 focus:ring-orange-500 transition-all" 
              />
              <span className="text-sm font-semibold text-gray-700">Active / Available</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t mt-4">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button 
              type="submit" 
              disabled={saving}
              className="bg-orange-500 hover:bg-orange-600 text-white min-w-[120px] font-bold"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (selectedIngredient ? 'Save Changes' : 'Create Ingredient')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Goods Receipt (Add Lot) Modal */}
      <Modal 
        isOpen={isLotModalOpen} 
        onClose={() => setIsLotModalOpen(false)}
        title="Goods Receipt (Add Stock)"
      >
        <form onSubmit={handleAddLot} className="p-1 space-y-4">
          <div className="bg-orange-50 p-4 rounded-xl flex items-center gap-3 border border-orange-100">
            <div className="h-10 w-10 bg-white rounded-lg flex items-center justify-center text-orange-600 shadow-sm">
              <Package size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">{selectedIngredient?.name}</p>
              <p className="text-xs text-orange-600 font-bold uppercase tracking-widest">Base Unit: {selectedIngredient?.unit}</p>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <Input 
              name="lotId"
              label="Lot ID / Batch Number" 
              placeholder="e.g. LOT-2023-12-001"
              required 
            />
            
            <div className="grid grid-cols-2 gap-4">
              <Input 
                name="initialQty"
                label={`Quantity (${selectedIngredient?.unit})`} 
                type="number" 
                step="0.01"
                required 
              />
              <Input 
                name="expiresAt"
                label="Expiry Date" 
                type="date" 
                required 
              />
            </div>

            <div className="bg-amber-50 p-3 rounded-lg flex items-start gap-2 border border-amber-100">
              <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-700 leading-relaxed">
                Adding stock will create a new tracked lot. The system will automatically deduct from the earliest expiring lot first (FEFO).
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t mt-4">
            <Button variant="ghost" type="button" onClick={() => setIsLotModalOpen(false)}>Cancel</Button>
            <Button 
              type="submit" 
              disabled={saving}
              className="bg-orange-500 hover:bg-orange-600 text-white min-w-[140px] font-bold"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Receipt'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
