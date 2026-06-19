<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: public, max-age=60');

$pair = isset($_GET['pair']) ? strtoupper($_GET['pair']) : '';
$interval = isset($_GET['interval']) ? (int) $_GET['interval'] : 1;
$since = isset($_GET['since']) ? (int) $_GET['since'] : null;

$allowedIntervals = [1, 5, 15, 30, 60, 240, 1440, 10080, 21600];

if (!preg_match('/^[A-Z0-9]+$/', $pair)) {
	http_response_code(400);
	echo json_encode(['error' => 'Invalid pair: ' . $pair]);
	exit;
}

if (!in_array($interval, $allowedIntervals, true)) {
	http_response_code(400);
	echo json_encode(['error' => 'Invalid interval: ' . $interval]);
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

$context = stream_context_create([
	'http' => [
		'timeout' => 15,
		'header' => "User-Agent: techanjs-kraken/1.0\r\n",
	],
]);

$response = @file_get_contents($url, false, $context);

if ($response === false) {
	http_response_code(502);
	echo json_encode(['error' => 'Kraken API request failed']);
	exit;
}

echo $response;
