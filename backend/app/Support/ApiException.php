<?php

namespace App\Support;

use RuntimeException;

/** Thrown anywhere in the API; rendered as `{ "error": message }` with the given status (HANDOVER 6.1). */
class ApiException extends RuntimeException
{
    public function __construct(public readonly int $status, string $message)
    {
        parent::__construct($message);
    }
}
