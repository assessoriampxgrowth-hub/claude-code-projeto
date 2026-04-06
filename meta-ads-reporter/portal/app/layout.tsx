import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Relatórios Meta Ads",
  description: "Portal de relatórios de performance",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, fontFamily: "'Segoe UI', Arial, sans-serif", background: "#F0F2F5" }}>
        {children}
      </body>
    </html>
  );
}
