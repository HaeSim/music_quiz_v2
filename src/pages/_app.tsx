import {
  CacheProvider,
  type EmotionCache,
  ThemeProvider,
} from '@emotion/react';
import {
  Backdrop,
  CircularProgress,
  CssBaseline,
  Typography,
} from '@mui/material';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import Script from 'next/script';
import { SessionProvider } from 'next-auth/react';
import { type ReactElement, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from 'react-query';

import ComponentModal from '@/components/organisms/ComponentModal';
import MessageModal from '@/components/organisms/MessageModal';
import * as gtag from '@/lib/gtag';
import useClientStore from '@/store/client';
import createEmotionCache from '@/styles/createEmotionCache';
import theme from '@/styles/theme';
import { PAGES } from '@/utils/AppConfig';
import type { NextPageWithLayout } from '@/utils/common';

// Client-side cache, shared for the whole session of the user in the browser.
const clientSideEmotionCache = createEmotionCache();

export interface MyAppProps extends AppProps {
  emotionCache?: EmotionCache;
}

const MyApp = (props: MyAppProps) => {
  const queryClient = new QueryClient();
  const router = useRouter();
  const {
    backdropVisible,
    backdropMessage,
    openBackdrop,
    closeBackdrop,
    navigateMenu,
  } = useClientStore((state) => state);

  const { emotionCache = clientSideEmotionCache, pageProps } = props;
  const Component = props.Component as NextPageWithLayout;

  const getLayout = Component.getLayout ?? ((page: ReactElement) => page);

  useEffect(() => {
    let vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);

    window.addEventListener('resize', () => {
      vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    });

    return () => {
      window.removeEventListener('resize', () => {
        vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
      });
    };
  }, []);

  useEffect(() => {
    let backdropTimer: NodeJS.Timeout;
    const handleRouteChangeStart = () => {
      backdropTimer = setTimeout(() => {
        openBackdrop({
          message: '페이지 이동 중입니다. 잠시만 기다려주세요.',
        });
      }, 1000);
    };

    const handleRouteChangeComplete = (url: URL) => {
      clearTimeout(backdropTimer);
      closeBackdrop();
      gtag.pageview(url);
    };

    router.events.on('routeChangeStart', handleRouteChangeStart);
    router.events.on('routeChangeComplete', handleRouteChangeComplete);

    return () => {
      clearTimeout(backdropTimer);
      router.events.off('routeChangeStart', handleRouteChangeStart);
      router.events.off('routeChangeComplete', handleRouteChangeComplete);
    };
  }, []);

  useEffect(() => {
    // 주소 변경 시 현재 메뉴를 업데이트하고 라우팅합니다.
    const currentPath = router.pathname;
    const targetMenu = Object.values(PAGES).find(
      (page) => page.path === currentPath
    );

    if (targetMenu) {
      navigateMenu(targetMenu.value);
    }
  }, [router.pathname]);

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${gtag.GA_TRACKING_ID}`}
      />
      <Script
        id="gtag-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gtag.GA_TRACKING_ID}', {
            page_path: window.location.pathname,
          });
        `,
        }}
      />
      <SessionProvider session={pageProps.session}>
        <QueryClientProvider client={queryClient}>
          <CacheProvider value={emotionCache}>
            <ThemeProvider theme={theme}>
              <CssBaseline />
              {getLayout(<Component {...pageProps} />)}
              <ComponentModal />
              <MessageModal />
              <Backdrop
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  color: '#fff',
                  zIndex: (tm) => tm.zIndex.drawer + 1,
                }}
                open={backdropVisible}
              >
                <CircularProgress color="inherit" />
                <Typography
                  variant="h6"
                  align="center"
                  fontWeight="bold"
                  marginTop={2}
                >
                  {backdropMessage}
                </Typography>
              </Backdrop>
              <Toaster />
              <Analytics />
              <SpeedInsights />
            </ThemeProvider>
          </CacheProvider>
        </QueryClientProvider>
      </SessionProvider>
    </>
  );
};
export default MyApp;
