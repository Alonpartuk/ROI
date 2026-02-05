import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { HRISProvider } from '../context/HRISContext';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <HRISProvider>
      <Component {...pageProps} />
    </HRISProvider>
  );
}
