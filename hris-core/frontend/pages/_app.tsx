import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { HRISProvider } from '../context/HRISContext';
import { AuthGuard } from '../components/auth';
// Pages that don't require authentication
const publicPages = ['/login', '/unauthorized'];

export default function App({ Component, pageProps, router }: AppProps) {
  const isPublicPage = publicPages.includes(router.pathname);

  return (
    <HRISProvider>
      {isPublicPage ? (
        <Component {...pageProps} />
      ) : (
        <AuthGuard>
          <Component {...pageProps} />
        </AuthGuard>
      )}
    </HRISProvider>
  );
}
