'use client';

// Inbox channel sub-route — redirects to main inbox page with channel filter
// Handles: /inbox/all, /inbox/facebook, /inbox/line, /inbox/pending

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

const CHANNEL_MAP = {
  all:      null,
  facebook: 'facebook',
  line:     'line',
  pending:  'pending',
};

export default function InboxChannelPage() {
  const router = useRouter();
  const params = useParams();
  const channel = params?.channel;

  useEffect(() => {
    const mapped = CHANNEL_MAP[channel];
    if (mapped) {
      router.replace(`/inbox?channel=${mapped}`);
    } else {
      router.replace('/inbox');
    }
  }, [channel, router]);

  return (
    <div className="flex items-center justify-center h-64">
      <div className="h-8 w-8 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
    </div>
  );
}
