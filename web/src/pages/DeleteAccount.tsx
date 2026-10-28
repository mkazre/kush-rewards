// Public account-deletion page required by Google Play (HANDOVER 10). No age gate.
import { useState } from "react";
import { useAuth } from "../lib/auth";
import { useToast } from "../lib/toast";
import { LoginForm } from "./Login";

export default function DeleteAccount() {
  const { user, deleteAccount, signOut } = useAuth();
  const toast = useToast();
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const del = async () => {
    if (!confirm("Delete your account? This can't be undone.")) return;
    setBusy(true);
    try {
      await deleteAccount();
      setDone(true);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-5">
      <h1 className="text-3xl font-extrabold">Delete your KushRewards account</h1>
      <p className="text-muted-fg">
        Deleting your account permanently removes your account, your reviews, venue suggestions and reports. Contact counts we recorded stay, but are no longer
        linked to you. It happens immediately and can't be undone.
      </p>
      <div className="card p-6">
        {done ? (
          <p className="text-center font-semibold">Your account has been deleted.</p>
        ) : user ? (
          <div className="space-y-4">
            <p>
              Signed in as <strong>{user.email}</strong>.
            </p>
            <button className="btn-danger w-full py-3" onClick={del} disabled={busy}>Permanently delete my account</button>
            <button className="btn-ghost w-full" onClick={signOut}>This isn't me – sign out</button>
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm font-semibold">Sign in to the account you want to delete.</p>
            <LoginForm />
          </>
        )}
      </div>
    </div>
  );
}
