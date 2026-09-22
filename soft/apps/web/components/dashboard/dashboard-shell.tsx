"use client";

import Image from "next/image";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { CloseIcon, MenuIcon } from "@/components/ui/icons";
import {
  BRAND_MONOGRAM_ALT,
  BRAND_NAME,
  BRANDING_ASSETS,
} from "@shared/lib/branding";
import { SidebarBrand, SidebarNav } from "./sidebar";

/**
 * Responsive admin shell: persistent sidebar on desktop, an off-canvas drawer
 * on smaller screens. Navigation itself is a client concern (active route +
 * drawer state); page content stays a Server Component passed as `children`.
 */
export function DashboardShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const close = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen, close]);

  return (
    <div className="flex min-h-svh bg-background">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <SidebarBrand />
        <SidebarNav />
      </aside>

      {mobileOpen ? (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
        >
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-foreground/30"
            onClick={close}
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[80%] flex-col border-r border-sidebar-border bg-sidebar shadow-xl">
            <div className="flex items-start justify-between">
              <SidebarBrand onNavigate={close} />
              <button
                type="button"
                aria-label="Close navigation"
                onClick={close}
                className="mt-4 mr-3 rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <CloseIcon className="size-5" />
              </button>
            </div>
            <SidebarNav onNavigate={close} />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur lg:hidden">
          <button
            type="button"
            aria-label="Open navigation"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-1.5 text-foreground hover:bg-accent"
          >
            <MenuIcon className="size-5" />
          </button>
          <Image
            src={BRANDING_ASSETS.monogram}
            alt={BRAND_MONOGRAM_ALT}
            width={24}
            height={24}
            className="size-6 shrink-0 object-contain"
          />
          <span className="text-sm font-semibold">{BRAND_NAME}</span>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
