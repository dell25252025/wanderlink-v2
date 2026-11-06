
"use client";

import { useRef, useState, useLayoutEffect } from "react";
import { useFormContext } from "react-hook-form";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Scale, Gift, DollarSign } from "lucide-react";
import { type FormData } from "@/lib/schema";
import { cn } from "@/lib/utils";

const intentions = [
  {
    id: "50/50",
    title: "50/50",
    description: "Chacun paie sa part, les dépenses sont partagées.",
    icon: Scale,
  },
  {
    id: "sponsor",
    title: "Je suis sponsorisé(e)",
    description: "Vous êtes invité(e) et vos frais sont pris en charge.",
    icon: Gift,
  },
  {
    id: "sponsoring",
    title: "Je sponsorise",
    description: "Vous invitez et prenez en charge les frais du voyage.",
    icon: DollarSign,
  },
  {
    id: "group-travel",
    title: "Voyage en groupe",
    description: "Rejoignez ou créez un voyage avec plusieurs personnes.",
    icon: Users,
  },
];

export default function Step4() {
  const { watch, setValue } = useFormContext<FormData>();
  const watchedIntention = watch("intention");
  const [containerHeight, setContainerHeight] = useState<number | 'auto'>('auto');
  const listRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const listElement = listRef.current;
    if (!listElement) return;

    const initialHeight = listElement.getBoundingClientRect().height;
    if (initialHeight > 0) {
      setContainerHeight(initialHeight);
    }

    // Then, observe for any subsequent changes (e.g., window resize).
    const observer = new ResizeObserver(entries => {
      const newHeight = entries[0]?.contentRect.height;
      if (newHeight && newHeight > 0) {
        setContainerHeight(newHeight);
      }
    });
    observer.observe(listElement);

    return () => observer.disconnect();
  }, [watchedIntention]);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold">Votre prochain voyage !</h2>
      <p className="text-muted-foreground">Choisissez le type de voyage qui vous correspond le mieux.</p>

      <div style={{ minHeight: containerHeight }}>
        {watchedIntention ? (
          <div className="p-4 bg-primary/10 rounded-md border border-primary/20">
            <p className="font-semibold text-primary">Votre choix est fait :</p>
            <p className="text-sm text-foreground">{watchedIntention}</p>
          </div>
        ) : (
          <div ref={listRef} className="flex flex-col gap-4">
            {intentions.map((intention) => (
              <Card
                key={intention.id}
                className={cn(
                  "cursor-pointer",
                  watchedIntention === intention.title ? "border-primary ring-2 ring-primary" : "border-border"
                )}
                onClick={() => setValue("intention", intention.title, { shouldValidate: true })}
              >
                <CardHeader className="flex flex-row items-center gap-4 p-4">
                  <intention.icon className="h-8 w-8 flex-shrink-0" />
                  <div className="flex flex-col">
                    <CardTitle className="text-base text-left">{intention.title}</CardTitle>
                    <CardDescription className="text-xs text-left">{intention.description}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
