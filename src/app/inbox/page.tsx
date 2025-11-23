
'use client';

import BottomNav from "@/components/bottom-nav";
import InboxList from "@/components/inbox-list";
import WanderlinkHeader from "@/components/wanderlink-header";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export default function InboxPage() {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <WanderlinkHeader />
      <main className="flex-1 pb-24 pt-10 md:pt-12">
        <div className="container mx-auto max-w-7xl px-2">
            <h1 className="text-2xl font-bold tracking-tight mb-4">Boîte de réception</h1>
            <Suspense fallback={<div className="flex h-full w-full flex-col items-center justify-center"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>}>
                <InboxList />
            </Suspense>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
