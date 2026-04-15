'use client';

// Kitchen — Recipe list page (FEAT08)
// Browse and manage the school's recipe library.

import { useState, useEffect } from 'react';
import { Plus, Search, Filter, LayoutGrid, List as ListIcon, ChefHat, Clock, Utensils, MoreVertical, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import RecipeEditor from '@/components/kitchen/RecipeEditor';

const CATEGORY_FILTERS = ['All', 'Appetizers', 'Mains', 'Desserts', 'Pastry', 'Sauces', 'Beverages'];

export default function RecipesPage() {
  const [category, setCategory] = useState('All');
  const [view, setView] = useState('Grid'); // Grid | List
  const [search, setSearch] = useState('');
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);

  useEffect(() => {
    fetchRecipes();
  }, [category, search]);

  async function fetchRecipes() {
    setLoading(true);
    try {
      const url = new URL('/api/culinary/recipes', window.location.origin);
      if (category !== 'All') url.searchParams.set('category', category);
      if (search) url.searchParams.set('search', search);

      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setRecipes(json.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch recipes', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleOpenEdit(recipe) {
    setLoading(true);
    try {
      const res = await fetch(`/api/culinary/recipes/${recipe.id}`);
      const json = await res.json();
      if (json.data) {
        setEditingRecipe(json.data);
        setShowEditor(true);
      }
    } catch (err) {
      console.error('Failed to fetch recipe detail', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent tracking-tight">Recipes</h1>
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5 font-medium">
            <ChefHat className="h-4 w-4 text-orange-500" />
            Manage the culinary school recipe library and ingredients
          </p>
        </div>
        <div className="flex gap-2">
          <button className="h-10 px-4 flex items-center gap-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all shadow-sm">
            <Filter className="h-4 w-4" />
            Import
          </button>
          <button
            onClick={() => {
              setEditingRecipe(null);
              setShowEditor(true);
            }}
            className="h-10 px-5 flex items-center gap-2 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-100">
            <Plus className="h-5 w-5" />
            New Recipe
          </button>
        </div>
      </div>

      {/* Search + filter toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
          <input
            type="text"
            placeholder="Search by recipe name or ingredient..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 pl-10 pr-4 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-sm"
          />
        </div>
        
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
          <button
            onClick={() => setView('Grid')}
            className={`p-2 rounded-lg transition-all ${view === 'Grid' ? 'bg-orange-100 text-orange-600' : 'text-gray-400 hover:bg-gray-50'}`}
            title="Grid View"
          >
            <LayoutGrid className="h-5 w-5" />
          </button>
          <button
            onClick={() => setView('List')}
            className={`p-2 rounded-lg transition-all ${view === 'List' ? 'bg-orange-100 text-orange-600' : 'text-gray-400 hover:bg-gray-50'}`}
            title="List View"
          >
            <ListIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Category pills */}
      <div className="flex gap-2 flex-wrap pb-2 border-b border-gray-100">
        {CATEGORY_FILTERS.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all shadow-sm ${
              category === c 
                ? 'bg-gray-900 text-white scale-105 shadow-md' 
                : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Recipe list/grid */}
      {loading && recipes.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl h-64 animate-pulse border border-gray-100 shadow-sm" />
          ))}
        </div>
      ) : recipes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
          <Utensils className="h-12 w-12 text-gray-200 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No recipes found</h3>
          <p className="text-gray-500 text-sm mt-1">Try adjusting your filters or search term</p>
        </div>
      ) : (
        <motion.div 
          layout
          className={view === 'Grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' : 'space-y-4'}
        >
          <AnimatePresence mode="popLayout">
            {recipes.map((recipe) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                key={recipe.id}
                onClick={() => handleOpenEdit(recipe)}
                className={`group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-xl hover:border-orange-200 transition-all cursor-pointer relative ${
                  view === 'List' ? 'flex items-center gap-4 p-3' : ''
                }`}
              >
                <div className={`${view === 'Grid' ? 'h-40 bg-gradient-to-br from-amber-50 to-orange-100 relative' : 'h-16 w-16 rounded-xl bg-orange-50 flex-shrink-0 flex items-center justify-center'}`}>
                  {recipe.imageUrl ? (
                    <img src={recipe.imageUrl} alt={recipe.name} className="h-full w-full object-cover" />
                  ) : (
                    <Utensils className={`text-orange-300 ${view === 'Grid' ? 'h-12 w-12 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' : 'h-6 w-6'}`} />
                  )}
                  {view === 'Grid' && (
                    <div className="absolute top-3 left-3 px-2.5 py-1 bg-white/90 backdrop-blur rounded-lg text-[10px] font-bold text-gray-700 shadow-sm uppercase tracking-wider">
                      {recipe.category || 'Standard'}
                    </div>
                  )}
                </div>

                <div className={`${view === 'Grid' ? 'p-4 space-y-3' : 'flex-1'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-gray-900 line-clamp-1 group-hover:text-orange-600 transition-colors">
                      {recipe.name}
                    </h3>
                    <button className="text-gray-300 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-50">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-gray-500 font-medium">
                    <div className="flex items-center gap-1.5">
                      <ListIcon className="h-3.5 w-3.5 text-gray-400" />
                      <span>{recipe._count?.ingredients || 0} items</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-gray-400" />
                      <span>{recipe.yieldAmount || '--'} {recipe.yieldUnit || 'portions'}</span>
                    </div>
                  </div>

                  {view === 'Grid' && (
                    <div className="flex items-center justify-between pt-3 border-t border-gray-50 mt-1">
                      <div className="flex -space-x-2">
                         <div className="h-7 w-7 rounded-full border-2 border-white bg-indigo-50 flex items-center justify-center text-[10px] font-bold text-indigo-600">
                           <Utensils className="h-3.5 w-3.5" />
                         </div>
                      </div>
                      <span className="text-[10px] font-bold text-gray-300 tracking-wider uppercase">
                        {recipe.recipeId}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Recipe Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden" 
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500 shadow-inner">
                  <ChefHat size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{editingRecipe ? 'Edit Recipe' : 'New Recipe'}</h2>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-widest">Kitchen Operations</p>
                </div>
              </div>
              <button 
                onClick={() => setShowEditor(false)} 
                className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <RecipeEditor 
              recipe={editingRecipe} 
              onClose={() => setShowEditor(false)} 
              onSaved={() => fetchRecipes()} 
            />
          </motion.div>
        </div>
      )}
    </div>
  );
}
