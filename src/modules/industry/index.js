/**
 * Industry Plugins Registry
 * Load plugin based on tenant.config.industry
 */

const plugins = {
  culinary: () => import('./culinary/index.js'),
  // beauty: () => import('./beauty/index.js'),  // future
  // fitness: () => import('./fitness/index.js'), // future
}

export async function loadIndustryPlugin(industryName) {
  const loader = plugins[industryName]
  if (!loader) throw new Error(`Unknown industry plugin: ${industryName}`)
  const module = await loader()
  return module.default
}

export default plugins
