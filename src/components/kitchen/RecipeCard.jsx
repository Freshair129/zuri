import { ChefHat, Layers } from 'lucide-react';
import Badge from '../ui/Badge';

const categoryColor = {
  Appetizer: 'blue',
  Main: 'indigo',
  Dessert: 'purple',
  Beverage: 'green',
  Pastry: 'yellow',
};

export default function RecipeCard({ recipe, onClick }) {
  return (
    <button
      onClick={() => onClick?.(recipe)}
      className="bg-white border border-gray-200 rounded-xl p-5 text-left hover:border-indigo-400 hover:shadow-md transition-all w-full"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="h-10 w-10 rounded-lg bg-orange-50 flex items-center justify-center">
          <ChefHat className="h-5 w-5 text-orange-500" />
        </div>
        <Badge color={categoryColor[recipe.category] ?? 'gray'}>{recipe.category}</Badge>
      </div>
      <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2">{recipe.name}</h3>
      {recipe.description && (
        <p className="text-xs text-gray-500 line-clamp-2 mb-3">{recipe.description}</p>
      )}
      <div className="flex items-center gap-3 text-xs text-gray-500 mt-auto">
        <span className="flex items-center gap-1">
          <Layers className="h-3.5 w-3.5" />
          {recipe.ingredientCount ?? 0} ingredients
        </span>
        {recipe.prepTime && (
          <span>{recipe.prepTime} min</span>
        )}
      </div>
    </button>
  );
}
