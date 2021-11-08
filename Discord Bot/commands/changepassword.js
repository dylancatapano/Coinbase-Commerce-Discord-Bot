const config = require('../config.json');
const https = require('https');

module.exports = 
{
	name: 'changepassword',
    description: 'Allows an existing user to change their current account password.',
	DMOnly: true,
	args: true,
	argsAmount: 4,
	usage: '[username] [current password] [new password] [confirm new password]',
	cooldown: 5,
    execute(message, args)
    {
		//get account info from sent arguements
		var username = args[0];
		var password = args[1];
		var newPassword = args[2];
		var confirmNewPassword = args[3];

		//use some regex to make sure the username is at least 3-16 characters and only contains numbers and letters
		if (!username.match(/^(?=.{3,16}$)[a-zA-Z0-9]+$/))
			return message.author.send("Error: Username must be at least 3 characters long and only contain numbers and letters.");
		
		//use some regex to make sure the password is at least 8 characters long and contains at least: 1 upper case, 1 digit
		if (password.length < 8 || !password.match(/^((?!.*[\s])(?=.*[A-Z])(?=.*\d).{8,})$/))
			return message.author.send("Error: Passwords must contain at least: 1 upper case character, 1 digit, and are at least 8 characters long.");

        if (newPassword.length < 8 || !newPassword.match(/^((?!.*[\s])(?=.*[A-Z])(?=.*\d).{8,})$/))
			return message.author.send("Error: Passwords must contain at least: 1 upper case character, 1 digit, and are at least 8 characters long.");

		//make sure new passwords match
		if (newPassword != confirmNewPassword)
			return message.author.send("Error: Passwords do not match.");

		var userData = '';
		var sitePath = '/Backend/ChangePassword.php?username='+username+'&password='+encodeURIComponent(password)+'&newPassword='+encodeURIComponent(newPassword);
		const options = 
		{
			hostname: config.websiteDomain,
			port: 443,
			path: sitePath
		};
		//send a request to ChangePassword.php with the username and passwords (url encoded as to avoid any issues) where the script will
		//make sure everything checks out and change the user's password in the database
		const request = https.request(options, (result) => 
		{
			result.on('data', (chunk) =>
			{
				userData += chunk;
			}).on('end', () =>
			{				
				if (userData.length > 1)
					return message.author.send(userData);

                message.author.send("Your password has successfully been changed.");
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