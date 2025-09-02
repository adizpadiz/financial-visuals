export const metadata = {
  title: "Finance Visualizer",
  description: "Visualize financial statements + simulator",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head />
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
import "./globals.css";
