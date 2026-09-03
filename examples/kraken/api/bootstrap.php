<?php

function krakenApiClientIp(): string
{
	$ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
	if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
		$parts = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
		$candidate = trim($parts[0]);
		if (filter_var($candidate, FILTER_VALIDATE_IP)) {
			$ip = $candidate;
		}
	}
	return $ip;
}

function krakenApiAllowedOrigins(): array
{
	$host = $_SERVER['HTTP_HOST'] ?? '';
	$origins = [
		'https://techanjs.fumlersoft.dk',
		'http://techanjs.fumlersoft.dk',
		'http://localhost',
		'https://localhost',
		'http://127.0.0.1',
		'https://127.0.0.1',
	];
	if ($host !== '') {
		$origins[] = 'https://' . $host;
		$origins[] = 'http://' . $host;
	}
	return array_values(array_unique($origins));
}

function krakenApiSendCors(): void
{
	$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
	if ($method === 'OPTIONS') {
		$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
		if ($origin !== '' && in_array($origin, krakenApiAllowedOrigins(), true)) {
			header('Access-Control-Allow-Origin: ' . $origin);
			header('Access-Control-Allow-Methods: GET, HEAD, OPTIONS');
			header('Access-Control-Allow-Headers: Accept');
			header('Access-Control-Max-Age: 86400');
			header('Vary: Origin');
		}
		http_response_code(204);
		exit;
	}

	$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
	if ($origin !== '' && in_array($origin, krakenApiAllowedOrigins(), true)) {
		header('Access-Control-Allow-Origin: ' . $origin);
		header('Vary: Origin');
	}
}

function krakenApiRequireGet(): void
{
	$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
	if ($method !== 'GET' && $method !== 'HEAD') {
		http_response_code(405);
		header('Allow: GET, HEAD, OPTIONS');
		echo json_encode(['error' => 'Method not allowed']);
		exit;
	}
}

function krakenApiRateLimit(string $bucket, int $limit, int $windowSeconds): void
{
	$ip = krakenApiClientIp();
	$key = hash('sha256', $ip . ':' . $bucket);
	$dir = sys_get_temp_dir() . '/techanjs-kraken-ratelimit';
	if (!is_dir($dir) && !mkdir($dir, 0700, true) && !is_dir($dir)) {
		return;
	}

	$file = $dir . '/' . $key;
	$now = time();
	$data = ['start' => $now, 'count' => 0];

	$handle = fopen($file, 'c+');
	if ($handle === false) {
		return;
	}

	try {
		if (!flock($handle, LOCK_EX)) {
			return;
		}

		$raw = stream_get_contents($handle);
		if ($raw !== false && $raw !== '') {
			$decoded = json_decode($raw, true);
			if (is_array($decoded) && isset($decoded['start'], $decoded['count'])) {
				$data = $decoded;
			}
		}

		if ($now - $data['start'] >= $windowSeconds) {
			$data = ['start' => $now, 'count' => 0];
		}

		$data['count']++;

		ftruncate($handle, 0);
		rewind($handle);
		fwrite($handle, json_encode($data));
		fflush($handle);
	} finally {
		flock($handle, LOCK_UN);
		fclose($handle);
	}

	if ($data['count'] > $limit) {
		http_response_code(429);
		header('Retry-After: ' . (string) max(1, $windowSeconds - ($now - $data['start'])));
		echo json_encode(['error' => 'Rate limit exceeded']);
		exit;
	}
}

function krakenApiJsonHeaders(int $maxAge): void
{
	header('Content-Type: application/json; charset=utf-8');
	header('Cache-Control: public, max-age=' . $maxAge);
	header('X-Content-Type-Options: nosniff');
}

/**
 * @return string empty string on error
 */
function krakenApiFetch(string $url, int $timeoutSeconds): string
{
	$parts = parse_url($url);
	if (
		!is_array($parts) ||
		($parts['scheme'] ?? '') !== 'https' ||
		($parts['host'] ?? '') !== 'api.kraken.com' ||
		!preg_match('#^/0/public/[A-Za-z]+$#', $parts['path'] ?? '')
	) {
		return '';
	}

	$context = stream_context_create([
		'http' => [
			'timeout' => $timeoutSeconds,
			'header' => "User-Agent: techanjs-kraken/1.0\r\n",
			'ignore_errors' => true,
		],
	]);

	$response = @file_get_contents($url, false, $context);
	return $response === false ? '' : $response;
}

function krakenApiValidatePair(string $pair): bool
{
	return $pair !== '' &&
		strlen($pair) <= 16 &&
		preg_match('/^[A-Z0-9]+$/', $pair) === 1;
}

function krakenApiValidateSince(?int $since): bool
{
	if ($since === null || $since <= 0) {
		return true;
	}
	$now = time();
	return $since <= $now && $since >= ($now - 63072000);
}
