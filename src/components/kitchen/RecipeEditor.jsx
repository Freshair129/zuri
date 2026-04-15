'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Loader2, Search, ChefHat, Utensils, ListChecks } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'

/**
 * RecipeEditor — Advanced form for creating/editing recipes with ingredients and instructions
 */
export default function RecipeEditor({ recipe, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: '',
    category: 'Mains',
    yieldAmount: '',
    yieldUnit: 'portions',
    description: '',
    instructions: [],
    ingredients: []
  })
  
  const [ingredientsList, setIngredientsList] = useState([])
  const [loadingIngredients, setLoadingIngredients] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchIngredients()
    if (recipe) {
      setForm({
        name: recipe.name || '',
        category: recipe.category || 'Mains',
        yieldAmount: recipe.yieldAmount || '',
        yieldUnit: recipe.yieldUnit || 'portions',
        description: recipe.description || '',
        instructions: Array.isArray(recipe.instructions) ? recipe.instructions : [],
        ingredients: recipe.ingredients?.map(ri => ({
          ingredientId: ri.ingredientId,
          name: ri.ingredient?.name || 'Unknown',
          qty: ri.qty,
          unit: ri.unit,
          note: ri.note || ''
        })) || []
      })
    }
  }, [recipe])

  async function fetchIngredients() {
    try {
      setLoadingIngredients(true)
      const res = await fetch('/api/kitchen/ingredients')
      const json = await res.json()
      setIngredientsList(json.data || [])
    } catch (err) {
      console.error('Failed to fetch ingredients', err)
    } finally {
      setLoadingIngredients(false)
    }
  }

  const addIngredient = (ing) => {
    if (form.ingredients.some(i => i.ingredientId === ing.id)) return
    setForm(f => ({
      ...f,
      ingredients: [...f.ingredients, { 
        ingredientId: ing.id, 
        name: ing.name, 
        qty: 1, 
        unit: ing.unit, 
        note: '' 
      }]
    }))
  }

  const removeIngredient = (id) => {
    setForm(f => ({
      ...f,
      ingredients: f.ingredients.filter(i => i.ingredientId !== id)
    }))
  }

  const updateIngredient = (id, field, value) => {
    setForm(f => ({
      ...f,
      ingredients: f.ingredients.map(i => i.ingredientId === id ? { ...i, [field]: value } : i)
    }))
  }

  const addInstruction = () => {
    setForm(f => ({
      ...f,
      instructions: [...f.instructions, { step: f.instructions.length + 1, text: '' }]
    }))
  }

  const updateInstruction = (index, text) => {
    setForm(f => ({
      ...f,
      instructions: f.instructions.map((ins, i) => i === index ? { ...ins, text } : ins)
    }))
  }

  const removeInstruction = (index) => {
    setForm(f => ({
      ...f,
      instructions: f.instructions.filter((_, i) => i !== index).map((ins, i) => ({ ...ins, step: i + 1 }))
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError('กรุณาใส่ชื่อสูตร'); return }
    setSaving(true); setError(null)

    const method = recipe ? 'PATCH' : 'POST'
    const url = recipe ? `/api/culinary/recipes/${recipe.id}` : '/api/culinary/recipes'

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          yieldAmount: form.yieldAmount ? Number(form.yieldAmount) : undefined
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'บันทึกสูตรอาหารไม่ได้')
      onSaved(json.data)
      onClose()
    } catch (err) {
      console.error('[RecipeEditor] save', err)
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[85vh] overflow-y-auto custom-scrollbar">
      {/* Basic Info */}
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Recipe Name</label>
          <input 
            type="text" 
            value={form.name} 
            onChange={e => setForm({...form, name: e.target.value})} 
            placeholder="e.g. Traditional Pad Thai" 
            autoFocus
            className="w-full px-4 py-2.5 text-base border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400/50 transition-all" 
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Category</label>
            <select 
              value={form.category} 
              onChange={e => setForm({...form, category: e.target.value})}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400/50 appearance-none bg-white"
            >
              {['Appetizers','Mains','Desserts','Pastry','Sauces','Beverages'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Yield</label>
            <div className="flex gap-2">
              <input 
                type="number" 
                value={form.yieldAmount} 
                onChange={e => setForm({...form, yieldAmount: e.target.value})} 
                placeholder="4" 
                min="0"
                className="w-20 px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400/50" 
              />
              <input 
                type="text" 
                value={form.yieldUnit} 
                onChange={e => setForm({...form, yieldUnit: e.target.value})} 
                placeholder="portions"
                className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400/50" 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Ingredients Picker */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Ingredients</label>
          <Badge variant="orange">{form.ingredients.length} items</Badge>
        </div>
        
        <div className="border border-gray-100 rounded-2xl overflow-hidden bg-gray-50/50">
          {form.ingredients.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {form.ingredients.map((ing) => (
                <div key={ing.ingredientId} className="p-3 bg-white flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">{ing.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      value={ing.qty} 
                      onChange={e => updateIngredient(ing.ingredientId, 'qty', parseFloat(e.target.value))}
                      className="w-16 px-2 py-1 text-sm border border-gray-200 rounded-lg text-center focus:ring-1 focus:ring-orange-400"
                    />
                    <span className="text-xs text-gray-500 w-10">{ing.unit}</span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => removeIngredient(ing.ingredientId)}
                    className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-gray-400">No ingredients added yet.</div>
          )}
          
          <div className="p-3 bg-white border-t border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select 
                onChange={e => {
                  const ing = ingredientsList.find(i => i.id === e.target.value)
                  if (ing) addIngredient(ing)
                  e.target.value = ""
                }}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400/20 bg-gray-50/50 appearance-none"
              >
                <option value="">+ Add Ingredient...</option>
                {ingredientsList.map(ing => (
                  <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Instructions</label>
          <button 
            type="button" 
            onClick={addInstruction}
            className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
          >
            <Plus size={14} /> ADD STEP
          </button>
        </div>

        <div className="space-y-3">
          {form.instructions.map((ins, idx) => (
            <div key={idx} className="flex gap-3 items-start group">
              <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500 shrink-0 mt-1">
                {ins.step}
              </div>
              <textarea 
                value={ins.text}
                onChange={e => updateInstruction(idx, e.target.value)}
                placeholder={`Step ${ins.step} details...`}
                rows={2}
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400/50 resize-none transition-all"
              />
              <button 
                type="button" 
                onClick={() => removeInstruction(idx)}
                className="p-1.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {form.instructions.length === 0 && (
            <div className="p-8 text-center text-sm text-gray-400 border border-dashed border-gray-200 rounded-2xl">
              No instructions added.
            </div>
          )}
        </div>
      </div>

      {error && <p className="text-xs text-red-500 bg-red-50 p-3 rounded-lg border border-red-100">{error}</p>}

      <div className="flex gap-3 pt-4 border-t sticky bottom-0 bg-white pb-2">
        <Button variant="ghost" type="button" onClick={onClose} className="flex-1">Cancel</Button>
        <Button 
          type="submit" 
          disabled={saving} 
          className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-lg shadow-orange-100"
        >
          {saving ? <Loader2 className="animate-spin h-5 w-5" /> : (recipe ? 'Update Recipe' : 'Create Recipe')}
        </Button>
      </div>
    </form>
  )
}
