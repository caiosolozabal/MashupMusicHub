import { RENTAL_PACKAGES } from "@/lib/public-rental-packages";
import { PackageCard } from "@/components/public/PackageCard";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Locação de Equipamentos | Mashup Music",
  description: "Pacotes de som e iluminação profissional para o seu evento.",
};

export default function EquipamentosPage() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-16 sm:py-24">
      <div className="mb-16">
        <h1 className="text-4xl font-black tracking-tight text-foreground sm:text-6xl font-headline">
          Locação de <span className="text-primary">Equipamentos</span>
        </h1>
        <p className="mt-4 text-base text-muted-foreground max-w-xl font-body leading-relaxed">
          Estrutura técnica de alta performance com montagem ágil e estética impecável para elevar o nível do seu evento.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {RENTAL_PACKAGES.map((pkg) => (
          <PackageCard key={pkg.slug} pkg={pkg} />
        ))}
      </div>
    </div>
  );
}
