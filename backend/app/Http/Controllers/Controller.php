<?php

namespace App\Http\Controllers;

use App\Support\ApiException;
use App\Support\Auth;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

abstract class Controller
{
    /** The signed-in user, or null (the token is resolved once per request). */
    protected function user(Request $r): ?object
    {
        if (! $r->attributes->has('kr_user')) {
            $r->attributes->set('kr_user', Auth::resolve($r));
        }

        return $r->attributes->get('kr_user');
    }

    protected function requireUser(Request $r, string $message = 'Please sign in first.'): object
    {
        return $this->user($r) ?? throw new ApiException(401, $message);
    }

    /** Signed in and has accepted the Community Rules (HANDOVER 6.2 "user + rules"). */
    protected function requirePoster(Request $r): object
    {
        $user = $this->requireUser($r);
        if (! $user->terms_accepted_at) {
            throw new ApiException(403, 'Please accept the Community Rules first.');
        }

        return $user;
    }

    protected function requireAdmin(Request $r): object
    {
        $user = $this->requireUser($r);
        if ($user->role !== 'admin') {
            throw new ApiException(403, 'Only the app owner can do this.');
        }

        return $user;
    }

    /** Simple per-key rate limit; throws 429 with a friendly message. */
    protected function throttle(string $key, int $max, int $decaySeconds, string $message): void
    {
        if (RateLimiter::tooManyAttempts($key, $max)) {
            throw new ApiException(429, $message);
        }
        RateLimiter::hit($key, $decaySeconds);
    }
}
