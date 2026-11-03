<?php

use Illuminate\Support\Facades\Route;

// Everything outside /api is the React website (built into public/app by `npm run build` in /web).
// Serving index.html for every path lets links like /privacy and /venue/12 open directly.
Route::fallback(function () {
    abort_if(request()->is('api/*'), 404);
    $index = public_path('app/index.html');
    abort_unless(is_file($index), 503, 'The website has not been built yet.');

    return response()->file($index, ['Content-Type' => 'text/html; charset=UTF-8', 'Cache-Control' => 'no-cache']);
});
