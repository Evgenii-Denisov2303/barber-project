import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Istanbul · Панель мастера',
  description: 'Онлайн-расписание и записи парикмахерской Istanbul.'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
