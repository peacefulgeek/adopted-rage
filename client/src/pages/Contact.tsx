import { useState } from "react";
import { toast } from "sonner";

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message: msg }),
      });
      if (!r.ok) throw new Error(`${r.status}`);
      setSent(true);
      toast.success("Thank you. We received it.");
    } catch {
      toast.error("Couldn't send. Please email us directly later.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container max-w-2xl py-12 md:py-20">
      <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--clay)] mb-3">Contact</div>
      <h1 className="text-4xl md:text-5xl font-medium mb-3" style={{ fontFamily: "var(--font-display)" }}>Write to us.</h1>
      <p className="text-foreground/75 mb-8">
        If a piece landed for you — or if one missed you completely — we want to know. Replies may be slow; we read everything.
      </p>
      {sent ? (
        <div className="rounded-2xl bg-[var(--cream)] border border-border p-6">
          <p>Thank you. The note is in the inbox of the person who writes here.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Field label="Your name" value={name} onChange={setName} />
          <Field label="Email" type="email" value={email} onChange={setEmail} required />
          <div>
            <label className="block text-sm mb-1.5">Your message</label>
            <textarea
              required
              rows={6}
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              className="w-full rounded-xl border border-border bg-card px-4 py-3 outline-none focus:ring-2 focus:ring-[var(--teal)]"
            />
          </div>
          <button
            disabled={busy}
            className="px-5 py-3 rounded-full bg-[var(--foreground)] text-white hover:bg-[var(--clay)] transition disabled:opacity-50"
          >
            {busy ? "Sending…" : "Send"}
          </button>
        </form>
      )}
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", required = false,
}: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm mb-1.5">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-border bg-card px-4 py-3 outline-none focus:ring-2 focus:ring-[var(--teal)]"
      />
    </div>
  );
}
