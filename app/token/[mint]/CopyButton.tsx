"use client";

import { useState } from "react";

export default function CopyButton({ text }: { text: string }) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="mt-1 flex items-center gap-1.5 font-mono text-sm text-muted transition-colors hover:text-accent"
    >
      <span>{text}</span>
      <span className="text-xs">{isCopied ? "✓ copied" : "copy"}</span>
    </button>
  );
}
