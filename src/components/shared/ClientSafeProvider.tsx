'use client';

import { useState, useEffect } from 'react';

/**
 * Este componente serve como uma barreira de segurança para evitar erros de hidratação do React.
 * Ele garante que seus componentes filhos só sejam renderizados no lado do cliente, depois que
 * o componente foi "montado" no navegador. Isso é útil para componentes que dependem de APIs
 * do navegador (como `window` ou `localStorage`) ou que têm um comportamento de renderização
 * que pode diferir entre o servidor e o cliente.
 */
export default function ClientSafeProvider({ children }: { children: React.ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null; // Não renderiza nada no servidor ou na primeira passagem do cliente
  }

  return <>{children}</>;
}
