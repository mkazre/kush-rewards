<?php

// Front controller for cPanel: this file lives in ~/public_html while the Laravel app
// lives outside the web root in ~/kushrewards_app (see docs/DEPLOYMENT.md).

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

$appDir = dirname(__DIR__).'/kushrewards_app';

if (file_exists($maintenance = $appDir.'/storage/framework/maintenance.php')) {
    require $maintenance;
}

require $appDir.'/vendor/autoload.php';

/** @var Application $app */
$app = require_once $appDir.'/bootstrap/app.php';

// Uploaded logos and the website build are served from public_html.
$app->usePublicPath(__DIR__);

$app->handleRequest(Request::capture());
