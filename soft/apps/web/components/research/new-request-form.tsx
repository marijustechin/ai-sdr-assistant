"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitResearchRequestAction } from "@/lib/api/actions";
import {
  buildResearchRequestInput,
  COST_POLICY_OPTIONS,
  describeCostPolicy,
  describeStandardScope,
  GOAL_LABELS,
  GOAL_OPTIONS,
  GOAL_SEGMENT_SUGGESTIONS,
  initialFormValues,
  parseList,
  PROVIDER_OPTIONS,
  SEGMENT_POLICY_OPTIONS,
  type ResearchRequestFormValues,
} from "@/lib/research-requests/schema";
import type {
  ResearchGoal,
  ResearchToolProvider,
} from "@ai-sdr/contracts";
import { researchRunPath } from "@/lib/research/navigation";

export interface NewRequestFormProps {
  productId: string;
  productName: string;
  productCategory: string | null;
  productScientificName: string | null;
}

/**
 * Product-independent "New market research" form. It asks only for what the
 * request needs; the product identity is loaded from the API, so the operator
 * never repeats a product description and never sees an internal Offer/
 * Opportunity id. Segments are optional and only ever offered as editable
 * proposals.
 */
export function NewRequestForm({
  productId,
  productName,
  productCategory,
  productScientificName,
}: NewRequestFormProps) {
  const [values, setValues] = useState<ResearchRequestFormValues>(
    initialFormValues,
  );
  // Generated lazily on first submit and reused for retries, so a double-click
  // or retry is idempotent without a server/client hydration mismatch.
  const requestKeyRef = useRef<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<{
    runId: string;
    opportunityId: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  function update<K extends keyof ResearchRequestFormValues>(
    key: K,
    value: ResearchRequestFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function toggleGoal(goal: ResearchGoal) {
    setValues((current) => ({
      ...current,
      goals: current.goals.includes(goal)
        ? current.goals.filter((value) => value !== goal)
        : [...current.goals, goal],
    }));
  }

  function toggleMeteredProvider(provider: ResearchToolProvider) {
    setValues((current) => ({
      ...current,
      meteredProviders: current.meteredProviders.includes(provider)
        ? current.meteredProviders.filter((value) => value !== provider)
        : [...current.meteredProviders, provider],
    }));
  }

  function addSuggestedSegments() {
    const suggestions = values.goals.flatMap(
      (goal) => GOAL_SEGMENT_SUGGESTIONS[goal] ?? [],
    );
    const merged = parseList(
      [values.segments, ...suggestions].filter(Boolean).join(", "),
    );
    update("segments", merged.join(", "));
  }

  function onSubmit() {
    setMessage(null);
    setFieldErrors({});
    if (requestKeyRef.current === null) {
      requestKeyRef.current =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `req-${Date.now()}`;
    }
    const input = buildResearchRequestInput(values, {
      productId,
      requestKey: requestKeyRef.current,
    });
    startTransition(async () => {
      const result = await submitResearchRequestAction(input);
      if (result.ok) {
        setSubmitted({
          runId: result.request.runId,
          opportunityId: result.request.opportunityId,
        });
      } else {
        setMessage(result.message);
        setFieldErrors(result.fieldErrors ?? {});
      }
    });
  }

  if (submitted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Queued — waiting for researcher</CardTitle>
          <CardDescription>
            The request is stored and discoverable by the researcher. No research
            has started automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Link
            href={researchRunPath(productId, submitted.opportunityId, submitted.runId)}
            className="inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            View the saved request and its partial results
          </Link>
        </CardContent>
      </Card>
    );
  }

  const countries = parseList(values.countries);

  return (
    <div className="max-w-3xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Product</CardTitle>
          <CardDescription>
            Loaded from the API — no need to repeat a product description.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm">
          <p className="font-medium">{productName}</p>
          <p className="text-muted-foreground">
            {[productCategory, productScientificName]
              .filter(Boolean)
              .join(" · ") || "No category recorded."}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Countries / regions</CardTitle>
          <CardDescription>
            One per line or comma-separated. Regions are allowed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormField
            label="Geography"
            htmlFor="countries"
            required
            error={fieldErrors["parameters.countries"]}
            hint="Example: Lithuania, Latvia — or a region such as Scandinavia."
          >
            <Textarea
              rows={3}
              value={values.countries}
              onChange={(event) => update("countries", event.target.value)}
              placeholder="Lithuania&#10;Latvia"
            />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Research goals</CardTitle>
          <CardDescription>Choose at least one.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {GOAL_OPTIONS.map((option) => (
            <label
              key={option.value}
              htmlFor={`goal-${option.value}`}
              className="flex items-start gap-3 text-sm"
            >
              <Input
                id={`goal-${option.value}`}
                type="checkbox"
                className="mt-0.5 size-4"
                checked={values.goals.includes(option.value)}
                onChange={() => toggleGoal(option.value)}
              />
              <span>
                <span className="font-medium">{option.label}</span>
                <span className="block text-muted-foreground">
                  {option.description}
                </span>
              </span>
            </label>
          ))}
          {fieldErrors["parameters.goals"] ? (
            <p className="text-xs font-medium text-destructive" role="alert">
              {fieldErrors["parameters.goals"]}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Segments / applications</CardTitle>
          <CardDescription>
            Optional. Proposals are editable and are never treated as facts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {SEGMENT_POLICY_OPTIONS.map((option) => (
            <label
              key={option.value}
              htmlFor={`segment-policy-${option.value}`}
              className="flex items-start gap-3 text-sm"
            >
              <Input
                id={`segment-policy-${option.value}`}
                type="radio"
                name="segmentPolicy"
                className="mt-0.5 size-4"
                checked={values.segmentPolicy === option.value}
                onChange={() => update("segmentPolicy", option.value)}
              />
              <span>
                <span className="font-medium">{option.label}</span>
                <span className="block text-muted-foreground">
                  {option.description}
                </span>
              </span>
            </label>
          ))}

          {values.segmentPolicy === "SPECIFIED" ? (
            <FormField
              label="Segments (editable proposals)"
              htmlFor="segments"
              required
              error={fieldErrors["parameters.segments"]}
              hint="One per line or comma-separated."
            >
              <Textarea
                rows={2}
                value={values.segments}
                onChange={(event) => update("segments", event.target.value)}
              />
            </FormField>
          ) : null}

          {values.goals.length > 0 ? (
            <Button variant="outline" size="sm" onClick={addSuggestedSegments}>
              Suggest segments from selected goals
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Questions and constraints (optional)</CardTitle>
          <CardDescription>
            One per line. Constraints are limits the research must respect.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField label="Questions" htmlFor="questions">
            <Textarea
              rows={3}
              value={values.questions}
              onChange={(event) => update("questions", event.target.value)}
              placeholder="One question per line"
            />
          </FormField>
          <FormField label="Constraints" htmlFor="constraints">
            <Textarea
              rows={2}
              value={values.constraints}
              onChange={(event) => update("constraints", event.target.value)}
              placeholder="One constraint per line"
            />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Standard research scope</CardTitle>
          <CardDescription>{describeStandardScope(values)}</CardDescription>
        </CardHeader>
        <CardContent>
          <details className="text-sm">
            <summary className="cursor-pointer font-medium">
              Technical limits
            </summary>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <FormField label="Max queries" htmlFor="maxQueries">
                <Input
                  type="number"
                  min={1}
                  max={200}
                  value={values.maxQueries}
                  onChange={(event) => update("maxQueries", event.target.value)}
                />
              </FormField>
              <FormField label="Max sources" htmlFor="maxSources">
                <Input
                  type="number"
                  min={1}
                  max={500}
                  value={values.maxSources}
                  onChange={(event) => update("maxSources", event.target.value)}
                />
              </FormField>
              <FormField label="Max runtime (minutes)" htmlFor="maxRuntimeMinutes">
                <Input
                  type="number"
                  min={1}
                  max={1440}
                  value={values.maxRuntimeMinutes}
                  onChange={(event) =>
                    update("maxRuntimeMinutes", event.target.value)
                  }
                />
              </FormField>
              <FormField label="Max countries" htmlFor="maxCountries">
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={values.maxCountries}
                  onChange={(event) =>
                    update("maxCountries", event.target.value)
                  }
                />
              </FormField>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              These numerical limits are separate from provider quotas (see cost
              and tool permissions below).
            </p>
          </details>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cost and tool permissions</CardTitle>
          <CardDescription>
            How the research may spend on tools. Persisted with the request.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {COST_POLICY_OPTIONS.map((option) => (
            <label
              key={option.value}
              htmlFor={`cost-${option.value}`}
              className="flex items-start gap-3 text-sm"
            >
              <Input
                id={`cost-${option.value}`}
                type="radio"
                name="costPolicy"
                className="mt-0.5 size-4"
                checked={values.costPolicy === option.value}
                onChange={() => update("costPolicy", option.value)}
              />
              <span>
                <span className="font-medium">{option.label}</span>
                <span className="block text-muted-foreground">
                  {option.description}
                </span>
              </span>
            </label>
          ))}

          {values.costPolicy === "METERED_APPROVED" ? (
            <div className="space-y-3 rounded-lg border border-border p-3">
              <p className="text-sm font-medium">
                Permitted providers and finite call limits
              </p>
              {PROVIDER_OPTIONS.map((option) => (
                <div
                  key={option.value}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm"
                >
                  <label
                    htmlFor={`meter-${option.value}`}
                    className="flex items-center gap-2"
                  >
                    <Input
                      id={`meter-${option.value}`}
                      type="checkbox"
                      className="size-4"
                      checked={values.meteredProviders.includes(option.value)}
                      onChange={() => toggleMeteredProvider(option.value)}
                    />
                    <span>
                      {option.label}
                      <span className="text-muted-foreground">
                        {option.freeTier ? " (free tier)" : " (may be billable)"}
                      </span>
                    </span>
                  </label>
                  {values.meteredProviders.includes(option.value) ? (
                    <label
                      htmlFor={`maxcalls-${option.value}`}
                      className="flex items-center gap-2 text-muted-foreground"
                    >
                      max calls
                      <Input
                        id={`maxcalls-${option.value}`}
                        type="number"
                        min={1}
                        max={500}
                        className="w-24"
                        value={values.meteredMaxCalls[option.value]}
                        onChange={(event) =>
                          update("meteredMaxCalls", {
                            ...values.meteredMaxCalls,
                            [option.value]: event.target.value,
                          })
                        }
                      />
                    </label>
                  ) : null}
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                Attempted calls (including retries and failures) count against
                these limits. A tool that reports usage only after a call cannot
                be held to a strict credit ceiling, so limits are on call counts.
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Review</CardTitle>
          <CardDescription>
            Check the request before submitting. Submitting stores it as{" "}
            <strong>Queued — waiting for researcher</strong>; it does not start
            research automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Product: </span>
            {productName}
          </p>
          <p>
            <span className="text-muted-foreground">Geography: </span>
            {countries.length > 0 ? countries.join(", ") : "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Goals: </span>
            {values.goals.length > 0
              ? values.goals.map((goal) => GOAL_LABELS[goal]).join(", ")
              : "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Segments: </span>
            {values.segmentPolicy === "IDENTIFY_DURING_RESEARCH"
              ? "Identify during research"
              : parseList(values.segments).join(", ") || "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Scope: </span>
            {describeStandardScope(values)}
          </p>
          <p>
            <span className="text-muted-foreground">Cost / tools: </span>
            {describeCostPolicy(values)}
          </p>
        </CardContent>
      </Card>

      {message ? (
        <p className="text-sm font-medium text-destructive" role="alert">
          {message}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button onClick={onSubmit} disabled={pending} size="lg">
          {pending ? "Submitting…" : "Submit research request"}
        </Button>
        <span className="text-xs text-muted-foreground">
          Research starts only when a researcher picks it up.
        </span>
      </div>
    </div>
  );
}
