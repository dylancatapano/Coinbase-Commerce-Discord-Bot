<?php
require_once "../../vendor/autoload.php";
require_once "include.php";
use CoinbaseCommerce\Webhook;

#get header info
$headerName = 'X-Cc-Webhook-Signature';
$headers = getallheaders();
$signatureHeader = isset($headers[$headerName]) ? $headers[$headerName] : null;
#get payload
$payload = trim(file_get_contents('php://input'));

try
{
    #verify that payload is official and has not been modified
    $event = Webhook::buildEvent($payload, $signatureHeader, $cbcWebhookSecret);
    http_response_code(200);
    #grab variables from payload. The payload is in json format so that's how we'll decode it.
    #visit https://commerce.coinbase.com/docs/api/ for more info on Webhooks and payload or API info
    $eventID = $event->id;
    $eventType = $event->type;
    $eventCreationDate = $event->created_at;
    $eventData = $event->data;
    $chargeCode = $eventData['code'];
    $hostedURL = $eventData['hosted_url'];
    $chargeUUID = $eventData['id'];
    $username = $eventData['metadata']['name'];
    $userEmail = $eventData['metadata']['email'];
    $expectedPriceUSD = $eventData['pricing']['local']['amount'];
    $expectedPriceBTC = $eventData['pricing']['bitcoin']['amount'];
    $sentPriceUSD = $eventData['payments'][0]['value']['local']['amount'];
    $sentPriceBTC = $eventData['payments'][0]['value']['crypto']['amount'];
    $transactionID = $eventData['payments'][0]['transaction_id'];
    $description = "Charge Code: " . $chargeCode;
    $timeline = $eventData['timeline'];
    foreach ($timeline as $object)
    {
        if (($object['status'] == "UNRESOLVED") && ($eventType != "charge:resolved"))
        {
            if ($object['context' != "DELAYED"])
                $eventType = $eventType . $object['context'];
        }
    }
    $amountSentViewable = '$' . $sentPriceUSD . ' [' . $sentPriceBTC . 'btc]';
    $transactionLink = 'https://www.blockchain.com/btc/tx/' . $transactionID;
    $footer = "Coinbase Commerce - " . $eventCreationDate;

    #once we've setup all our variables, create a database log of coinbase commerce event
    $db_connection = new PDO("mysql:host=$dbhost;dbname=$dbname", $dbusername, $dbpassword);
    $db_connection->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);
    $db_connection->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
	$sql = "INSERT INTO cbc_payment_events (event_id, event_date, charge_type, charge_code, charge_uuid, username, user_email, price_usd, price_btc, sent_usd, sent_btc, transaction_id) VALUES (:eventID, :eventCreationDate, :eventType, :chargeCode, :chargeUUID, :username, :userEmail, :expectedPriceUSD, :expectedPriceBTC, :sentPriceUSD, :sentPriceBTC, :transactionID)";
	$statement = $db_connection->prepare($sql);
    $statement->bindValue(':eventID', $eventID);
    $statement->bindValue(':eventCreationDate', $eventCreationDate);
    $statement->bindValue(':eventType', $eventType);
    $statement->bindValue(':chargeCode', $chargeCode);
    $statement->bindValue(':chargeUUID', $chargeUUID);
    $statement->bindValue(':username', $username);
    $statement->bindValue(':userEmail', $userEmail);
    $statement->bindValue(':expectedPriceUSD', $expectedPriceUSD);
    $statement->bindValue(':expectedPriceBTC', $expectedPriceBTC);
    $statement->bindValue(':sentPriceUSD', $sentPriceUSD);
    $statement->bindValue(':sentPriceBTC', $sentPriceBTC);
    $statement->bindValue(':transactionID', $transactionID);
	$statement->execute();
    $db_connection = null;

    if ($eventType == "charge:confirmed")
    {
        #here you can do whatever you want once a payment has been confirmed,
        #like giving the customer the product   
    }
    
    #once we've decoded the payload and logged the event in our database, we can use Discord's API to send a message
    #to our channel through our webhook.
    $url = "https://discord.com/api/webhooks/a_really_long_string";

    $hookObject = json_encode([
        "content" => $messageContent,
        "username" => "Purchase Alert",
        "avatar_url" => "https://static.thenounproject.com/png/3346111-200.png",
        "tts" => false,
        // "file" => "",
        "embeds" => [
            [
                "title" => "Link to Payment",
                "type" => "rich",
                "description" => $description,
                "url" => $hostedURL,
                "timestamp" => "",
                "color" => hexdec( "FFFFFF" ),
                "footer" => [
                    "text" => $footer,
                    "icon_url" => ""
                ],
                "image" => [
                    "url" => ""
                ],
                "thumbnail" => [
                    "url" => ""
                ],

                "author" => [
                    "name" => "Monitor Transaction",
                    "url" => $transactionLink
                ],
                "fields" => [
                    [
                        "name" => "Status",
                        "value" => $eventType,
                        "inline" => true
                    ],
                    [
                        "name" => "Username",
                        "value" => $username,
                        "inline" => true
                    ],
                    [
                        "name" => "User Email",
                        "value" => $userEmail,
                        "inline" => true
                    ],
                    [
                        "name" => "Amount Sent",
                        "value" => $amountSentViewable,
                        "inline" => true
                    ]
                ]
            ]
        ]

    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE );
    $ch = curl_init();
    curl_setopt_array( $ch, [
        CURLOPT_URL => $url,
        CURLOPT_POST => true,
        CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_POSTFIELDS => $hookObject,
        CURLOPT_HTTPHEADER => [
            "Content-Type: application/json"
        ]
    ]);
    $response = curl_exec( $ch );
    curl_close( $ch );
}
catch (PDOException $pe)
{
    #return error response code
    http_response_code(400);
    #log error message
    #echo 'Error: occured. ' . $pe->getMessage();
}