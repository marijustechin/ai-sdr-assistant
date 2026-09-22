"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@shared/lib/utils";
import {
  BRAND_MONOGRAM_ALT,
  BRAND_NAME,
  BRAND_SUBTITLE,
  BRANDING_ASSETS,
} from "@shared/lib/branding";
import { isNavItemActive } from "@shared/lib/nav";
import { NAV_ITEMS } from "./nav-items";

export function SidebarBrand({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link
      href="/"
      onClick={onNavigate}
      className="flex items-center gap-2.5 px-5 py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
    >
      <Image
        src={BRANDING_ASSETS.monogram}
        alt={BRAND_MONOGRAM_ALT}
        width={32}
        height={32}
        className="size-8 shrink-0 object-contain"
        priority
      />
      <span className="flex flex-col leading-tight">
        <span className="text-sm font-semibold">{BRAND_NAME}</span>
        <span className="text-xs text-muted-foreground">{BRAND_SUBTITLE}</span>
      </span>
    </Link>
  );
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 px-3" aria-label="Primary">
      {NAV_ITEMS.map((item) => {
        const active = isNavItemActive(item.href, pathname, item.exact);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
