import Image from "next/image";
import { notFound } from "next/navigation";
import { RENTAL_PACKAGES } from "@/lib/public-rental-packages";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Metadata } from "next";

interface PackagePageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: PackagePageProps): Promise<Metadata> {
  const pkg = RENTAL_PACKAGES.find((p) => p.slug === params.slug);
  if (!pkg) return { title: 'Estrutura não encontrada' };
  return {
    title: `Mashup | ${pkg.title}`,
    description: pkg.subtitle,
  };
}

export async function generateStaticParams() {
  return RENTAL_PACKAGES.map((p) => ({ slug: p.slug }));
}

export default function PackagePage({ params }: PackagePageProps) {
  const pkg = RENTAL_PACKAGES.find((p) => p.slug === params.slug);
  if (!pkg) return notFound();

  return (
    <div className="container mx-auto max-w-6xl px-4 py-12 sm:py-20">
      <Link href="/equipamentos" className="inline-flex items-center text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors mb-8">
        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Audio Experience
      </Link>

      <div className="grid lg:grid-cols-2 gap-12 items-start">
        <div className="space-y-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Badge className="bg-primary/10 border border-primary/20 text-primary font-black text-[10px] px-3 py-1 uppercase">
                Estrutura Profissional Mashup
              </Badge>
            </div>
            <h1 className="text-4xl sm:text-6xl font-black font-headline tracking-tighter leading-none mb-4 uppercase">
              {pkg.title}
            </h1>
            <p className="text-xl text-muted-foreground font-body font-bold uppercase tracking-widest">
              {pkg.subtitle}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl border border-white/5 bg-card/50 backdrop-blur-sm">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-primary mb-4">Destaques</h2>
              <ul className="space-y-3">
                {pkg.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-6 rounded-2xl border border-white/5 bg-card/50 backdrop-blur-sm">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-primary mb-4">O que inclui</h2>
              <ul className="space-y-3">
                {pkg.includes.map((i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 shrink-0" />
                    <span>{i}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <Button asChild size="lg" className="w-full sm:w-auto bg-primary text-black font-black hover:bg-primary/90 px-12 py-8 text-lg rounded-full shadow-2xl shadow-primary/20 uppercase tracking-widest">
            <Link href={`/equipamentos/orcamento?estrutura=${pkg.slug}`}>
              Solicitar orçamento personalizado
            </Link>
          </Button>
        </div>

        <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-white/10 shadow-2xl">
          <Image
            src={pkg.images[0]}
            alt={pkg.title}
            fill
            className="object-cover"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
        </div>
      </div>
    </div>
  );
}
