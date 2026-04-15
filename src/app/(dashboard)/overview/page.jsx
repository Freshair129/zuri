import { fetchOverviewStats } from './overviewActions';
import OverviewPageClient from './OverviewPageClient';

export const metadata = {
  title: 'Overview | Zuri',
  description: 'Business metrics and performance summary',
};

export default async function OverviewPage() {
  // Fetch real data on the server with strict tenant isolation
  const data = await fetchOverviewStats();

  return <OverviewPageClient data={data} />;
}
