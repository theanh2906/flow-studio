import type {Metadata} from 'next';
import {Plus_Jakarta_Sans, Public_Sans, JetBrains_Mono} from 'next/font/google';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin', 'vietnamese'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
});

const publicSans = Public_Sans({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500'],
  variable: '--font-mono',
});

const appUrl =
  process.env.APP_URL && process.env.APP_URL.startsWith('http')
    ? process.env.APP_URL
    : 'https://ais-pre-ojhklunojyijqouhw3nopi-307044333697.asia-east1.run.app';

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: 'FlowStudio Pro — Quản Lý Sản Xuất & Hậu Kỳ Video Google Flow',
  description:
    'Nền tảng phân tích kịch bản, giữ ngữ cảnh nhân vật xuyên suốt, dựng đồng thời đa luồng (Hình ảnh, Video, Âm thanh), chỉnh sửa hậu kỳ NLE trực tiếp trên web và đối chiếu phiên bản dự án.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'FlowStudio Pro — Quản Lý Sản Xuất & Hậu Kỳ Video Google Flow',
    description:
      'Nền tảng phân tích kịch bản, giữ ngữ cảnh nhân vật xuyên suốt, dựng đồng thời đa luồng (Hình ảnh, Video, Âm thanh), chỉnh sửa hậu kỳ NLE trực tiếp trên web và đối chiếu phiên bản dự án.',
    type: 'website',
    siteName: 'FlowStudio Pro',
    url: appUrl,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FlowStudio Pro — Quản Lý Sản Xuất & Hậu Kỳ Video Google Flow',
    description:
      'Nền tảng phân tích kịch bản, giữ ngữ cảnh nhân vật xuyên suốt, dựng đồng thời đa luồng (Hình ảnh, Video, Âm thanh), chỉnh sửa hậu kỳ NLE trực tiếp trên web và đối chiếu phiên bản dự án.',
  },
};

const jsonLdSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'FlowStudio Pro — Quản Lý Sản Xuất & Hậu Kỳ Video Google Flow',
  applicationCategory: 'MultimediaApplication',
  operatingSystem: 'All',
  description:
    'Nền tảng phân tích kịch bản, giữ ngữ cảnh nhân vật xuyên suốt, dựng đồng thời đa luồng (Hình ảnh, Video, Âm thanh), chỉnh sửa hậu kỳ NLE trực tiếp trên web và đối chiếu phiên bản dự án.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html
      lang="vi"
      className={`${plusJakarta.variable} ${publicSans.variable} ${jetbrainsMono.variable} dark`}
    >
      <body
        suppressHydrationWarning
        className="bg-[#0B0F17] text-slate-100 antialiased selection:bg-amber-500/30 selection:text-amber-200"
        style={{fontFamily: 'var(--font-sans), sans-serif'}}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{__html: JSON.stringify(jsonLdSchema)}}
        />
        {children}
      </body>
    </html>
  );
}

