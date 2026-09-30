/** True when the operator explicitly ticked "reset customized drafts" on reopen. */
export function resetCustomizedRequested(formData: FormData): boolean {
  return formData.get("resetCustomized") === "on";
}
