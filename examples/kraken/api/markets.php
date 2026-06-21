<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: public, max-age=3600');

$cacheFile = sys_get_temp_dir() . '/techanjs-kraken-markets.json';
$maxAge = 3600;

if (file_exists($cacheFile) && (time() - filemtime($cacheFile)) < $maxAge) {
	readfile($cacheFile);
	exit;
}

$context = stream_context_create([
	'http' => [
		'timeout' => 20,
		'header' => "User-Agent: techanjs-kraken/1.0\r\n",
	],
]);

$pairsResponse = @file_get_contents('https://api.kraken.com/0/public/AssetPairs', false, $context);
$assetsResponse = @file_get_contents('https://api.kraken.com/0/public/Assets', false, $context);

if ($pairsResponse === false || $assetsResponse === false) {
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

file_put_contents($cacheFile, $output);
echo $output;
