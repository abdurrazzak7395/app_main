import './globals.css';

export const metadata = {
  title: 'SVP Token Panel',
  description: 'Custom dashboard for SVP token-based API usage',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
