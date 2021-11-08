<?php
require_once 'include.php';

$username = urldecode($_GET['username']);
if (empty($username))
    exit('Error: Username Field Empty.');

try
{
    #go through database and see if discordID exists
    $db_connection = new PDO("mysql:host=$dbhost;dbname=$dbname", $dbusername, $dbpassword);
    $db_connection->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);
    $db_connection->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $sql = "SELECT * FROM `db_tablename` WHERE `username` = :username";
    $statement = $db_connection->prepare($sql);
    $statement->bindValue(':username', $username);
    $statement->execute();
    $row = $statement->fetch(PDO::FETCH_ASSOC);
    if ($row)
        echo $row['discord_id'];
    else
        exit('No account with that username.');
    $db_connection = null;
}
catch (PDOException $pe) 
{
    exit("Error: Could not connect to the database $dbname :" . $pe->getMessage());
}