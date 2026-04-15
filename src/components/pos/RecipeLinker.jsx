'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Link as LinkIcon, Unlink, Loader2, Package, Tags, DollarSign } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'

/**
 * RecipeLinker — Component to manage product ↔ recipe mapping
 */
export default function RecipeLinker({ product, onUpdate }) {
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(false)
  const [linking, setLinking] = useState(null) // recipeId being linked/unlinked

  const currentRecipeIds = new Set(product.recipes?.map(pr => pr.recipeId) || [])

  useEffect(() => {
    fetchRecipes()
  }, [])

  async function fetchRecipes() {
    try {
      setLoading(true)
      const res = await fetch('/api/kitchen/recipes?limit=100')
      const json = await res.json()
      setRecipes(json.data || [])
    } catch (err) {
      console.error('Failed to fetch recipes', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleLink(recipeId) {
    try {
      setLinking(recipeId)
      const res = await fetch(`/api/products/${product.id}/recipes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeId, order: 0 })
      })
      if (res.ok) onUpdate()
    } catch (err) {
      console.error('Link failed', err)
    } finally {
      setLinking(null)
    }
  }

  async function handleUnlink(recipeId) {
    try {
      setLinking(recipeId)
      const res = await fetch(`/api/products/${product.id}/recipes?recipeId=${recipeId}`, {
        method: 'DELETE'
      })
      if (res.ok) onUpdate()
    } catch (err) {
      console.error('Unlink failed', err)
    } finally {
      setLinking(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Linked Recipes</h3>
        <Badge variant="indigo">{currentRecipeIds.size} linked</Badge>
      </div>

      <div className="max-h-60 overflow-y-auto border rounded-xl divide-y">
        {loading ? (
          <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-gray-400" /></div>
        ) : recipes.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">No recipes found.</div>
        ) : (
          recipes.map(recipe => {
            const isLinked = currentRecipeIds.has(recipe.id)
            const isProcessing = linking === recipe.id

            return (
              <div key={recipe.id} className="p-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-gray-900">{recipe.name}</p>
                  <p className="text-xs text-gray-400">{recipe.category || 'Uncategorized'}</p>
                </div>
                <Button
                  variant={isLinked ? 'outline' : 'ghost'}
                  size="sm"
                  onClick={() => isLinked ? handleUnlink(recipe.id) : handleLink(recipe.id)}
                  disabled={!!linking}
                  className={isLinked ? 'text-red-500 hover:bg-red-50' : 'text-indigo-600'}
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isLinked ? (
                    <><Unlink className="h-4 w-4 mr-1.5" /> Unlink</>
                  ) : (
                    <><LinkIcon className="h-4 w-4 mr-1.5" /> Link</>
                  )}
                </Button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
