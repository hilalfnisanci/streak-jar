import type { ReactNode } from "react";

import { Header } from "../components/header";

type AppLayoutProps = {
  children: ReactNode;
};

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <>
      <Header />
      <main>{children}</main>
    </>
  );
}
