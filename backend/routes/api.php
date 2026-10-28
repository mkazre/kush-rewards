<?php

// KushRewards API (HANDOVER 6). Served at https://kushrewards.online/api/...
// Only GET and POST, JSON in and out, errors as { "error": "..." }.

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\StoreController;
use App\Http\Controllers\SubmissionController;
use Illuminate\Support\Facades\Route;

// Public settings the website needs at runtime.
Route::get('/config', fn () => response()->json([
    'googleWebClientId' => config('kush.google_web_client_id'),
    'supportEmail' => config('kush.support_email'),
]));

Route::get('/auth/session', [AuthController::class, 'session']);
Route::post('/auth/google', [AuthController::class, 'google']);
Route::post('/auth/apple', [AuthController::class, 'apple']);
Route::post('/auth/login_with_password', [AuthController::class, 'login']);
Route::post('/auth/register_with_password', [AuthController::class, 'register']);
Route::post('/auth/logout', [AuthController::class, 'logout']);

Route::post('/account/accept_terms', [AuthController::class, 'acceptTerms']);
Route::post('/account/delete', [AuthController::class, 'deleteAccount']);

Route::get('/stores/list', [StoreController::class, 'list']);
Route::post('/stores/tap', [StoreController::class, 'tap'])->middleware('throttle:60,1');

Route::get('/reviews/list', [ReviewController::class, 'list']);
Route::post('/reviews/save', [ReviewController::class, 'save']);
Route::post('/reviews/report', [ReviewController::class, 'report']);
Route::post('/reviews/block', [ReviewController::class, 'block']);

Route::post('/submissions/create', [SubmissionController::class, 'create']);
Route::get('/submissions/mine', [SubmissionController::class, 'mine']);
Route::post('/reports/create', [SubmissionController::class, 'report']);

Route::get('/admin/overview', [AdminController::class, 'overview']);
Route::post('/admin/store_save', [AdminController::class, 'storeSave']);
Route::post('/admin/submission_decide', [AdminController::class, 'submissionDecide']);
Route::post('/admin/report_resolve', [AdminController::class, 'reportResolve']);
Route::post('/admin/review_status', [AdminController::class, 'reviewStatus']);
Route::post('/admin/logo_upload', [AdminController::class, 'logoUpload']);
Route::put('/uploads/logo/{name}', [AdminController::class, 'logoPut'])->name('logo.put')->middleware('signed');
