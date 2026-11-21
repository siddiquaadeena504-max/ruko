"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Phone, Plus, Trash2, UserRound } from "lucide-react";
import { Button, EmptyState, Notice } from "./ui";

export interface EditableContact {
  id: string;
  name: string;
  phone: string;
  relation: string;
  priority: number;
}

const RELATIONS = ["Daughter", "Son", "Spouse", "Grandchild", "Sibling", "Neighbour", "Friend", "Other"];
const MAX = 5;

/** Client-side check mirroring the server rule; the server re-validates everything. */
export function looksLikePhone(v: string) {
  const d = v.replace(/[^\d+]/g, "");
  return /^(\+91|91|0)?[6-9]\d{9}$/.test(d) || /^\+\d{8,15}$/.test(d);
}

export function ContactEditor({
  contacts,
  onAdd,
  onRemove,
  onMove,
  compact,
}: {
  contacts: EditableContact[];
  onAdd: (c: { name: string; phone: string; relation: string }) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onMove: (id: string, dir: "up" | "down") => Promise<void>;
  compact?: boolean;
}) {
  const [adding, setAdding] = useState(contacts.length === 0 && !compact);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relation, setRelation] = useState("Daughter");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Please enter a name.");
    if (!looksLikePhone(phone)) return setError("Please enter a valid mobile number, e.g. 98765 43210.");
    setBusy("add");
    try {
      await onAdd({ name: name.trim(), phone: phone.trim(), relation });
      setName("");
      setPhone("");
      setAdding(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save this contact.");
    } finally {
      setBusy(null);
    }
  }

  async function run(id: string, fn: () => Promise<void>) {
    setBusy(id);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  const sorted = [...contacts].sort((a, b) => a.priority - b.priority);

  return (
    <div className="space-y-4">
      {sorted.length === 0 && !adding && (
        <EmptyState icon={<UserRound className="h-6 w-6" />} title="No trusted contacts yet">
          Add someone Ruko can alert when a call looks like a scam.
        </EmptyState>
      )}

      {sorted.length > 0 && (
        <ol className="space-y-3" aria-label="Trusted contacts, in the order they will be alerted">
          {sorted.map((c, i) => (
            <li key={c.id} className="flex items-center gap-3 rounded-2xl border-2 border-line bg-white p-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-lavender-soft text-base font-bold text-lavender-deep" aria-label={`Priority ${i + 1}`}>
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{c.name}</p>
                <p className="truncate text-base text-navy-soft">
                  {c.relation ? `${c.relation} · ` : ""}
                  <span className="tabular-nums">{c.phone}</span>
                </p>
              </div>
              <div className="flex shrink-0 items-center">
                <button
                  className="rounded-xl p-2.5 text-navy-soft hover:bg-navy/5 disabled:opacity-30"
                  onClick={() => run(c.id, () => onMove(c.id, "up"))}
                  disabled={i === 0 || busy !== null}
                  aria-label={`Move ${c.name} up`}
                >
                  <ArrowUp className="h-5 w-5" />
                </button>
                <button
                  className="rounded-xl p-2.5 text-navy-soft hover:bg-navy/5 disabled:opacity-30"
                  onClick={() => run(c.id, () => onMove(c.id, "down"))}
                  disabled={i === sorted.length - 1 || busy !== null}
                  aria-label={`Move ${c.name} down`}
                >
                  <ArrowDown className="h-5 w-5" />
                </button>
                <button
                  className="rounded-xl p-2.5 text-coral-dark hover:bg-coral-soft disabled:opacity-30"
                  onClick={() => run(c.id, () => onRemove(c.id))}
                  disabled={busy !== null}
                  aria-label={`Remove ${c.name}`}
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}

      {sorted.length > 1 && <p className="text-base text-navy-soft">If number 1 doesn’t respond, Ruko will alert the next person.</p>}

      {error && <Notice tone="warn">{error}</Notice>}

      {adding ? (
        <form onSubmit={submit} className="space-y-4 rounded-2xl bg-lavender-mist p-4" noValidate>
          <div>
            <label className="label" htmlFor="c-name">Name</label>
            <input id="c-name" className="field" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" placeholder="e.g. Priya" maxLength={60} />
          </div>
          <div>
            <label className="label" htmlFor="c-rel">Relation</label>
            <select id="c-rel" className="field" value={relation} onChange={(e) => setRelation(e.target.value)}>
              {RELATIONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="c-phone">Mobile number</label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-navy-faint" aria-hidden />
              <input
                id="c-phone"
                className="field pl-12 tabular-nums"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                autoComplete="off"
                placeholder="98765 43210"
                maxLength={20}
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Button type="submit" loading={busy === "add"} className="flex-1">
              Save contact
            </Button>
            {sorted.length > 0 && (
              <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      ) : (
        sorted.length < MAX && (
          <Button variant="secondary" icon={<Plus className="h-5 w-5" />} onClick={() => setAdding(true)} className="w-full">
            Add a trusted contact
          </Button>
        )
      )}
    </div>
  );
}
