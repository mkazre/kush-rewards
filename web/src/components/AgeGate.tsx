// Date-of-birth age gate (HANDOVER 3.2). Only pass/fail is stored in this browser; the date never leaves it.
import { useRef, useState, type FormEvent } from "react";
import { store } from "../lib/prefs";
import { BrandHeader } from "./Brand";

export const AGE_KEY = "kr-age-ok";

function ageFrom(d: number, m: number, y: number): number | null {
  const dob = new Date(y, m - 1, d);
  const now = new Date();
  if (y < 1900 || dob.getFullYear() !== y || dob.getMonth() !== m - 1 || dob.getDate() !== d || dob > now) return null;
  let age = now.getFullYear() - y;
  if (now.getMonth() < m - 1 || (now.getMonth() === m - 1 && now.getDate() < d)) age--;
  return age;
}

export function AgeGate({ onPass }: { onPass: () => void }) {
  const [dd, setDd] = useState("");
  const [mm, setMm] = useState("");
  const [yyyy, setYyyy] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(store.get(AGE_KEY) === "0");
  const mmRef = useRef<HTMLInputElement>(null);
  const yyRef = useRef<HTMLInputElement>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!dd || !mm || yyyy.length !== 4) return setError("Enter your full date of birth.");
    const age = ageFrom(+dd, +mm, +yyyy);
    if (age === null) return setError("That date doesn't look right. Please check it.");
    if (age < 18) {
      store.set(AGE_KEY, "0");
      return setBlocked(true);
    }
    store.set(AGE_KEY, "1");
    onPass();
  };

  const digits = (v: string, max: number) => v.replace(/\D/g, "").slice(0, max);
  const box = "input w-full text-center text-lg font-semibold tracking-widest";

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <BrandHeader />
        </div>
        {blocked ? (
          <div className="card p-6 text-center">
            <h1 className="text-2xl font-bold">Sorry, adults only</h1>
            <p className="mt-2 text-muted-fg">You need to be 18 or older to use KushRewards SA.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="card p-6" noValidate>
            <h1 className="text-2xl font-bold">Enter your date of birth</h1>
            <p className="mt-2 text-sm text-muted-fg">
              KushRewards SA is a guide to cannabis clubs and venues in South Africa for adults aged 18 and over.
            </p>
            <div className="mt-6 grid grid-cols-[1fr_1fr_1.6fr] gap-2">
              <input aria-label="Day" placeholder="DD" inputMode="numeric" className={box} value={dd}
                onChange={(e) => { const v = digits(e.target.value, 2); setDd(v); if (v.length === 2) mmRef.current?.focus(); }} />
              <input ref={mmRef} aria-label="Month" placeholder="MM" inputMode="numeric" className={box} value={mm}
                onChange={(e) => { const v = digits(e.target.value, 2); setMm(v); if (v.length === 2) yyRef.current?.focus(); }} />
              <input ref={yyRef} aria-label="Year" placeholder="YYYY" inputMode="numeric" className={box} value={yyyy}
                onChange={(e) => setYyyy(digits(e.target.value, 4))} />
            </div>
            {error && <p className="mt-3 text-sm font-medium text-error">{error}</p>}
            <button className="btn-primary mt-5 w-full py-3">Continue</button>
            <p className="mt-4 text-center text-xs text-muted-fg">
              We don't store your date of birth. KushRewards doesn't sell cannabis or take orders.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
