<?php
require __DIR__ . '/bootstrap.php';

krakenApiSendCors();
krakenApiRequireGet();
krakenApiRateLimit('ohlc', 120, 60);
krakenApiJsonHeaders(60);

$pair = isset($_GET['pair']) ? strtoupper(trim($_GET['pair'])) : '';
$interval = isset($_GET['interval']) ? (int) $_GET['interval'] : 1;
$since = isset($_GET['since']) ? (int) $_GET['since'] : null;

$allowedIntervals = [1, 5, 15, 30, 60, 240, 1440, 10080, 21600];

if (!krakenApiValidatePair($pair)) {
	http_response_code(400);
	echo json_encode(['error' => 'Invalid pair']);
	exit;
}

if (!in_array($interval, $allowedIntervals, true)) {
	http_response_code(400);
	echo json_encode(['error' => 'Invalid interval']);
	exit;
}

if (!krakenApiValidateSince($since)) {
	http_response_code(400);
	echo json_encode(['error' => 'Invalid since']);
	exit;
}

$query = [
	'pair' => $pair,
	'interval' => $interval,
];

if ($since !== null && $since > 0) {
	$query['since'] = $since;
}

$url = 'https://api.kraken.com/0/public/OHLC?' . http_build_query($query);
$response = krakenApiFetch($url, 15);

if ($response === '') {
	http_response_code(502);
	echo json_encode(['error' => 'Kraken API request failed']);
	exit;
}

echo $response;
