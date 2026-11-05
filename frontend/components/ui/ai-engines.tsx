"use client";

import type { ComponentType } from "react";
import { ClaudeAI, DeepSeek, Gemini, OpenAILight, PerplexityAI } from "@ridemountainpig/svgl-react";
import { cn } from "@/lib/utils";

// Perplexity's mark is drawn with hairline strokes that vanish at icon size, so it is thickened.
function Perplexity({ className }: { className?: string }) {
  return <PerplexityAI className={cn("[&_path]:[stroke-width:3.4]", className)} />;
}

/** The five AI assistants Narriv tests for brand visibility, with their official logos. */
export const AI_ENGINES: Array<{ key: string; name: string; Logo: ComponentType<{ className?: string }> }> = [
  { key: "chatgpt", name: "ChatGPT", Logo: OpenAILight },
  { key: "gemini", name: "Gemini", Logo: Gemini },
  { key: "claude", name: "Claude", Logo: ClaudeAI },
  { key: "perplexity", name: "Perplexity", Logo: Perplexity },
  { key: "deepseek", name: "DeepSeek", Logo: DeepSeek },
];
