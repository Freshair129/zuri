'use client'

import { useState, useEffect } from 'react'
import { Utensils, ChefHat, Plus, CheckCircle, TrendingUp } from 'lucide-react'
import { motion } from 'framer-motion'

export default function KitchenPage() {
  const [activeFilter, setActiveFilter] = useState('All Recipes')
  const [stockLevels, setStockLevels] = useState([])
  const [recipes, setRecipes] = useState([])
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)

  const filters = ['All Recipes', 'Signatures', 'Soups', 'Curries']

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const [stockRes, recipeRes, scheduleRes] = await Promise.all([
          fetch('/api/kitchen/ingredients?lowStockOnly=true'),
          fetch('/api/culinary/recipes?limit=4'),
          fetch('/api/culinary/schedules?limit=5')
        ])

        if (stockRes.ok) {
          const json = await stockRes.json()
          setStockLevels(json.data || [])
        }
        if (recipeRes.ok) {
          const json = await recipeRes.json()
          setRecipes(json.data || [])
        }
        if (scheduleRes.ok) {
          const json = await scheduleRes.json()
          setSchedules(json.data || [])
        }
      } catch (error) {
        console.error('Failed to fetch kitchen data', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const barHeights = [60, 80, 45, 95, 55, 85, 70]

  return (
    <div className="px-6 md:px-12 py-8 pb-12 max-w-7xl mx-auto">
      {/* Page header */}
      <header className="mb-10">
        <span className="font-label uppercase tracking-[0.2em] text-xs text-orange-600 font-bold">
          Kitchen Intelligence
        </span>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 mt-2 mb-4">
          Kitchen Command Center
        </h1>
        <p className="text-gray-500 max-w-2xl text-lg leading-relaxed">
          Manage your culinary heritage with precision. Real-time stock monitoring paired with
          high-end recipe documentation for the culinary school.
        </p>
      </header>

      {/* Top stats row */}
      <div className="grid grid-cols-12 gap-6 mb-12">
        {/* Live Stock Inventory */}
        <div className="col-span-12 xl:col-span-7">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 h-full">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h4 className="font-bold uppercase tracking-widest text-xs text-orange-600 mb-1">
                  Critical Stock Inventory
                </h4>
                <p className="text-xs text-gray-400">Items requiring immediate attention</p>
              </div>
              <div className="h-10 w-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500">
                <Utensils className="h-6 w-6" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-12 bg-gray-50 rounded-lg animate-pulse" />
                ))
              ) : stockLevels.length === 0 ? (
                <div className="col-span-2 py-4 flex items-center gap-2 text-green-600 bg-green-50 px-4 rounded-xl border border-green-100">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-sm font-medium">All stock levels are optimal</span>
                </div>
              ) : (
                stockLevels.map((item) => (
                  <div key={item.id} className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-gray-700 truncate">{item.name}</span>
                      <span className="text-orange-600">
                        {item.currentStock} {item.unit}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((item.currentStock / (item.minStock || 10)) * 100, 100)}%` }}
                        className="h-full bg-orange-500" 
                      />
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-gray-50 flex justify-end">
              <button className="px-6 py-2.5 rounded-xl font-bold bg-orange-50 text-orange-600 text-[10px] uppercase tracking-widest hover:bg-orange-100 transition-colors">
                View All Inventory
              </button>
            </div>
          </div>
        </div>

        {/* Upcoming Classes / Kitchen Prep */}
        <div className="col-span-12 xl:col-span-5">
          <div className="bg-gray-900 p-8 rounded-2xl shadow-xl h-full flex flex-col text-white">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h4 className="font-bold uppercase tracking-widest text-xs text-orange-400 mb-1">
                  Upcoming Classes
                </h4>
                <p className="text-xs text-gray-400">Today and Tomorrow</p>
              </div>
              < ChefHat className="h-8 w-8 text-orange-500" />
            </div>

            <div className="space-y-4 flex-1">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />
                ))
              ) : schedules.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No scheduled sessions</p>
              ) : (
                schedules.map((session) => (
                  <div key={session.id} className="flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                    <div className="h-10 w-10 rounded-lg bg-orange-500/20 flex flex-col items-center justify-center text-[10px] font-bold">
                      <span className="text-orange-400">{new Date(session.scheduledDate).getDate()}</span>
                      <span className="text-white uppercase">{new Date(session.scheduledDate).toLocaleString('default', { month: 'short' })}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold truncate">{session.product?.name || 'Class Session'}</p>
                      <p className="text-[10px] text-gray-400">{session.startTime} - {session.endTime} &bull; {session.status}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 flex items-center justify-between pt-4 border-t border-white/10">
              <div className="flex items-center gap-2 text-xs font-bold text-orange-400">
                <TrendingUp className="h-4 w-4" />
                <span>+15% Efficiency</span>
              </div>
              <button className="text-xs font-bold hover:text-orange-400 transition-colors">Manage Schedule</button>
            </div>
          </div>
        </div>
      </div>

      {/* Recipe Repository */}
      <section>
        <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-8">
          <div className="w-full md:w-auto">
            <h3 className="text-2xl font-bold mb-2">Recipe Repository</h3>
            <div className="flex gap-2 flex-wrap">
              {filters.map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${
                    activeFilter === f
                      ? 'bg-gray-900 text-white scale-105'
                      : 'bg-white border border-gray-100 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="relative w-full md:w-80">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 bg-gray-300 rounded-sm" />
            <input
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
              placeholder="Search culinary archives..."
              type="text"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading ? (
             Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
            ))
          ) : recipes.length === 0 ? (
            <div className="col-span-4 py-20 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
               <Utensils className="h-10 w-10 text-gray-300 mx-auto mb-2" />
               <p className="text-gray-500 text-sm">No recipes found in the library</p>
            </div>
          ) : (
            recipes.map((recipe) => (
              <div
                key={recipe.id}
                className="bg-white rounded-2xl overflow-hidden group border border-gray-100 hover:shadow-xl transition-all cursor-pointer"
              >
                <div className="h-40 overflow-hidden relative bg-orange-50">
                  {recipe.imageUrl ? (
                    <img
                      alt={recipe.name}
                      className="w-full h-full object-cover transition-transform group-hover:scale-110"
                      src={recipe.imageUrl}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Utensils className="h-12 w-12 text-orange-200" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    <span className="px-2 py-0.5 bg-gray-900 text-[8px] text-white font-bold uppercase tracking-widest rounded shadow-sm">
                      {recipe.category || 'Standard'}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <h5 className="font-bold text-gray-900 mb-1 line-clamp-1 group-hover:text-orange-600 transition-colors">
                    {recipe.name}
                  </h5>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-3">
                    {recipe.recipeId}
                  </p>
                  <div className="flex justify-between items-center pt-3 border-t border-gray-50">
                    <span className="text-[9px] text-gray-400">Created {new Date(recipe.createdAt).toLocaleDateString()}</span>
                    <button className="h-5 w-5 rounded bg-gray-50 flex items-center justify-center hover:bg-orange-50 hover:text-orange-500 transition-colors">
                      <CheckCircle className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* FAB - Global Quick Action */}
      <button className="fixed bottom-10 right-10 w-14 h-14 bg-orange-500 text-white rounded-2xl shadow-2xl shadow-orange-200 flex items-center justify-center hover:bg-orange-600 hover:scale-110 active:scale-95 transition-all z-50">
        <Plus className="h-6 w-6" />
      </button>
    </div>
  )
}
