import { RENTAL_PACKAGES } from "@/lib/public-rental-packages";
import { PackageCard } from "@/components/public/PackageCard";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mashup Audio Experience | Sonorização Premium",
  description: "Estruturas de som e iluminação de alta performance para eventos exclusivos.",
};

export default function EquipamentosPage() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-16 sm:py-24">
      <div className="mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-4">
          Audiovisual de Alto Padrão
        </div>
        <h1 className="text-5xl font-black tracking-tighter text-foreground sm:text-7xl font-headline leading-none">
          Mashup <span className="text-primary">Audio</span><br />Experience
        </h1>
        <p className="mt-8 text-lg text-muted-foreground max-w-2xl font-body leading-relaxed">
          Mais que equipamentos, entregamos uma experiência sensorial. 
          Estruturas dimensionadas para garantir o impacto que seu evento merece, 
          aliando estética impecável à tecnologia de ponta.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {RENTAL_PACKAGES.map((pkg) => (
          <PackageCard key={pkg.slug} pkg={pkg} />
        ))}
      </div>
    </div>
  );
}
