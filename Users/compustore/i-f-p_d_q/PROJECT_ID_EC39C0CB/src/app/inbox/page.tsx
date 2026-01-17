
'use client';

import BottomNav from "@/components/bottom-nav";
import InboxList from "@/components/inbox-list";
import WanderlinkHeader from "@/components/wanderlink-header";
import { Suspense, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function InboxPage() {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="flex min-h-screen w-full flex-col">
      <WanderlinkHeader />
      <main className="flex-1 pb-24 pt-10 md:pt-12">
        <div className="container mx-auto max-w-7xl px-2">
            <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Rechercher une conversation..."
                  className="pl-10 h-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <Suspense fallback={<div className="flex h-full w-full flex-col items-center justify-center"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>}>
                <InboxList searchTerm={searchTerm} />
            </Suspense>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
