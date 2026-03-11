"use client";

import React from "react";
import { redirect } from "next/navigation";

export default function IdeaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  redirect(`/lab/${id}/layer1`);
}
