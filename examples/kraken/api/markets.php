<?php
require __DIR__ . '/bootstrap.php';

krakenApiSendCors();
krakenApiRequireGet();
krakenApiRateLimit('markets', 20, 60);
krakenApiJsonHeaders(3600);

$cacheFile = sys_get_temp_dir() . '/techanjs-kraken-markets.json';
$maxAge = 3600;

if (file_exists($cacheFile) && (time() - filemtime($cacheFile)) < $maxAge) {
	readfile($cacheFile);
	exit;
}

$pairsResponse = krakenApiFetch('https://api.kraken.com/0/public/AssetPairs', 20);
$assetsResponse = krakenApiFetch('https://api.kraken.com/0/public/Assets', 20);

if ($pairsResponse === '' || $assetsResponse === '') {
	http_response_code(502);
	echo json_encode(['error' => ['Kraken API request failed'], 'result' => null]);
	exit;
}

$pairsData = json_decode($pairsResponse, true);
$assetsData = json_decode($assetsResponse, true);

if (!is_array($pairsData) || !is_array($assetsData)) {
	http_response_code(502);
	echo json_encode(['error' => ['Invalid Kraken API response'], 'result' => null]);
	exit;
}

if (!empty($pairsData['error']) || !empty($assetsData['error'])) {
	http_response_code(502);
	echo json_encode([
		'error' => array_merge($pairsData['error'] ?? [], $assetsData['error'] ?? []),
		'result' => null,
	]);
	exit;
}

$output = json_encode([
	'error' => [],
	'result' => [
		'assets' => $assetsData['result'] ?? [],
		'pairs' => $pairsData['result'] ?? [],
	],
]);

if ($output === false || strlen($output) > 5000000) {
	http_response_code(502);
	echo json_encode(['error' => ['Invalid Kraken API response'], 'result' => null]);
	exit;
}

file_put_contents($cacheFile, $output, LOCK_EX);
echo $output;
