"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertIcon, CheckCircleIcon } from "@/components/ui/icons";
import { createProductAction, updateProductAction } from "@/lib/api/actions";
import {
  emptyToUndefined,
  emptyProductFormValues,
  productFormSchema,
  type ProductFormValues,
} from "@/lib/products/schema";
import {
  PRODUCT_STATUSES,
  PRODUCT_STATUS_LABEL,
} from "@/lib/products/status";
import { buildUpdateProductPayload } from "@/lib/products/payload";
import { productResponseToFormValues } from "@/lib/products/mappers";
import type { ProductActionResult } from "@/lib/products/types";
import type { SenderProfileRead } from "@entities/sender-profile";

export interface ProductFormProps {
  mode?: "create" | "edit";
  initialValues?: ProductFormValues;
  productId?: string;
  senderProfiles?: SenderProfileRead[];
}

export function ProductForm({
  mode = "create",
  initialValues,
  productId,
  senderProfiles = [],
}: ProductFormProps) {
  const router = useRouter();
  const [result, setResult] = useState<ProductActionResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isEdit = mode === "edit";

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: initialValues ?? emptyProductFormValues,
    mode: "onBlur",
  });

  const submit = form.handleSubmit(async (values) => {
    setSubmitting(true);
    setResult(null);
    try {
      const response = isEdit
        ? await updateProductAction(
            productId ?? "",
            buildUpdateProductPayload(values),
          )
        : await createProductAction(values);

      if (!response.ok) {
        if (response.fieldErrors) {
          for (const [field, message] of Object.entries(response.fieldErrors)) {
            form.setError(field as Parameters<typeof form.setError>[0], {
              message,
            });
          }
        }
        setResult(response);
        return;
      }

      if (isEdit) {
        // Reflect the saved record in the form and refresh the server-rendered
        // page (header status, updated timestamp).
        form.reset(productResponseToFormValues(response.product));
        router.refresh();
      } else {
        form.reset(emptyProductFormValues);
      }
      setResult(response);
    } catch {
      setResult({
        ok: false,
        message: isEdit
          ? "The product could not be updated. Please try again."
          : "The product could not be created. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  });

  const errors = form.formState.errors;

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      {result?.ok ? (
        <Card className="border-success/40 bg-success/5">
          <CardContent className="space-y-2 p-5 text-sm">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <CheckCircleIcon className="size-5 text-success" />
              {isEdit ? "Changes saved" : "Product created"}
            </div>
            <p className="text-muted-foreground">
              Reference:{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                {result.product.id}
              </code>
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Link
                href="/products"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Back to products
              </Link>
              <Link
                href={`/products/${result.product.id}`}
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                Open product
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {result && !result.ok ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex gap-3 p-4 text-sm">
            <AlertIcon className="mt-0.5 size-5 shrink-0 text-destructive" />
            <p className="text-foreground">{result.message}</p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Core details</CardTitle>
          <CardDescription>
            These fields map directly to the product record.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <FormField
            label="Product name"
            htmlFor="name"
            required
            error={errors.name?.message}
          >
            <Input
              placeholder="e.g. Thermo Abachi"
              autoComplete="off"
              {...form.register("name")}
            />
          </FormField>

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              label="Scientific name"
              htmlFor="scientificName"
              error={errors.scientificName?.message}
              hint="Leave empty to clear."
            >
              <Input
                placeholder="e.g. Triplochiton scleroxylon"
                autoComplete="off"
                {...form.register("scientificName", {
                  setValueAs: emptyToUndefined,
                })}
              />
            </FormField>

            <FormField
              label="Category"
              htmlFor="category"
              error={errors.category?.message}
              hint="Free-form; leave empty to clear."
            >
              <Input
                placeholder="e.g. hardwood timber"
                autoComplete="off"
                {...form.register("category", { setValueAs: emptyToUndefined })}
              />
            </FormField>
          </div>

          <FormField
            label="Description"
            htmlFor="description"
            error={errors.description?.message}
            hint="Leave empty to clear."
          >
            <Textarea
              placeholder="A concise summary used in lists and research context."
              rows={3}
              {...form.register("description", {
                setValueAs: emptyToUndefined,
              })}
            />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lifecycle</CardTitle>
          <CardDescription>
            The only status the product record persists today. Research state is
            tracked on research runs, not on the product.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormField
            label="Product status"
            htmlFor="lifecycleStatus"
            error={errors.lifecycleStatus?.message}
            className="max-w-xs"
          >
            <Select {...form.register("lifecycleStatus")}>
              {PRODUCT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {PRODUCT_STATUS_LABEL[status]}
                </option>
              ))}
            </Select>
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Outreach sender profile</CardTitle>
          <CardDescription>
            Used for sales / buyer outreach. Optional — may be blank. Buyer
            outreach never uses the inquiry sender profile.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <FormField
            label="Outreach sender profile"
            htmlFor="outreachSenderProfileId"
            error={errors.outreachSenderProfileId?.message}
            className="max-w-sm"
          >
            <Select
              {...form.register("outreachSenderProfileId", {
                setValueAs: (value) => (value === "" ? undefined : value),
              })}
            >
              <option value="">Not assigned</option>
              {senderProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.label}
                  {profile.status === "ACTIVE" ? "" : " (disabled)"}
                </option>
              ))}
            </Select>
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inquiry sender profile</CardTitle>
          <CardDescription>
            Used for market-research price inquiries / RFQs. Optional — may be
            blank. Must be linked to an email account before it can be used;
            RFQ creation never falls back to the outreach sender profile.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <FormField
            label="Inquiry sender profile"
            htmlFor="inquirySenderProfileId"
            error={errors.inquirySenderProfileId?.message}
            className="max-w-sm"
          >
            <Select
              {...form.register("inquirySenderProfileId", {
                setValueAs: (value) => (value === "" ? undefined : value),
              })}
            >
              <option value="">Not assigned</option>
              {senderProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.label}
                  {profile.status === "ACTIVE" ? "" : " (disabled)"}
                </option>
              ))}
            </Select>
          </FormField>
          {senderProfiles.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No sender profiles yet. Create one under Settings → Sender
              profiles.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting
            ? "Saving…"
            : isEdit
              ? "Save changes"
              : "Create product"}
        </Button>
        <Badge tone="outline">
          {isEdit ? "Live API: PATCH /products/:id" : "Live API: POST /products"}
        </Badge>
        {isEdit && productId ? (
          <span className="font-mono text-xs text-muted-foreground">
            {productId}
          </span>
        ) : null}
      </div>
    </form>
  );
}
