"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { VersionedTransaction } from "@solana/web3.js";
import Navbar from "@/components/Navbar";
import Image from "next/image";

interface FormErrors {
  [key: string]: string[] | undefined;
}

type LaunchStep = "idle" | "uploading" | "signing" | "confirming" | "buying";

export default function LaunchPage() {
  const router = useRouter();
  const { publicKey, signTransaction, connected } = useWallet();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<LaunchStep>("idle");
  const [errors, setErrors] = useState<FormErrors>({});
  const [preview, setPreview] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    symbol: "",
    description: "",
    twitter: "",
    telegram: "",
    website: "",
    initialBuyAmount: 0.0001,
  });

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "initialBuyAmount" ? Number(value) : value,
    }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setErrors((prev) => ({ ...prev, image: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!connected || !publicKey || !signTransaction) {
      setErrors({ form: ["Connect your wallet first"] });
      return;
    }

    setErrors({});

    try {
      // Step 1: Upload metadata + build transactions
      setStep("uploading");
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
      formData.append("userPublicKey", publicKey.toBase58());

      const imageFile = fileInputRef.current?.files?.[0];
      if (imageFile) {
        formData.append("image", imageFile);
      }

      const prepRes = await fetch("/api/tokens/prepare", {
        method: "POST",
        body: formData,
      });

      const prepData = await prepRes.json();

      if (!prepRes.ok) {
        setErrors(
          typeof prepData.error === "object"
            ? prepData.error
            : { form: [prepData.error] }
        );
        setStep("idle");
        return;
      }

      // Step 2: User signs funding TX
      setStep("signing");
      const fundingTxBuffer = Buffer.from(prepData.fundingTransaction, "base64");
      const fundingTx = VersionedTransaction.deserialize(fundingTxBuffer);
      const signedFundingTx = await signTransaction(fundingTx);

      // Step 3: Send funding + create TXs sequentially via RPC
      setStep("confirming");
      const confirmRes = await fetch("/api/tokens/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signedFundingTx: Buffer.from(signedFundingTx.serialize()).toString("base64"),
          signedCreateTx: prepData.createTransaction,
          mintAddress: prepData.mintAddress,
          name: form.name,
          symbol: form.symbol.toUpperCase(),
          creatorWallet: prepData.creatorWallet,
          initialBuyAmount: form.initialBuyAmount,
          userPublicKey: publicKey.toBase58(),
        }),
      });

      const confirmData = await confirmRes.json();

      if (!confirmRes.ok) {
        setErrors({ form: [confirmData.error || "Launch failed"] });
        setStep("idle");
        return;
      }

      // Step 4: If server returned an unsigned buy TX, sign and send it
      if (confirmData.unsignedBuyTx) {
        setStep("buying");
        const buyTxBuffer = Buffer.from(confirmData.unsignedBuyTx, "base64");
        const buyTx = VersionedTransaction.deserialize(buyTxBuffer);
        const signedBuyTx = await signTransaction(buyTx);

        const buyRes = await fetch("/api/tokens/buy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            signedBuyTx: Buffer.from(signedBuyTx.serialize()).toString("base64"),
          }),
        });

        const buyData = await buyRes.json();
        if (!buyRes.ok) {
          console.error("Dev buy failed (non-fatal):", buyData.error);
        }
      }

      router.push(`/token/${prepData.mintAddress}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Launch failed";
      setErrors({ form: [message] });
      setStep("idle");
    }
  }

  const isSubmitting = step !== "idle";

  const stepLabels: Record<LaunchStep, string> = {
    idle: "launch token",
    uploading: "uploading metadata...",
    signing: "approve in wallet...",
    confirming: "creating token on-chain...",
    buying: "approve dev buy in wallet...",
  };

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-2xl px-6 pb-20 pt-28">
        <h1 className="font-heading text-3xl font-bold">launch a token</h1>
        <p className="mt-2 text-muted">
          100% of creator fees auto-buy your token. forever.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {/* Image Upload */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              token image *
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex h-40 w-40 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-white/10 bg-surface transition-colors hover:border-accent/40"
            >
              {preview ? (
                <Image
                  src={preview}
                  alt="Token preview"
                  width={160}
                  height={160}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-sm text-muted">click to upload</span>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              onChange={handleImageChange}
              className="hidden"
            />
            {errors.image && (
              <p className="mt-1 text-sm text-red-400">{errors.image[0]}</p>
            )}
          </div>

          {/* Name & Symbol */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="name *"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. FeedPump"
              maxLength={32}
              error={errors.name}
            />
            <Field
              label="symbol *"
              name="symbol"
              value={form.symbol}
              onChange={handleChange}
              placeholder="e.g. FEED"
              maxLength={10}
              className="uppercase"
              error={errors.symbol}
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              description *
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="what makes your token special?"
              maxLength={500}
              rows={3}
              className="w-full rounded-lg border border-white/10 bg-surface px-4 py-3 text-sm text-text placeholder:text-muted/60 focus:border-accent/50 focus:outline-none"
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-400">
                {errors.description[0]}
              </p>
            )}
          </div>

          {/* Socials */}
          <div className="space-y-4">
            <p className="text-sm font-medium text-muted">socials (optional)</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field
                label="twitter"
                name="twitter"
                value={form.twitter}
                onChange={handleChange}
                placeholder="https://x.com/..."
                error={errors.twitter}
              />
              <Field
                label="telegram"
                name="telegram"
                value={form.telegram}
                onChange={handleChange}
                placeholder="https://t.me/..."
                error={errors.telegram}
              />
              <Field
                label="website"
                name="website"
                value={form.website}
                onChange={handleChange}
                placeholder="https://..."
                error={errors.website}
              />
            </div>
          </div>

          {/* Initial Buy */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              initial dev buy (SOL)
            </label>
            <input
              type="number"
              name="initialBuyAmount"
              value={form.initialBuyAmount}
              onChange={handleChange}
              min={0}
              max={100}
              step={0.01}
              className="w-full rounded-lg border border-white/10 bg-surface px-4 py-3 text-sm text-text placeholder:text-muted/60 focus:border-accent/50 focus:outline-none"
            />
            <p className="mt-1 text-xs text-muted">
              buy your own token at launch (min 0.0001, max 100 SOL).
            </p>
            {errors.initialBuyAmount && (
              <p className="mt-1 text-sm text-red-400">
                {errors.initialBuyAmount[0]}
              </p>
            )}
          </div>

          {/* How it works */}
          <div className="rounded-lg border border-accent/20 bg-accent/5 p-4 space-y-2">
            <p className="text-sm font-medium text-accent">how feedpump works</p>
            <ol className="text-sm text-accent/80 list-decimal list-inside space-y-1">
              <li>your wallet funds a dedicated creator wallet</li>
              <li>that wallet creates the token (it&apos;s the permanent creator)</li>
              <li>100% of creator fees auto-buy the token forever</li>
            </ol>
            <p className="text-xs text-muted mt-2">
              transactions execute sequentially — fund, create, then buy.
            </p>
          </div>

          {errors.form && (
            <p className="text-sm text-red-400">{errors.form[0]}</p>
          )}

          {!connected ? (
            <div className="rounded-lg border border-white/10 bg-surface p-4 text-center text-sm text-muted">
              connect your wallet above to launch
            </div>
          ) : isSubmitting ? (
            <div className="w-full rounded-lg border border-accent/30 bg-accent/5 p-6">
              <div className="flex flex-col items-center gap-4">
                {/* Spinner */}
                <div className="relative h-10 w-10">
                  <div className="absolute inset-0 rounded-full border-2 border-accent/20" />
                  <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-accent" />
                </div>

                {/* Step label */}
                <p className="text-sm font-medium text-accent animate-pulse">
                  {stepLabels[step]}
                </p>

                {/* Progress dots */}
                <div className="flex items-center gap-2">
                  {(["uploading", "signing", "confirming", "buying"] as LaunchStep[]).map(
                    (s, i) => {
                      const steps: LaunchStep[] = ["uploading", "signing", "confirming", "buying"];
                      const currentIdx = steps.indexOf(step);
                      const isDone = i < currentIdx;
                      const isActive = s === step;
                      return (
                        <div key={s} className="flex items-center gap-2">
                          <div
                            className={`h-2 w-2 rounded-full transition-all duration-300 ${
                              isDone
                                ? "bg-accent"
                                : isActive
                                  ? "bg-accent animate-pulse scale-125"
                                  : "bg-white/10"
                            }`}
                          />
                          {i < 3 && (
                            <div
                              className={`h-px w-6 transition-colors duration-300 ${
                                isDone ? "bg-accent/60" : "bg-white/10"
                              }`}
                            />
                          )}
                        </div>
                      );
                    }
                  )}
                </div>

                {(step === "signing" || step === "buying") && (
                  <p className="text-xs text-muted">
                    check your Phantom wallet for the approval prompt
                  </p>
                )}
              </div>
            </div>
          ) : (
            <button
              type="submit"
              className="w-full rounded-lg bg-accent py-3 text-base font-semibold text-bg transition-colors hover:bg-accent-hover"
            >
              {stepLabels[step]}
            </button>
          )}
        </form>
      </main>
    </>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  placeholder,
  maxLength,
  className,
  error,
}: {
  label: string;
  name: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  maxLength?: number;
  className?: string;
  error?: string[];
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium">{label}</label>
      <input
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        maxLength={maxLength}
        className={`w-full rounded-lg border border-white/10 bg-surface px-4 py-3 text-sm text-text placeholder:text-muted/60 focus:border-accent/50 focus:outline-none ${className ?? ""}`}
      />
      {error && <p className="mt-1 text-sm text-red-400">{error[0]}</p>}
    </div>
  );
}
