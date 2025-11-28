'use client';

// This page now lives at /call and reads the channelId from the query string.
// This makes it compatible with Next.js static export.

import CallClient from './call-client';

export default function CallPage() {
  return <CallClient />;
}
