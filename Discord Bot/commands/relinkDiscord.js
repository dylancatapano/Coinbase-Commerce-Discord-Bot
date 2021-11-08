const config = require('../config.json');
const https = require('https');
module.exports = 
{
	name: 'relinkDiscord',
	description: 'Lets you relink the Discord account associated with a certain user to a different Discord account.',
	DMOnly: true,
	args: true,
	argsAmount: 2,
	usage: '[username] [password]',
	cooldown: 3,
    execute(message, args) 
    {
		//get our info from the sent arguements
		var username = args[0];
		var password = args[1];

		//use some regex to make sure the usedrname and password meet our criteria
		if (!username.match(/^(?=.{3,16}$)[a-zA-Z0-9]+$/))
			return message.author.send("Username must be at least 3 characters long and only contain numbers and letters.");
	
		if (!password.match(/^((?!.*[\s])(?=.*[A-Z])(?=.*\d).{8,})$/))
			return message.author.send("Passwords must have at least: 1 uppercase character, 1 digit, and be at least 8 characters long.");
		
		var discordID = message.author.id;
		var userData = '';
		var sitePath = '/Backend/RelinkDiscord.php?username='+username+'&password='+encodeURIComponent(password)+'&discordID='+discordID;
		const options = 
		{
			hostname: config.websiteDomain,
			port: 443,
			path: sitePath
		};
		//send a request to RelinkDiscord.php with the given username and password which will make sure the account exists and then
		//change the Discord account associated with the user to the one given.
		const request = https.request(options, (result) => 
		{
			result.on('data', (chunk) =>
			{
				userData += chunk;
			}).on('end', () =>
			{				
				if (userData.length > 1)
					return message.author.send(userData);

				return message.author.send("Your account has successfully been relinked.");
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