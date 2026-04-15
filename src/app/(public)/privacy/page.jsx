export const metadata = {
  title: 'Privacy Policy',
  description: 'Learn how Zuri protects your personal and business data. Our commitment to PDPA compliance and data security.',
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white dark:bg-gray-900 py-20 px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
          Privacy Policy
        </h1>
        
        <div className="prose prose-blue dark:prose-invert max-w-none space-y-6 text-gray-600 dark:text-gray-400">
          <section>
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">1. Introduction</h2>
            <p>
              Welcome to Zuri. We are committed to protecting your personal data and your privacy. 
              This Privacy Policy explains how we collect, use, and safeguard information when you use our platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">2. Data We Collect</h2>
            <p>
              For culinary businesses and their customers, we collect:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Contact Information (Name, Email, Phone Number)</li>
              <li>Transaction Data (Orders, Sales, Payments)</li>
              <li>Employee Information for workforce management</li>
              <li>Usage Data and Cookies for platform optimization</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">3. Purpose of Processing</h2>
            <p>
              We process data to provide CRM, POS, and Marketing services, to communicate with you about your account, 
              and to improve our AI-driven insights for your business operations.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">4. Data Security</h2>
            <p>
              We implement industry-standard security measures, including data masking (PII Protection) 
              for restricted personnel roles and encrypted communication protocols.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">5. PDPA Compliance</h2>
            <p>
              As a provider in Thailand, we adhere to the Personal Data Protection Act (PDPA). 
              You have the right to access, correct, or request deletion of your personal data at any time.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">6. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact our Data Protection Officer at 
              support@zuri.example.com.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-100 dark:border-gray-800">
          <p className="text-sm text-gray-500">
            Last Updated: April 10, 2026
          </p>
        </div>
      </div>
    </main>
  )
}
