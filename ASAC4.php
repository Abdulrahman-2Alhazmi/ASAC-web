<?php
// ============================================================
// ASAC4.php
// ASAC Backend API
// يستقبل رسالة المستخدم من app.js، ويرسلها إلى Cohere AI، ثم يعيد الرد إلى واجهة ASAC.
// ============================================================

header('Content-Type: application/json; charset=utf-8');

require __DIR__ . '/../config.php';

// السماح فقط بطلبات POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'الطريقة غير مسموحة']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$prompt = isset($input['prompt']) ? trim($input['prompt']) : '';

if ($prompt === '') {
    http_response_code(400);
    echo json_encode(['error' => 'الرجاء إرسال رسالة صحيحة.']);
    exit;
}

if (!defined('COHERE_API_KEY') || COHERE_API_KEY === '') {
    http_response_code(500);
    echo json_encode(['error' => 'لم يتم إعداد مفتاح Cohere API في config.php']);
    exit;
}

// إعدادات Cohere
$model = "command-a-03-2025";
$url = "https://api.cohere.com/v2/chat";

$body = json_encode([
    "model" => $model,
    "messages" => [
        [
            "role" => "user",
            "content" => $prompt
        ]
    ]
]);

$ch = curl_init($url);

curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        "Authorization: Bearer " . COHERE_API_KEY,
        "Content-Type: application/json"
    ],
    CURLOPT_POSTFIELDS => $body,
    CURLOPT_TIMEOUT => 30,
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr = curl_error($ch);

curl_close($ch);

if ($response === false) {
    http_response_code(502);
    echo json_encode([
        'error' => 'تعذر على ASAC الاتصال بخدمة Cohere.',
        'details' => $curlErr
    ]);
    exit;
}

$data = json_decode($response, true);

if ($httpCode >= 400) {
    http_response_code(502);
    echo json_encode([
        'error' => 'رفضت Cohere الطلب.',
        'details' => $data
    ]);
    exit;
}

$reply = $data['message']['content'][0]['text'] ?? 'تعذر على ASAC إنشاء رد.';

// إرسال الرد إلى واجهة المستخدم
echo json_encode([
    'reply' => $reply
], JSON_UNESCAPED_UNICODE);