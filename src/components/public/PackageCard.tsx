
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { RentalPackage } from "@/lib/public-rental-packages";
import { PackageCarousel } from "@/components/public/PackageCarousel";

export function PackageCard({ pkg }: { pkg: RentalPackage }) {
  return (
    <Link
      href={`/equipamentos/${pkg.slug}`}
      className="group block rounded-2xl border border-white/5 bg-card/30 hover:bg-card/50 transition-all duration-300 shadow-xl"
    >
      <div className="p-3">
        <div className="relative overflow-hidden rounded-2xl">
          <div className="group-hover:scale-[1.03] transition-transform duration-500">
            <PackageCarousel images={pkg.images} alt={pkg.title} intervalMs={15000} />
          </div>

          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-white font-headline font-black text-xl uppercase tracking-tighter">{pkg.title}</div>
              <Badge className="bg-primary text-black font-black border-none text-[10px]">
                ATÉ {pkg.capacityPeople} PESSOAS
              </Badge>
            </div>
            <div className="text-white/70 text-xs mt-1 font-body uppercase tracking-widest">{pkg.subtitle}</div>
          </div>
        </div>
      </div>
    </Link>
  );
}
