const config = require('../config.json');
const Discord = require('discord.js');
const https = require('https');
module.exports = 
{
	name: 'register',
    description: 'Allows a new user to register their account.',
	DMOnly: true,
	args: true,
	argsAmount: 3,
	usage: '[username] [password] [confirm password]',
	cooldown: 5,
    execute(message, args)
    {
		var username = args[0];
		var password = args[1];
		var confirmPassword = args[2];

		//use some regex to make sure the username is 3-16 characters long and is only numbers and letters
		if (!username.match(/^(?=.{3,16}$)[a-zA-Z0-9]+$/))
			return message.author.send("Username must be at least 3 characters long and only contain numbers and letters.");
		
		//use some regex to make sure the password is at least 8 characters long and contains at least 1 digit and 1 upper case.
		if (!password.match(/^((?!.*[\s])(?=.*[A-Z])(?=.*\d).{8,})$/))
			return message.author.send("Passwords must have at least: 1 uppercase character, 1 digit, and be at least 8 characters long.");

		//make sure the passwords match
		if (password != confirmPassword)
			return message.author.send("Passwords do not match.");

		var discordID = message.author.id;
		var userData = '';
		var sitePath = '/Backend/RegisterUser.php?username='+username+'&password='+encodeURIComponent(password)+'&discordID='+discordID;
		const options = 
		{
			hostname: config.websiteDomain,
			port: 443,
			path: sitePath
		};
		//send a request to RegisterUser.php which will take the given username and password and create an account with that username
		//(assuming its not taken) and link it to that Discord account.
		const request = https.request(options, (result) => 
		{
			result.on('data', (chunk) =>
			{
				userData += chunk;
			}).on('end', () =>
			{				
				if (userData.length > 1)
					return message.author.send(userData);
				
				var description = "Your account has been successfully created.";
				const EmbeddedMsg = new Discord.MessageEmbed()
					.setDescription(description)
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