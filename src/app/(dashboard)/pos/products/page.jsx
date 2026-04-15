'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, Package, Tags, DollarSign, Loader2, Link2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import DataTable from '@/components/ui/DataTable'
import RecipeLinker from '@/components/pos/RecipeLinker'

/**
 * ProductsPage — Back-office Product Management (FEAT08)
 */
export default function ProductsPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLinking, setIsLinking] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    basePrice: 0,
    posPrice: null,
    description: '',
    isPosVisible: true,
    isActive: true
  })

  useEffect(() => {
    fetchProducts()
  }, [])

  async function fetchProducts() {
    try {
      setLoading(true)
      const res = await fetch('/api/products?limit=200&isActive=all')
      const json = await res.json()
      setProducts(json.data.products || [])
    } catch (err) {
      console.error('Failed to fetch products', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    const method = selectedProduct ? 'PUT' : 'POST'
    const url = selectedProduct ? `/api/products/${selectedProduct.id}` : '/api/products'

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      if (res.ok) {
        setIsModalOpen(false)
        fetchProducts()
      } else {
        const err = await res.json()
        alert(`Error: ${err.error}`)
      }
    } catch (err) {
      console.error('Save failed', err)
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { key: 'name', label: 'Product Name', render: (val, row) => (
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
          <Package size={20} />
        </div>
        <div>
          <p className="font-medium text-gray-900">{val}</p>
          <p className="text-xs text-gray-400">{row.sku}</p>
        </div>
      </div>
    )},
    { key: 'category', label: 'Category', render: (val) => <Badge variant="gray">{val}</Badge> },
    { key: 'basePrice', label: 'Base Price', render: (val) => `฿${(val || 0).toLocaleString()}` },
    { key: 'isPosVisible', label: 'POS', render: (val) => val ? <Badge variant="green">Visible</Badge> : <Badge variant="gray">Hidden</Badge> },
    { key: 'isActive', label: 'Status', render: (val) => val ? <Badge variant="green">Active</Badge> : <Badge variant="red">Inactive</Badge> },
    { key: 'actions', label: '', render: (_, row) => (
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => {
          setSelectedProduct(row)
          setFormData({
            name: row.name || '',
            category: row.category || '',
            basePrice: row.basePrice || 0,
            posPrice: row.posPrice,
            description: row.description || '',
            isPosVisible: row.isPosVisible ?? true,
            isActive: row.isActive ?? true
          })
          setIsModalOpen(true)
          setIsLinking(false)
        }}>
          <Edit2 size={16} />
        </Button>
        <Button variant="ghost" size="sm" onClick={async () => {
           setLoading(true)
           const res = await fetch(`/api/products/${row.id}?includeRecipes=true`)
           const json = await res.json()
           setSelectedProduct(json.data)
           setLoading(false)
           setIsModalOpen(true)
           setIsLinking(true)
        }} className="text-indigo-600 hover:text-indigo-700">
          <Link2 size={16} />
        </Button>
      </div>
    )}
  ]

  const filtered = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.category.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Product Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your menu items, pricing, and recipe links for POS and Kitchen.</p>
        </div>
        <Button onClick={() => {
          setSelectedProduct(null)
          setFormData({ name: '', category: '', basePrice: 0, posPrice: null, description: '', isPosVisible: true, isActive: true })
          setIsModalOpen(true)
          setIsLinking(false)
        }} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200">
          <Plus className="mr-2 h-4 w-4" /> Add Product
        </Button>
      </div>

      <div className="relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4 group-focus-within:text-indigo-500 transition-colors" />
        <Input 
          placeholder="Search products by name or category..." 
          className="pl-10 h-11 bg-white border-gray-200 focus:border-indigo-500 transition-all"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <DataTable 
          columns={columns} 
          rows={filtered} 
          loading={loading}
          emptyTitle="No products found"
          emptyDescription="Try adjusting your search or add a new product."
          className="border-none"
        />
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title={isLinking ? 'Product Recipes' : (selectedProduct ? 'Edit Product' : 'Add New Product')}
      >
        {isLinking ? (
          <div className="space-y-6">
            <div className="bg-indigo-50 p-4 rounded-xl flex items-center gap-3">
              <div className="h-10 w-10 bg-white rounded-lg flex items-center justify-center text-indigo-600 shadow-sm">
                <Package size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{selectedProduct?.name}</p>
                <p className="text-xs text-indigo-600 uppercase font-bold tracking-wider">{selectedProduct?.category}</p>
              </div>
            </div>
            
            <RecipeLinker 
              product={selectedProduct} 
              onUpdate={async () => {
                const res = await fetch(`/api/products/${selectedProduct.id}?includeRecipes=true`)
                const json = await res.json()
                setSelectedProduct(json.data)
                fetchProducts()
              }} 
            />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input 
              label="Product Name" 
              placeholder="e.g. Classic Margherita Pizza"
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
              required 
            />
            
            <div className="grid grid-cols-2 gap-4">
              <Input 
                label="Category" 
                placeholder="e.g. Food"
                value={formData.category} 
                onChange={e => setFormData({...formData, category: e.target.value})} 
                required 
              />
              <Input 
                label="Base Price (฿)" 
                type="number" 
                value={formData.basePrice} 
                onChange={e => setFormData({...formData, basePrice: parseFloat(e.target.value)})} 
                required 
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Description</label>
              <textarea 
                className="w-full rounded-xl border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm p-3 min-h-[100px]"
                placeholder="Add some details about this product..."
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
              />
            </div>
            
            <div className="flex items-center gap-8 py-3 px-4 bg-gray-50 rounded-xl">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={formData.isPosVisible} 
                  onChange={e => setFormData({...formData, isPosVisible: e.target.checked})} 
                  className="h-5 w-5 rounded-md text-indigo-600 border-gray-300 focus:ring-indigo-500 transition-all" 
                />
                <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Visible in POS</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={formData.isActive} 
                  onChange={e => setFormData({...formData, isActive: e.target.checked})} 
                  className="h-5 w-5 rounded-md text-indigo-600 border-gray-300 focus:ring-indigo-500 transition-all" 
                />
                <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Active</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t mt-4">
              <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button 
                type="submit" 
                disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px]"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (selectedProduct ? 'Save Changes' : 'Create Product')}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
