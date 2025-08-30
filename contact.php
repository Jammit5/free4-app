<?php
// CORS Headers für Next.js App
header('Access-Control-Allow-Origin: https://free4.app'); // Deine Domain
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

// Preflight-Request behandeln
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Nur POST-Requests zulassen
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

// JSON-Input lesen
$input = json_decode(file_get_contents('php://input'), true);

// Validierung
if (!$input || !isset($input['name'], $input['email'], $input['message'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Alle Felder sind erforderlich']);
    exit();
}

$name = trim($input['name']);
$email = trim($input['email']);
$message = trim($input['message']);

// Email-Validierung
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['error' => 'Ungültige E-Mail-Adresse']);
    exit();
}

// Spam-Schutz: Einfache Validierung
if (strlen($name) < 2 || strlen($message) < 10) {
    http_response_code(400);
    echo json_encode(['error' => 'Name zu kurz oder Nachricht zu kurz']);
    exit();
}

// E-Mail zusammenstellen
$to = 'support@free4.app';
$subject = 'Kontaktanfrage von ' . $name . ' - Free4 App';

// HTML-Email
$html_message = '
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Kontaktanfrage - Free4 App</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #0ea5e9; border-bottom: 2px solid #0ea5e9; padding-bottom: 10px;">
            📧 Neue Kontaktanfrage - Free4 App
        </h2>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1e40af;">Absender-Informationen:</h3>
            <p><strong>Name:</strong> ' . htmlspecialchars($name) . '</p>
            <p><strong>E-Mail:</strong> ' . htmlspecialchars($email) . '</p>
            <p><strong>Datum:</strong> ' . date('d.m.Y H:i:s') . '</p>
        </div>
        
        <div style="background: #fff; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h3 style="margin-top: 0; color: #1e40af;">Nachricht:</h3>
            <div style="background: #f1f5f9; padding: 15px; border-radius: 4px; white-space: pre-wrap;">' . htmlspecialchars($message) . '</div>
        </div>
        
        <div style="margin-top: 20px; padding: 15px; background: #dbeafe; border-radius: 8px; text-align: center;">
            <p style="margin: 0; color: #1e40af;">
                💡 <strong>Antworten Sie direkt auf diese E-Mail</strong> um dem Nutzer zu antworten.
            </p>
        </div>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;">
        
        <p style="text-align: center; color: #64748b; font-size: 12px;">
            Diese E-Mail wurde automatisch über das Kontaktformular der Free4 App generiert.<br>
            Free4 App - Spontane Treffen mit Freunden
        </p>
    </div>
</body>
</html>';

// Text-Version als Fallback
$text_message = "Neue Kontaktanfrage - Free4 App\n\n";
$text_message .= "Name: " . $name . "\n";
$text_message .= "E-Mail: " . $email . "\n";
$text_message .= "Datum: " . date('d.m.Y H:i:s') . "\n\n";
$text_message .= "Nachricht:\n" . $message . "\n\n";
$text_message .= "---\n";
$text_message .= "Free4 App - Kontaktformular";

// E-Mail-Headers
$headers = array();
$headers[] = 'MIME-Version: 1.0';
$headers[] = 'Content-Type: text/html; charset=UTF-8';
$headers[] = 'From: Free4 App <noreply@free4.app>';
$headers[] = 'Reply-To: ' . $email;
$headers[] = 'X-Mailer: PHP/' . phpversion();
$headers[] = 'X-Priority: 1';

// E-Mail senden
$mail_sent = mail($to, $subject, $html_message, implode("\r\n", $headers));

if ($mail_sent) {
    // Erfolg
    http_response_code(200);
    echo json_encode([
        'message' => 'Nachricht erfolgreich gesendet',
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    
    // Optional: Log-Datei schreiben (für Debugging)
    error_log(date('Y-m-d H:i:s') . " - Kontaktformular: E-Mail von $email ($name) gesendet\n", 3, 'contact_log.txt');
    
} else {
    // Fehler
    http_response_code(500);
    echo json_encode(['error' => 'E-Mail konnte nicht gesendet werden']);
    
    // Fehler loggen
    error_log(date('Y-m-d H:i:s') . " - Kontaktformular FEHLER: E-Mail von $email ($name) nicht gesendet\n", 3, 'contact_log.txt');
}
?>