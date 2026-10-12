'use client';

import React from 'react';
import { he } from './he';

// שכבת תרגום מקומית (מחליפה את gt-next). המשחק בעברית בלבד.
// מחרוזות המקור נשארות באנגלית בקוד, והמילון ב-he.ts מתרגם אותן.

function interpolate(text: string, vars?: Record<string, unknown>): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, key) =>
    key in vars ? String(vars[key]) : match,
  );
}

export function translate(source: string, vars?: Record<string, unknown>): string {
  return interpolate(he[source] ?? source, vars);
}

// מסמן מחרוזת לתרגום ומחזיר אותה כמו שהיא (התרגום מתבצע בזמן הצגה).
export function msg(source: string): string {
  return source;
}

export function useGT(): (source: string, vars?: Record<string, unknown>) => string {
  return translate;
}

export function useMessages(): (source: string, vars?: Record<string, unknown>) => string {
  return translate;
}

export function T({ children }: { children?: React.ReactNode }): React.ReactElement {
  if (typeof children === 'string') return <>{translate(children.trim())}</>;
  return <>{children}</>;
}

export function Var({ children }: { children?: React.ReactNode }): React.ReactElement {
  return <>{children}</>;
}
