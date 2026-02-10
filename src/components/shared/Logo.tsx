'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

const Logo = ({ className }: { className?: string }) => {
  const [imageError, setImageError] = useState(false);

  return (
    <Link href="/" className={`flex items-center gap-2 group ${className}`}>
      {!imageError ? (
        <div className="relative h-10 w-40 sm:w-48">
          <Image
            src="/logo.png"
            alt="Mashup Music Hub"
            fill
            className="object-contain object-left md:object-center transition-transform group-hover:scale-105"
            onError={() => setImageError(true)}
            unoptimized
          />
        </div>
      ) : (
        <span className="text-2xl font-headline font-black text-primary hover:text-primary/90 transition-colors uppercase tracking-tighter">
          Mashup<span className="text-foreground">Hub</span>
        </span>
      )}
    </Link>
  );
};

export default Logo;
