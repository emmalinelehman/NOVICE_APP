import { useState, type ReactNode } from "react";
import { ArrowLeft, LoaderCircle, Sparkles } from "lucide-react";
import { photoFor } from "@/lib/photos";

export function Logo() {
  return (
    <div className="logo">
      <span>NOVICE</span>
      <small>Be new together.</small>
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = "primary",
  type = "button",
  disabled,
  busy,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "text";
  type?: "button" | "submit";
  disabled?: boolean;
  busy?: boolean;
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`btn btn-${variant} ${className}`}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
    >
      {busy && <LoaderCircle size={17} className="spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function Badge({
  children,
  tone = "sage",
}: {
  children: ReactNode;
  tone?: "sage" | "rust" | "ink";
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className={error ? "field error" : "field"}>
      <span>{label}</span>
      {children}
      {error ? <small>{error}</small> : hint ? <em className="field-hint">{hint}</em> : null}
    </label>
  );
}

export function Empty({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <Sparkles size={25} />
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}

export function Back({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button className="back" onClick={onClick}>
      <ArrowLeft size={17} /> {label}
    </button>
  );
}

// Interest photo with a designed fallback for custom interests or images that fail to load.
export function Photo({
  name,
  className = "",
  alt,
}: {
  name: string;
  className?: string;
  alt?: string;
}) {
  const src = photoFor(name);
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={`${className} photo-fallback`} role="img" aria-label={alt ?? name}>
        <span>{name.trim().slice(0, 1).toUpperCase()}</span>
      </div>
    );
  }
  return (
    <img
      className={className}
      src={src}
      alt={alt ?? `People trying ${name.toLowerCase()}`}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

export function PageLoading() {
  return (
    <div className="page-loading" role="status">
      <LoaderCircle size={26} className="spin" aria-hidden="true" />
      <span>Loading</span>
    </div>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="error-banner" role="alert">
      <span>{message}</span>
      {onRetry && (
        <button type="button" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
