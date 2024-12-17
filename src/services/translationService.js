const { OpenAI } = require('openai');
const config = require('../config/config');

const openai = new OpenAI({
    apiKey: config.openai.apiKey
});

async function translateText(text, targetLang) {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [{
                role: "system",
                content: `You are a professional translator. Please translate the input text in two steps:
1. First translate to English
2. Then translate to ${targetLang}

Format your response exactly like this:
[English translation]

[${targetLang} translation]`
            }, {
                role: "user",
                content: text
            }]
        });
        return response.choices[0].message.content;
    } catch (error) {
        console.error('Translation error:', error);
        throw error;
    }
}

module.exports = { translateText };
