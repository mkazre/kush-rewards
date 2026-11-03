<?php

use App\Support\ApiException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\Request;
use Illuminate\Routing\Exceptions\InvalidSignatureException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // The session token cookie is set by the API without Laravel's encryption.
        $middleware->encryptCookies(except: ['kr_token']);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Every API error is { "error": "message" }; the apps show it verbatim (HANDOVER 6.1).
        $exceptions->render(function (Throwable $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }
            [$status, $message] = match (true) {
                $e instanceof ApiException => [$e->status, $e->getMessage()],
                $e instanceof ThrottleRequestsException => [429, 'Too many requests. Please slow down and try again.'],
                $e instanceof InvalidSignatureException => [403, 'This upload link has expired. Please try again.'],
                $e instanceof HttpExceptionInterface => [$e->getStatusCode(), $e->getStatusCode() === 404 ? 'Not found' : 'Request not allowed'],
                default => [500, 'Something went wrong on our side. Please try again.'],
            };
            if ($status >= 500) {
                report($e);
            }

            return response()->json(['error' => $message], $status);
        });
    })->create();
