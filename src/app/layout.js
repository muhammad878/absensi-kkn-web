import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata = {
  title: "Absensi KKN Damarjati",
  description: "Sistem absensi harian KKN Desa Damarjati yang terhubung ke Google Sheets",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster position="top-center" toastOptions={{ duration: 4000, style: { background: '#064e3b', color: '#fff', borderRadius: '10px' } }} />
      </body>
    </html>
  );
}
