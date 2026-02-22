import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { HRISProvider } from '../context/HRISContext';
import { AuthGuard } from '../components/auth';

const publicPages = ['/login', '/unauthorized'];
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

export default function App({ Component, pageProps, router }: AppProps) {
  const isPublicPage = publicPages.includes(router.pathname);

  const content = isPublicPage ? (
    <Component {...pageProps} />
  ) : (
    <AuthGuard>
      <Component {...pageProps} />
    </AuthGuard>
  );

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <HRISProvider>
        {content}
      </HRISProvider>
    </GoogleOAuthProvider>
  );
}
