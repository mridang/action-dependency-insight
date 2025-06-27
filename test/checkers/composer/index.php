<?php
require 'vendor/autoload.php';
use GuzzleHttp\Client;

echo "Hello from PHP!\n";
$client = new Client();
$response = $client->request('GET', 'https://httpbin.org/get');
echo $response->getStatusCode() . "\n";
