
"use client";

import { useRef, useState, useLayoutEffect } from "react";
import { useFormContext } from "react-hook-form";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Handshake, Heart, Sailboat } from "lucide-react";
import { type FormData } from "@/lib/schema";
import { cn } from "@/lib/utils";

const intentions = [
  {
    id: "50/50",
    title: "50/50",
    description: "Partage équitable des frais",
    icon: Handshake,
  },
  {
    id: "sponsor",
    title: "Sponsorisé",
    description: "Les frais sont couverts",
    icon: Heart,
  },
  {
    id: "sponsoring",
    title: "Sponsoring",
    description: "Prêt à couvrir les frais",
    icon: Sailboat,
  },
  {
    id: "group-travel",
    title: "Voyage en groupe",
    description: "Plus on est de fous, plus on rit",
    icon: Users,
  },
];

export default function Step4() {
  const { watch, setValue } = useFormContext<FormData>();
  const watchedIntention = watch("intention");
  const [containerHeight, setContainerHeight] = useState<number | 'auto'>('auto');
  const gridRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const gridElement = gridRef.current;
    if (!gridElement) return;

    // Get initial height synchronically before the browser paints.
    const initialHeight = gridElement.getBoundingClientRect().height;
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
    observer.observe(gridElement);

    return () => observer.disconnect();
  }, [watchedIntention]);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold">Votre prochain voyage !</h2>
      <p className="text-muted-foreground">Quelle est votre intention principale ?</p>
      
      <div style={{ minHeight: containerHeight }}>
        {watchedIntention ? (
          <div className="p-4 bg-primary/10 rounded-md border border-primary/20">
            <p className="font-semibold text-primary">Votre choix est fait :</p>
            <p className="text-sm text-foreground">{watchedIntention}</p>
          </div>
        ) : (
          <div ref={gridRef} className="grid grid-cols-2 gap-4">
            {intentions.map((intention) => (
              <Card
                key={intention.id}
                className={`cursor-pointer ${watchedIntention === intention.title ? "border-primary ring-2 ring-primary" : "border-border"}`}
                onClick={() => setValue("intention", intention.title, { shouldValidate: true })}
              >
                <CardHeader className="flex flex-col items-center justify-center text-center p-4">
                  <intention.icon className="h-8 w-8 mb-2" />
                  <CardTitle className="text-base">{intention.title}</CardTitle>
                  <CardDescription className="text-xs">{intention.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
