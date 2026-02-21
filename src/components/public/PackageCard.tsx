import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { RentalPackage } from "@/lib/public-rental-packages";
import { PackageCarousel } from "@/components/public/PackageCarousel";

export function PackageCard({ pkg }: { pkg: RentalPackage }) {
  return (
    <Link
      href={`/equipamentos/${pkg.slug}`}
      className="group block rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all duration-300"
    >
      <div className="p-3">
        <div className="relative overflow-hidden rounded-2xl shadow-xl">
          <div className="transition-transform duration-700 group-hover:scale-105">
            <PackageCarousel images={pkg.images} alt={pkg.title} intervalMs={15000} />
          </div>

          <div className="absolute bottom-4 left-4 right-4 text-left">
            <div className="flex items-center justify-between gap-2">
              <div className="text-white font-black text-xl font-headline uppercase tracking-tighter">{pkg.title}</div>
              <Badge className="bg-primary text-black font-black border-none text-[10px]">
                ATÉ {pkg.capacityPeople} PESSOAS
              </Badge>
            </div>
            <div className="text-white/70 text-xs mt-1 font-body font-bold uppercase tracking-widest leading-tight">{pkg.subtitle}</div>
          </div>
        </div>
      </div>
    </Link>
  );
}
