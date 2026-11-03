<?php

namespace App\Http\Controllers;

use App\Support\ApiException;
use App\Support\Format;
use App\Support\Input;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/** Admin → Users: list, add, edit role/details and delete accounts. */
class UserAdminController extends Controller
{
    private const ROLES = ['user', 'partner', 'admin'];

    public function list(Request $r): JsonResponse
    {
        $this->requireAdmin($r);
        $q = DB::table('users as u')
            ->leftJoin('stores as s', 's.id', '=', 'u.partner_store_id')
            ->select('u.*', 's.name as partner_store_name')
            ->selectSub(DB::table('reviews')->whereColumn('user_id', 'u.id')->selectRaw('count(*)'), 'review_count')
            ->selectSub(DB::table('user_passwords')->whereColumn('user_id', 'u.id')->selectRaw('count(*)'), 'has_password')
            ->selectSub(DB::table('oauth_accounts')->whereColumn('user_id', 'u.id')->selectRaw("group_concat(provider)"), 'providers')
            ->orderByRaw("case u.role when 'admin' then 0 when 'partner' then 1 else 2 end")
            ->orderByDesc('u.created_at')
            ->limit(300);

        $search = mb_strtolower(Input::str($r, 'q'));
        if ($search !== '') {
            $q->where(fn ($w) => $w->where('u.email', 'like', "%$search%")->orWhereRaw('lower(u.display_name) like ?', ["%$search%"]));
        }
        if (in_array($role = $r->query('role'), self::ROLES, true)) {
            $q->where('u.role', $role);
        }

        $users = $q->get()->map(fn ($u) => [
            'id' => (int) $u->id,
            'email' => $u->email,
            'displayName' => $u->display_name,
            'role' => $u->role,
            'partnerStoreId' => $u->partner_store_id !== null ? (int) $u->partner_store_id : null,
            'partnerStoreName' => $u->partner_store_name,
            'reviewCount' => (int) $u->review_count,
            'signInMethods' => array_values(array_filter([
                $u->has_password ? 'email' : null,
                ...explode(',', (string) $u->providers),
            ])),
            'termsAcceptedAt' => Format::date($u->terms_accepted_at),
            'createdAt' => Format::date($u->created_at),
        ]);

        return response()->json(['users' => $users]);
    }

    /** Create (id null) or update a user. A password is required when creating. */
    public function save(Request $r): JsonResponse
    {
        $me = $this->requireAdmin($r);
        $id = $r->input('id');
        $name = Input::reqStr($r, 'displayName', 1, 60, 'Enter a name.');
        $email = mb_strtolower(Input::str($r, 'email'));
        if (! filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 200) {
            Input::fail('Enter a valid email address.');
        }
        $role = Input::oneOf($r, 'role', self::ROLES, 'Pick a role.');
        $password = (string) $r->input('password', '');
        if (($id === null || $password !== '') && mb_strlen($password) < 8) {
            Input::fail('Use a password of at least 8 characters.');
        }
        $storeId = $r->input('partnerStoreId');
        if ($role === 'partner' && $storeId !== null) {
            if (! DB::table('stores')->where('id', (int) $storeId)->exists()) {
                Input::fail('Pick a venue for this partner.');
            }
            $storeId = (int) $storeId;
        } else {
            $storeId = null;
        }
        $clash = DB::table('users')->where('email', $email)->when($id !== null, fn ($q) => $q->where('id', '!=', (int) $id))->exists();
        if ($clash) {
            throw new ApiException(409, 'An account with this email already exists.');
        }

        $fields = ['display_name' => $name, 'email' => $email, 'role' => $role, 'partner_store_id' => $storeId, 'updated_at' => now()];

        $id = DB::transaction(function () use ($id, $fields, $password, $me, $role) {
            if ($id === null) {
                $id = DB::table('users')->insertGetId([...$fields, 'created_at' => now()]);
            } else {
                $id = (int) $id;
                $existing = DB::table('users')->where('id', $id)->lockForUpdate()->first();
                if (! $existing) {
                    throw new ApiException(404, 'User not found');
                }
                if ($existing->role === 'admin' && $role !== 'admin' && DB::table('users')->where('role', 'admin')->count() <= 1) {
                    Input::fail("This is the only admin. Make someone else an admin first.");
                }
                if ($id === (int) $me->id && $role !== 'admin') {
                    Input::fail("You can't remove your own admin access.");
                }
                DB::table('users')->where('id', $id)->update($fields);
            }
            if ($password !== '') {
                DB::table('user_passwords')->updateOrInsert(['user_id' => $id], ['password_hash' => Hash::make($password), 'created_at' => now()]);
                DB::table('auth_sessions')->where('user_id', $id)->where('user_id', '!=', $me->id)->delete(); // new password signs them out elsewhere
            }

            return $id;
        });

        return response()->json(['id' => $id]);
    }

    public function delete(Request $r): JsonResponse
    {
        $me = $this->requireAdmin($r);
        $id = Input::int($r, 'id');
        if ($id === (int) $me->id) {
            Input::fail('To delete your own account, use Profile → Delete my account.');
        }
        $user = DB::table('users')->where('id', $id)->first();
        if (! $user) {
            throw new ApiException(404, 'User not found');
        }
        DB::transaction(function () use ($user) {
            DB::table('login_attempts')->where('email', $user->email)->delete();
            DB::table('users')->where('id', $user->id)->delete();
        });

        return response()->json(['ok' => true]);
    }
}
