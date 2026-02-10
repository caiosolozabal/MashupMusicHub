'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

const Logo = ({ className }: { className?: string }) => {
  const [imageError, setImageError] = useState(false);

  return (
    <Link href="/" className={`flex items-center gap-2 group ${className}`}>
      {!imageError ? (
        <div className="relative h-8 w-32 sm:h-10 sm:w-40">
          <Image
            src="/logo.png"
            alt="Mashup Music Hub"
            fill
            className="object-contain object-left transition-transform group-hover:scale-105"
            onError={() => setImageError(true)}
            unoptimized
          />
        </div>
      ) : (
        <span className="text-xl font-headline font-black text-primary hover:text-primary/90 transition-colors uppercase tracking-tighter">
          Mashup<span className="text-foreground">Hub</span>
        </span>
      )}
    </Link>
  );
};

export default Logo;
