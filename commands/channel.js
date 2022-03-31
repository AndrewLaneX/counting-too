const Channel = require('../models/channel');

module.exports = {
    name: 'channel',
    description: 'Configure the bot to listen in a specific channel',
    async execute(message) {
        if (!message.member.permissions.has('MANAGE_CHANNELS')) {
            await message.reply("you don't have permission to do this.");
            return;
        }

        let channel = await Channel.findOne({
            guildId: message.guild.id,
        });

        if (!channel) {
            channel = new Channel({
                guildId: message.guild.id,
            });
        }

        channel.channelId = message.channel.id;
        await channel.save();

        await message.reply(
            'the counting channel has been updated to this channel.',
        );
    },
};
