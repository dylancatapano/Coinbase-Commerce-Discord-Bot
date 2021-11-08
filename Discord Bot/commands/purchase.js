const config = require('../config.json');
const Discord = require('discord.js');

module.exports = 
{
	name: 'purchase',
    description: 'Details the process of making a purchase.',
    DMOnly: true,
	usage: '',
	cooldown: 3,
    execute(message, args) 
    {
		var msgToSend = 'You can purchase our product through Coinbase. Currently it is only setup to accept Bitcoin, payable through Coinbase or any personal wallet.';
		var instructionsMsg = 'Go to the link and enter your **__USERNAME__** in the __\'Full Name\'__ field. Enter a valid email if you want a proof of purchase'
		+ ' [RECOMMENDED] in case anything goes wrong. Otherwise we cannot help you.';
		var afterPaymentMsg = 'Once you\'ve sent the payment, please be patient. Depending on the amount you allocated to the miners, your payment could take anywhere from'
		+ ' 0-60+ minutes to be confirmed. Once confirmed, you will automatically receive the product and you should receive a message from me.';
		const EmbeddedMsg = new Discord.MessageEmbed()
			.setTitle('PLEASE FOLLOW INSTRUCTIONS TO ENSURE NO ISSUES')
			.setDescription(msgToSend)
			.addFields(
				{ name: 'INSTRUCTIONS', value: instructionsMsg },
				{ name: 'AFTER PAYMENT', value: afterPaymentMsg },
				{ name: 'LINK', value: config.coinbaseCheckoutLink})
		message.reply(EmbeddedMsg);
	},
};