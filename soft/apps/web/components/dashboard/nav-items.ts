import type { ComponentType, SVGProps } from "react";
import { DashboardIcon, InfoIcon, PackageIcon } from "@/components/ui/icons";

export interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Only match the exact pathname (used for the dashboard root). */
  exact?: boolean;
}

/**
 * The only navigation entries for this slice. Future modules are deliberately
 * absent until they exist — see the task scope.
 */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: DashboardIcon, exact: true },
  { href: "/products", label: "Products", icon: PackageIcon },
  {
    href: "/settings/sender-profiles",
    label: "Settings",
    icon: InfoIcon,
  },
];
