
"use client"

import * as React from "react"
import Autoplay from "embla-carousel-autoplay"
import type { UserProfile } from '@/lib/schema';
import ProfileCard from "./profile-card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel"

interface MatchCarouselProps {
  profiles: UserProfile[];
}

const MatchCarousel: React.FC<MatchCarouselProps> = ({ profiles }) => {
  return (
    <Carousel
      className="w-full"
      opts={{
        align: "start",
        loop: true,
      }}
      plugins={[
        Autoplay({
          delay: 5000,
          stopOnInteraction: true,
        }),
      ]}
    >
      <CarouselContent className="-ml-2 md:-ml-4">
        {profiles.map((profile, index) => (
          <CarouselItem key={index} className="pl-2 md:pl-4 basis-4/5 md:basis-1/3 lg:basis-1/4">
            <div className="p-1">
              <ProfileCard profile={profile} />
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  )
}

export default MatchCarousel;
