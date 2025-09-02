// app/layout.tsx  (or src/app/layout.tsx if your page is in src/app)
import "./globals.css";

export const metadata = {
  title: "Finance Visualizer",
  description: "Visualize financial statements + simulator",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
