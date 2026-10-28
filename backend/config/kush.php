<?php

// KushRewards settings, read from .env on the server.
return [
    // Google OAuth client IDs whose ID tokens we accept (web, iOS, Android).
    'google_client_ids' => array_map('trim', explode(',', (string) env('GOOGLE_CLIENT_IDS', ''))),

    // Apple "aud" values: the iOS bundle ID (and a Services ID if web Apple sign-in is added later).
    'apple_audiences' => array_map('trim', explode(',', (string) env('APPLE_AUDIENCES', 'za.co.kushrewards.app'))),

    // Google web client ID, handed to the website at runtime via /api/config.
    'google_web_client_id' => env('GOOGLE_WEB_CLIENT_ID', ''),

    'support_email' => env('SUPPORT_EMAIL', 'support@kushrewards.online'),

    // kush:deploy (cron) seeds demo venues into an empty database when this is true.
    'seed_demo' => filter_var(env('SEED_DEMO', false), FILTER_VALIDATE_BOOLEAN),

    // Comma-separated emails promoted to admin by kush:deploy once they have signed up.
    'admin_emails' => env('ADMIN_EMAILS', ''),

];
