"use client";

import type { ComponentType } from "react";
import { ClaudeAI, DeepSeek, Gemini, OpenAILight, PerplexityAI } from "@ridemountainpig/svgl-react";

/** The five AI assistants Narriv tests for brand visibility, with their official logos. */
export const AI_ENGINES: Array<{ key: string; name: string; Logo: ComponentType<{ className?: string }> }> = [
  { key: "chatgpt", name: "ChatGPT", Logo: OpenAILight },
  { key: "gemini", name: "Gemini", Logo: Gemini },
  { key: "claude", name: "Claude", Logo: ClaudeAI },
  { key: "perplexity", name: "Perplexity", Logo: PerplexityAI },
  { key: "deepseek", name: "DeepSeek", Logo: DeepSeek },
];
