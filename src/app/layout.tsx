import "./globals.css";
export const metadata = { title: "VITA — Your life. Your character." };
export default function Root({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
