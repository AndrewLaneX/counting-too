const Channel = require('../models/channel');
const Save = require('../models/save');

const formatSaveMessage = (userId, saves, lastNumber) =>
    `⚠️ <@${userId}> You have used **1** of your saves. You have **${saves.toFixed(
        2,
    )}** left. The next number is **${lastNumber + 1}**`;

const formatGuildSaveMessage = (userId, saves, lastNumber) =>
    `⚠️ <@${userId}> You have used **1** of the guild saves. There are **${saves.toFixed(
        3,
    )}** left. The next number is **${lastNumber + 1}**`;

module.exports = async (message, number) => {
    const channel = await Channel.findOne({
        guildId: message.guild.id,
        channelId: message.channel.id,
    });

    if (!channel) {
        return;
    }

    if (channel.lastNumber === 0) {
        if (number === 1) {
            channel.userId = message.author.id;
            channel.lastNumber = 1;
            channel.addSave();
            await channel.save();

            await message.react('✅');
            await Save.addSave(message.guild.id, message.author.id);

            return;
        }

        const lastNumber = channel?.lastNumber ?? 0;

        channel.userId = null;
        channel.lastNumber = 0;
        await message.react('⚠️');
        await message.channel.send(
            `Incorrect number! The next number is \`${
                lastNumber + 1
            }\`. **No stats have been changed since the current number was 0.**`,
        );
        return;
    }

    if (number !== channel.lastNumber + 1) {
        if (await Save.hasSaves(message.guild.id, message.author.id)) {
            await Save.useSave(message.guild.id, message.author.id);

            const saves = await Save.getSaves(
                message.guild.id,
                message.author.id,
            );
            await message.channel.send(
                formatSaveMessage(message.author.id, saves, channel.lastNumber),
            );

            return;
        } else if (channel.hasSaves()) {
            await channel.useSave();
            await message.channel.send(
                formatGuildSaveMessage(
                    message.author.id,
                    channel.guildSaves,
                    channel.lastNumber,
                ),
            );

            return;
        }

        const { lastNumber } = channel;

        channel.userId = null;
        channel.lastNumber = 0;
        await channel.save();
        await message.react('❌');
        await message.reply(
            `RUINED IT AT **${lastNumber}**!! Next number is **1**. **Wrong number.**`,
        );
        return;
    }

    if (channel.userId === message.author.id) {
        if (await Save.hasSaves(message.guild.id, message.author.id)) {
            await Save.useSave(message.guild.id, message.author.id);

            const saves = await Save.getSaves(
                message.guild.id,
                message.author.id,
            );
            await message.channel.send(
                formatSaveMessage(message.author.id, saves, channel.lastNumber),
            );

            return;
        } else if (channel.hasSaves()) {
            await channel.useSave();
            await message.channel.send(
                formatGuildSaveMessage(
                    message.author.id,
                    channel.guildSaves,
                    channel.lastNumber,
                ),
            );

            return;
        }

        const { lastNumber } = channel;

        channel.userId = null;
        channel.lastNumber = 0;
        await channel.save();
        await message.react('❌');
        await message.reply(
            `RUINED IT AT **${
                lastNumber + 1
            }**!! Next number is **1**. **You can't count two numbers in a row.**`,
        );
        return;
    }

    channel.userId = message.author.id;
    channel.lastNumber = number;
    channel.addSave();
    await channel.save();
    await message.react(number === 100 ? '💯' : '✅');

    await Save.addSave(message.guild.id, message.author.id);
};