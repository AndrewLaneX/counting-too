const fs = require('fs');
const mongoose = require('mongoose');
const Discord = require('discord.js');
const Channel = require('./models/channel');
const Save = require('./models/save');

require('dotenv').config();

const prefix = process.env.BOT_PREFIX || '2!';
const client = new Discord.Client();

client.prefix = prefix;
client.commands = new Discord.Collection();

const commandFiles = fs
    .readdirSync(__dirname + '/commands')
    .filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command);
}

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

const formatSaveMessage = (userId, saves, lastNumber) =>
    `⚠️ <@${userId}> You have used **1** of your saves. You have **${saves.toFixed(
        2,
    )}** left. The next number is **${lastNumber + 1}**`;

client.on('message', async message => {
    if (message.author.bot) return;

    if (message.guild === null) {
        await message.reply('Sup');
        return;
    }

    const words = message.content.split(' ');
    const number = /^\d+$/.test(words[0]) ? Number(words[0]) : null;

    if (number) {
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
                await channel.save();

                await message.react('✅');
                await Save.addSave(message.guild.id, message.author.id);

                return;
            }

            if (await Save.hasSaves(message.guild.id, message.author.id)) {
                await Save.useSave(message.guild.id, message.author.id);

                const saves = await Save.getSaves(
                    message.guild.id,
                    message.author.id,
                );
                await message.channel.send(
                    formatSaveMessage(
                        message.author.id,
                        saves,
                        channel.lastNumber,
                    ),
                );

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
                    formatSaveMessage(
                        message.author.id,
                        saves,
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
                    formatSaveMessage(
                        message.author.id,
                        saves,
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
        await channel.save();
        await message.react(number === 100 ? '💯' : '✅');

        await Save.addSave(message.guild.id, message.author.id);
        return;
    }

    let command = words[0].toLowerCase();
    if (command.startsWith(prefix)) {
        command = command.slice(prefix.length);
        const args = words.slice(1);

        if (!client.commands.has(command)) {
            return;
        }

        try {
            const handler = client.commands.get(command);
            const result = handler.execute(message, args);

            if (result instanceof Promise) {
                await result;
            }
        } catch (error) {
            console.error(error);
            await message.reply('there was an error.');
        }
    }
});

mongoose
    .connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useCreateIndex: true,
        useFindAndModify: true,
    })
    .then(() => {
        console.log('Connected to MongoDB');

        client.login(process.env.BOT_TOKEN);
    });
