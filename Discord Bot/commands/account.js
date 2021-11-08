const config = require('../config.json');
const Discord = require('discord.js');
const https = require('https');

module.exports = 
{
	name: 'account',
    description: 'Gives you information about your account.',
    DMOnly: true,
	usage: '',
	cooldown: 5,
    execute(message, args) 
    {
		var discordID = message.author.id;
		var userData = '';
		var sitePath = '/Backend/AccountInfo.php?discordID=' + discordID
		const options = 
		{
			hostname: config.websiteDomain,
			port: 443,
			path: sitePath
		};

		//send a request to the AccountInfo file that will take the users Discord ID and find information
		//about their account in the database and return it in a string
		const request = https.request(options, (result) => 
		{
			result.on('data', (chunk) =>
			{
				userData += chunk;
			}).on('end', () =>
			{
				//return if the script encountered an error.
				if (userData.indexOf("Error: ") !== -1)
					return message.author.send(userData);

				//get our account information
				var values  = userData.split(";");
				var username = values[0];
				var userJoinDate = values[1];
				var userPurchaseStatus = values[2];

				//send our message in a nice embed.
				const EmbeddedMsg = new Discord.MessageEmbed()
					.setTitle('Account Information')
					.addFields(
						{ name: 'Username', value: username },
						{ name: 'Join Date', value: userJoinDate },
						{ name: 'Purchase Status', value: userPurchaseStatus })
				message.reply(EmbeddedMsg);
			});
		});
		request.on('error', (error) => 
		{
			return message.author.send('There was an error with your request.');
			//console.error(error);
		});
		request.end();
	},
};