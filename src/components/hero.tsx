
import Image from 'next/image';
import placeholderImages from '@/lib/placeholder-images.json';

const Hero = () => {
  return (
    <div className="relative w-full h-20 bg-background">
      <Image
        src={placeholderImages.heroBanner.url}
        alt={placeholderImages.heroBanner.alt}
        fill
        className="object-cover"
        data-ai-hint={placeholderImages.heroBanner.hint}
        priority
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />
      <div className="relative h-full flex flex-col items-center justify-center text-center text-white p-4">
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-6xl font-extrabold font-headline tracking-tight text-white drop-shadow-lg">
            Connect. Explore. Discover.
          </h1>
          <p className="mt-4 text-lg md:text-xl text-white/90 drop-shadow-md">
            Your next adventure and travel partner are just a click away.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Hero;
