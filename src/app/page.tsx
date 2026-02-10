'use client';

import LandingPage from './(public)/page';
import PublicLayout from './(public)/layout';

/**
 * O arquivo raiz agora serve a Landing Page pública.
 * O redirecionamento automático foi removido para favorecer SEO e vitrine.
 * Usuários que desejam logar devem acessar /login ou clicar no link da landing.
 */
export default function HomePage() {
  return (
    <PublicLayout>
      <LandingPage />
    </PublicLayout>
  );
}
