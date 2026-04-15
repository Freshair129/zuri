export default function robots() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://zuri.vercel.app'
  
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin/', '/(dashboard)/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
