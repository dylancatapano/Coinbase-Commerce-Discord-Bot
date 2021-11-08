const Discord = require('discord.js');
const config = require('./config.json');
const fs = require('fs');
const https = require('https');

const client = new Discord.Client();
module.exports = {client};

//iterate command folder and setup commands
client.commands = new Discord.Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) 
{
	const command = require(`./commands/${file}`);
	client.commands.set(command.name, command);
}

const cooldowns = new Discord.Collection();

client.once('ready', () => {
	console.log('Bot is Connected & Ready.');
});

//when a user joins the server...
client.on('guildMemberAdd', member =>
{
	//assign new user with the Member role.
	var memberRole = member.guild.roles.cache.get(config.memberRole);
	member.roles.add(memberRole);
	//send a DM to the new user
	member.send(`Hello and welcome to ${member.guild.name}! Please read the #information channel, everything about us is detailed there.`);
});

//whenever a message is sent...
client.on('message', message => 
{
	//check if the message was sent in our alerts channel
	if (message.channel.id == config.alertsChannel)
	{
		/*check if the message is a webhook. If it is then we just got an alert about a purchase,
		so we can now take the info and send it to the customer*/
		if (!message.webhookID)
			return;

		//get transaction info from webhook
		var embed = message.embeds.shift();
		var monitorPaymentLink = embed.author.url;
		var transactionLink = embed.url;
		var eventDate = embed.footer.text.substring(20);
		var username = embed.fields[1].value;
		var email = embed.fields[2].value;
		var eventType = embed.fields[0].value;
        var userData = '';
		var sitePath = '/Backend/GetDiscordID.php?username=' + encodeURIComponent(username);

		const options = 
		{
			hostname: config.websiteDomain,
			port: 443,
			path: sitePath
		};

		/*we send a request to the 'GetDiscordID.php' script which will return the discord ID linked
		to the username entered in the purchase request on Coinbase Commerce. This method should be 
		improved with unique purchase links that do not require a customer to enter their username
		as that leaves room for error and issues*/
		const request = https.request(options, (result) => 
		{
			result.on('data', (chunk) =>
			{
				userData += chunk;
			}).on('end', () =>
			{
				//if the purchase failed for some reason or a payment was sent after the payment time expired.
				if ((eventType == "charge:delayed") || (eventType == "charge:failed"))
				{
					var messageToSend = `${embed.description} has been marked as UNRESOLVED. An issue occured during the payment`
					+ ` or a payment was sent after time has expired.`;
					message.channel.send(messageToSend);
				}
				//if the username given in the purchase does not match anything in the DB
				if (userData.indexOf("No account with that username.") !== -1)
				{
					var messageToSend = `No username was found in the database as specified in the order ${embed.description}.`;
					message.channel.send(messageToSend);
				}
				else if (userData.indexOf("Error: ") !== -1) //if there was some other error
				{
					var messageToSend = `${embed.description}: There was an Error during the request. Error Message: ${userData}`;
					message.channel.send(messageToSend);
				}
				else //if we were able to get the username of the customer, send them the info about their purchase.
				{
					var description = '';
					
					if (eventType == "charge:pending") //once someone has sent a payment, but that payment is not yet confirmed on the blockchain.
					{
						description = "I've detected that you sent a payment. Your payment is currently PENDING and upon confirmation you will receive the product and "
						+ " will get another message from me. Confirmation time depends on the miners fee you included, but ranges from 0-60+ minutes. Payment details are below.";												
					}
					else if (eventType == "charge:confirmed") //once a payment has been confirmed on the blockchain.
					{
						description = "Your payment has been confirmed and you have received the product.";
					}
					else if (eventType == "charge:delayed") //if someone sends a payment after their time window has expired
					{
						description = "Your payment has been marked as DELAYED, meaning you sent a payment after the given time expired. This must be manually reviewed and you will"
						+ " not receive the product yet. Please create a ticket in #tickets to get help.";
					}
					else if (eventType == "charge:resolved") //a previously unresolved order has been marked as resolved
					{
						description = "Your recent payment that was marked unresolved has since been RESOLVED. You should have now received the product. If you have any more issues"
						+ "or questions please create a ticket in #tickets";
					}
					else if (eventType == "charge:failed") //if there was an error with the order
					{
						description = "You recently sent a payment that has been marked UNRESOLVED. This means you could have underpaid, overpaid, or sent multiple payments."
						+ " You will not receive the product until you create a ticket in #tickets and staff has resolved the issue.";
					}

					//finally DM the customer the order info in a nice embedded message.
					const EmbeddedMsg = new Discord.MessageEmbed()
					.setTitle('Payment Notification')
					.setDescription(description)
					.addFields(
						{ name: 'Username', value: username },
						{ name: 'Email', value: email },
						{ name: 'Date', value: eventDate },
						{ name: 'Monitor BTC Payment', value: monitorPaymentLink },
						{ name: 'Transaction Link', value: transactionLink })
					
					client.users.cache.get(userData).send(EmbeddedMsg);
				}
			});
		});
		//if there was an error with the request
		request.on('error', (error) => 
		{
			var messageToSend = `${embed.description}: There was an Error during the request. Error Message: ${error}`;
			message.channel.send(messageToSend);
		});
        request.end();
	}
	else //if a message was sent in any other channel or DM
	{
		//if the message does not begin with the bot's prefix or was sent by a bot
		if (!message.content.startsWith(config.prefix) || message.author.bot) 
			return;
		
		//find the command sent and get the arguements used
		const args = message.content.slice(config.prefix.length).trim().split(/ +/);
		const commandName = args.shift().toString();
		const command = client.commands.get(commandName);

		if (!command) 
			return;

		//check if the command is only meant to be used in DMs
		if (command.DMOnly && message.channel.type !== 'dm')
			return message.reply('This command can only be executed in DMs.');

		//make sure correct syntax was used
		if (command.args && (args.length != command.argsAmount))
		{
			if (command.usage)
				return message.reply(`Wrong Syntax! Correct usage: \`${config.prefix}${command.name} ${command.usage}\``);
			else
				return message.reply("Wrong Syntax!");
		}

		//manage cooldowns for the command
		if (!cooldowns.has(command.name))
			cooldowns.set(command.name, new Discord.Collection());

		const now = Date.now();
		const timestamps = cooldowns.get(command.name);
		const cooldownAmount = (command.cooldown || 3) * 1000;

		//if the user has a cooldown for the command
		if (timestamps.has(message.author.id)) 
		{
			const expirationTime = timestamps.get(message.author.id) + cooldownAmount;
			if (now < expirationTime) 
			{
				const timeLeft = (expirationTime - now) / 1000;
				return message.reply(`please wait ${timeLeft.toFixed(1)} more second(s) before reusing the \`${command.name}\` command.`);
			}
		}

		//start the cooldown timer for the user
		timestamps.set(message.author.id, now);
		setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

		//attempt to execute the command, but catch any errors
		try {
			command.execute(message, args);
		} catch (error) {
			console.error(error);
			message.reply('there was an error trying to execute that command!');
		}
	}
});

client.login(config.token);