"use client";
import { use } from "react";
import ComingSoon from "@/components/layout/ComingSoon";
export default function PlaceholderPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const unwrappedParams = use(params);
  const title = unwrappedParams.slug.join(" ").replace(/-/g, " ").toUpperCase();
  return <ComingSoon title={`MENTOR ${title}`} />;
}
