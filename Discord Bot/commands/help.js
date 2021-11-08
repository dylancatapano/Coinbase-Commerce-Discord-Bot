const config = require('../config.json');

module.exports = 
{
	name: 'help',
	description: 'List all of my commands.',
	usage: '',
	cooldown: 3,
    execute(message, args) 
    {
		const data = [];
		const { commands } = message.client;

        data.push('Here\'s a list of all my commands:');

		commands.forEach(command => 
		{
			//help format [prefix][name] [args] : [description]
			if (command.DMOnly) //if the command is DM only, specify that
				data.push(`**${config.prefix}${command.name} ${command.usage}** : \`DM Only\` ${command.description}`);
			else
				data.push(`**${config.prefix}${command.name} ${command.usage}** : ${command.description}`);
       	});

		//send the help message
		return message.author.send(data, { split: true })
			.then(() => 
			{
				//if the command was sent in DMs, just send the message. Otherwise, DM the 
				//user the message and let them know you send them a DM in the public channel
				//this way the public channel doesnt get filled up with long help messages
				if (message.channel.type === 'dm') 
					return;
				message.reply('I\'ve sent you a DM with all my commands!');
			})
			.catch(error => 
			{
				console.error(`Could not send help DM to ${message.author.tag}.\n`, error);
				message.reply('it seems like I can\'t DM you!');
			});
	},
};