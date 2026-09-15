import { Badge } from "@/components/ui/badge";
import {
  PRODUCT_STATUS_LABEL,
  PRODUCT_STATUS_TONE,
  type ProductStatus,
} from "@/lib/products/status";

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  return (
    <Badge tone={PRODUCT_STATUS_TONE[status]}>
      {PRODUCT_STATUS_LABEL[status]}
    </Badge>
  );
}
