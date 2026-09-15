/**
 * Determine whether a sidebar link is the active route.
 * `/products` stays active for `/products/new` and `/products/[id]`.
 */
export function isNavItemActive(
  href: string,
  pathname: string,
  exact = false,
): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  if (exact) {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
