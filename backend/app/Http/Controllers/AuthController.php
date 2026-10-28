<?php

namespace App\Http\Controllers;

use App\Support\ApiException;
use App\Support\Auth;
use App\Support\IdTokens;
use App\Support\Input;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/** HANDOVER 5 and 6.3. */
class AuthController extends Controller
{
    public function session(Request $r): JsonResponse
    {
        $user = $this->requireUser($r, 'Not signed in.');

        return response()->json(['user' => Auth::userJson($user)]);
    }

    public function google(Request $r): JsonResponse
    {
        $this->throttle('oauth:'.$r->ip(), 30, 600, 'Too many attempts. Please try again in a few minutes.');
        $claims = IdTokens::google(Input::str($r, 'idToken'));
        if (! $claims) {
            throw new ApiException(401, 'Google sign-in failed. Please try again.');
        }
        $user = Auth::findOrCreateOAuthUser('google', $claims['sub'], $claims['email'], $claims['name'] ?? explode('@', $claims['email'])[0], $claims['picture'] ?? null);

        return $this->signedIn($user);
    }

    public function apple(Request $r): JsonResponse
    {
        $this->throttle('oauth:'.$r->ip(), 30, 600, 'Too many attempts. Please try again in a few minutes.');
        $claims = IdTokens::apple(Input::str($r, 'identityToken'));
        if (! $claims) {
            throw new ApiException(401, 'Apple sign-in failed. Please try again.');
        }
        // Apple sends the name only on the very first sign-in.
        $name = trim(Input::str($r, 'givenName').' '.Input::str($r, 'familyName'));
        $email = $claims['email'] ?? ($claims['sub'].'@privaterelay.appleid.com');
        if ($name === '') {
            $name = explode('@', $email)[0] ?: 'KushRewards user';
        }

        return $this->signedIn(Auth::findOrCreateOAuthUser('apple', $claims['sub'], $email, $name, null));
    }

    public function login(Request $r): JsonResponse
    {
        $email = mb_strtolower(Input::str($r, 'email'));
        $password = (string) $r->input('password', '');

        // 5 failures in 15 minutes lock the email for 15 minutes.
        $fails = DB::table('login_attempts')->where('email', $email)->where('success', false)
            ->where('attempted_at', '>', now()->subMinutes(15))->orderByDesc('attempted_at')->limit(5)->pluck('attempted_at');
        if ($fails->count() >= 5) {
            $unlock = \Illuminate\Support\Carbon::parse($fails->first())->addMinutes(15);
            $mins = max(1, (int) ceil(now()->diffInSeconds($unlock) / 60));
            throw new ApiException(429, "Too many attempts. Try again in $mins minute".($mins === 1 ? '' : 's').'.');
        }

        $user = DB::table('users')->where('email', $email)->first();
        $hash = $user ? DB::table('user_passwords')->where('user_id', $user->id)->value('password_hash') : null;
        $ok = $hash && Hash::check($password, $hash);
        DB::table('login_attempts')->insert(['email' => $email, 'attempted_at' => now(), 'success' => $ok]);
        if (! $ok) {
            throw new ApiException(401, 'Invalid email or password');
        }

        return $this->signedIn($user);
    }

    public function register(Request $r): JsonResponse
    {
        $this->throttle('register:'.$r->ip(), 10, 3600, 'Too many sign-ups from here. Please try again later.');
        $email = mb_strtolower(Input::str($r, 'email'));
        $password = (string) $r->input('password', '');
        $name = Input::reqStr($r, 'displayName', 1, 60, 'Enter your name.');
        if (! filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 200) {
            Input::fail('Enter a valid email address.');
        }
        if (mb_strlen($password) < 8) {
            Input::fail('Use a password of at least 8 characters.');
        }
        if (DB::table('users')->where('email', $email)->exists()) {
            throw new ApiException(409, 'An account with this email already exists.');
        }

        $id = DB::transaction(function () use ($email, $name, $password) {
            $id = DB::table('users')->insertGetId([
                'email' => $email, 'display_name' => $name, 'role' => 'user',
                'created_at' => now(), 'updated_at' => now(),
            ]);
            DB::table('user_passwords')->insert(['user_id' => $id, 'password_hash' => Hash::make($password), 'created_at' => now()]);

            return $id;
        });

        return $this->signedIn(DB::table('users')->where('id', $id)->first());
    }

    public function logout(Request $r): JsonResponse
    {
        Auth::revoke($r);

        return response()->json(['ok' => true])->withCookie(Auth::forgetCookie());
    }

    public function acceptTerms(Request $r): JsonResponse
    {
        $user = $this->requireUser($r);
        $at = $user->terms_accepted_at ?? now();
        DB::table('users')->where('id', $user->id)->update(['terms_accepted_at' => $at, 'updated_at' => now()]);

        return response()->json(['termsAcceptedAt' => \App\Support\Format::date($at)]);
    }

    public function deleteAccount(Request $r): JsonResponse
    {
        $user = $this->requireUser($r);
        if ($user->role === 'admin' && DB::table('users')->where('role', 'admin')->count() <= 1) {
            Input::fail("You're the only admin. Make someone else an admin before deleting your account.");
        }
        DB::transaction(function () use ($user) {
            DB::table('login_attempts')->where('email', $user->email)->delete();
            DB::table('users')->where('id', $user->id)->delete(); // foreign keys remove or null out everything else
        });

        return response()->json(['ok' => true])->withCookie(Auth::forgetCookie());
    }

    private function signedIn(object $user): JsonResponse
    {
        $token = Auth::issue((int) $user->id);

        return response()->json(['token' => $token, 'user' => Auth::userJson($user)])->withCookie(Auth::cookie($token));
    }
}
