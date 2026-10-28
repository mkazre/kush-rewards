// Admin → Users: search accounts, add users, change roles, link partners to venues, delete.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Trash2, Pencil } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { formatReviewDate } from "@shared/lib/reviewTags";
import type { AdminStore, AdminUser, AdminUserSaveInput, UserRole } from "@shared/types/api";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useToast } from "../lib/toast";
import { Empty, ErrorBox, Field, Modal, Segmented, Spinner } from "./ui";

export const ROLE_LABEL: Record<UserRole, string> = { user: "Customer", partner: "Partner", admin: "Admin" };
const ROLE_PILL: Record<UserRole, string> = {
  admin: "bg-primary text-primary-fg",
  partner: "bg-accent-soft text-accent-soft-fg",
  user: "bg-muted text-muted-fg",
};
const ROLES: UserRole[] = ["user", "partner", "admin"];

function UserEditor({ user, stores, onClose, onSaved }: { user: AdminUser | null; stores: AdminStore[]; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<AdminUserSaveInput>({
    id: user?.id ?? null,
    displayName: user?.displayName ?? "",
    email: user?.email ?? "",
    role: user?.role ?? "user",
    password: "",
    partnerStoreId: user?.partnerStoreId ?? null,
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof AdminUserSaveInput>(k: K, v: AdminUserSaveInput[K]) => setF((c) => ({ ...c, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.adminSaveUser({ ...f, partnerStoreId: f.role === "partner" ? f.partnerStoreId : null });
      onSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={user ? `Edit ${user.displayName}` : "Add user"}>
      <form className="space-y-4" onSubmit={submit}>
        <Field label="Name">
          <input className="input" required maxLength={60} value={f.displayName} onChange={(e) => set("displayName", e.target.value)} />
        </Field>
        <Field label="Email">
          <input className="input" type="email" required value={f.email} onChange={(e) => set("email", e.target.value)} />
        </Field>
        <div>
          <span className="label">Role</span>
          <Segmented options={ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }))} value={f.role} onChange={(v) => set("role", v)} />
          <p className="mt-1.5 text-xs text-muted-fg">
            {f.role === "admin" && "Full access to this admin panel."}
            {f.role === "partner" && "A venue owner or manager. Link them to their venue below."}
            {f.role === "user" && "A normal customer account: reviews, suggestions and reports."}
          </p>
        </div>
        {f.role === "partner" && (
          <Field label="Partner venue">
            <select className="input" value={f.partnerStoreId ?? ""} onChange={(e) => set("partnerStoreId", e.target.value ? Number(e.target.value) : null)}>
              <option value="">Not linked yet</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>{s.name} · {s.suburb}</option>
              ))}
            </select>
          </Field>
        )}
        <Field label={user ? "New password (optional)" : "Password"} hint={user ? "Leave blank to keep their current password. Setting one signs them out on other devices." : "At least 8 characters. Share it with them securely; they can sign in with email."}>
          <input className="input" type="text" autoComplete="new-password" required={!user} minLength={user ? undefined : 8} value={f.password} onChange={(e) => set("password", e.target.value)} />
        </Field>
        {error && <p className="text-sm font-medium text-error">{error}</p>}
        <button className="btn-primary w-full py-3" disabled={busy}>{busy ? "Saving…" : user ? "Save changes" : "Create user"}</button>
      </form>
    </Modal>
  );
}

export function UsersAdmin({ stores }: { stores: AdminStore[] }) {
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [role, setRole] = useState<UserRole | "all">("all");
  const [editing, setEditing] = useState<AdminUser | "new" | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const q = useQuery({ queryKey: ["admin", "users", debounced], queryFn: () => api.adminUsers(debounced), select: (d) => d.users });
  const users = (q.data ?? []).filter((u) => role === "all" || u.role === role);
  const refresh = () => {
    void q.refetch();
    qc.invalidateQueries({ queryKey: ["admin"], exact: true }); // overview's user count
  };

  const remove = async (u: AdminUser) => {
    if (!confirm(`Delete ${u.displayName} (${u.email})? This permanently removes their account, reviews, suggestions and reports.`)) return;
    try {
      await api.adminDeleteUser(u.id);
      toast("User deleted.");
      refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-60 flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-fg" />
          <input className="input pl-10" placeholder="Search by name or email" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <button className="btn-primary" onClick={() => setEditing("new")}><Plus size={18} /> Add user</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {(["all", ...ROLES] as const).map((r) => (
          <button key={r} className={`chip ${role === r ? "chip-on" : ""}`} onClick={() => setRole(r)}>
            {r === "all" ? "All" : `${ROLE_LABEL[r]}s`}
          </button>
        ))}
      </div>

      {q.isLoading ? (
        <Spinner />
      ) : q.error ? (
        <ErrorBox error={q.error} />
      ) : !users.length ? (
        <Empty>No users found.</Empty>
      ) : (
        <div className="card divide-y divide-border">
          {users.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary font-bold text-secondary-fg">
                {u.displayName.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {u.displayName} {u.id === me?.id && <span className="font-normal text-muted-fg">(you)</span>}
                </p>
                <p className="truncate text-sm text-muted-fg">{u.email}</p>
                <p className="text-xs text-muted-fg">
                  Joined {formatReviewDate(u.createdAt)} · {u.reviewCount} review{u.reviewCount === 1 ? "" : "s"}
                  {u.signInMethods.length > 0 && ` · signs in with ${u.signInMethods.join(", ")}`}
                  {u.partnerStoreName && ` · partner of ${u.partnerStoreName}`}
                </p>
              </div>
              <span className={`pill ${ROLE_PILL[u.role]}`}>{ROLE_LABEL[u.role]}</span>
              <div className="flex">
                <button className="btn-ghost px-2" aria-label="Edit" onClick={() => setEditing(u)}><Pencil size={16} /></button>
                {u.id !== me?.id && (
                  <button className="btn-ghost px-2 text-error" aria-label="Delete" onClick={() => remove(u)}><Trash2 size={16} /></button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <UserEditor key={editing === "new" ? "new" : editing.id} user={editing === "new" ? null : editing} stores={stores} onClose={() => setEditing(null)} onSaved={refresh} />
      )}
    </div>
  );
}
