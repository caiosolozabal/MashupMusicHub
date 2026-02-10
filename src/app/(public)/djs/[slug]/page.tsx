
import { PUBLIC_DJS } from '@/lib/public-djs';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import DjProfileClient from '@/components/public/DjProfileClient';

interface DjProfilePageProps {
  params: {
    slug: string;
  };
}

export async function generateMetadata({ params }: DjProfilePageProps): Promise<Metadata> {
  const dj = PUBLIC_DJS.find((d) => d.slug === params.slug);
  
  if (!dj) return { title: 'DJ não encontrado' };

  return {
    title: `Mashup | ${dj.nome}`,
    description: dj.resumoBooking,
    openGraph: {
      title: dj.nome,
      description: dj.resumoBooking,
      images: [{ url: dj.fotoUrl }],
    },
  };
}

export async function generateStaticParams() {
  return PUBLIC_DJS.map((dj) => ({
    slug: dj.slug,
  }));
}

/**
 * Página de Perfil do DJ (Server Component).
 * O conteúdo visual é delegado ao componente Client para lidar com fallbacks de imagem.
 */
export default function DjProfilePage({ params }: DjProfilePageProps) {
  const dj = PUBLIC_DJS.find((d) => d.slug === params.slug);

  if (!dj) {
    notFound();
  }

  return <DjProfileClient dj={dj} />;
}
