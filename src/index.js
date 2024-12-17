const express = require('express');
const line = require('@line/bot-sdk');
const config = require('./config/config');
const { translateText } = require('./services/translationService');
const { getLanguageSettings, setLanguageSettings } = require('./services/googleSheets');

const app = express();

// LINE SDK config
const lineConfig = {
    channelAccessToken: config.line.channelAccessToken,
    channelSecret: config.line.channelSecret
};

// Create LINE client
const client = new line.Client(lineConfig);

app.get('/', (req, res) => {
    res.send('Hello, World!');
});
app.post('/webhook', line.middleware(lineConfig), async (req, res) => {
    try {
        const events = req.body.events;
        await Promise.all(events.map(handleEvent));
        res.sendStatus(200);
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).end();
    }
});

async function handleEvent(event) {
    if (event.type !== 'message' || event.message.type !== 'text') {
        return null;
    }

    const sourceId = event.source.groupId || event.source.userId;
    const text = event.message.text.trim();

    // 處理設置語言的命令
    if (text.startsWith('/set')) {
        return handleSetLanguage(event, sourceId, text);
    }

    try {
        // 獲取語言設定
        const settings = await getLanguageSettings(sourceId);
        const targetLang = settings?.targetLang || '繁體中文（台灣）'; // 預設目標語言
        const sourceLang = settings?.sourceLang || '印尼語'; // 預設來源語言

        // 翻譯文字
        const translatedText = await translateText(text, targetLang);
        
        // 分割回應為英文和目標語言
        const [englishText, targetText] = translatedText.split('\n\n');
        
        // 發送翻譯結果
        return client.replyMessage(event.replyToken, {
            type: 'text',
            text: `🌐 英文翻譯：\n${englishText}\n\n🎯 ${targetLang}：\n${targetText || englishText}`
        });
    } catch (error) {
        console.error('Translation error:', error);
        return client.replyMessage(event.replyToken, {
            type: 'text',
            text: '翻譯時發生錯誤，請稍後再試。'
        });
    }
}

async function handleSetLanguage(event, sourceId, text) {
    console.log('Handling set language command:', text);
    try {
        // 預期格式: /set 來源語言 目標語言
        const parts = text.split(' ');
        console.log('Command parts:', parts);

        if (parts.length !== 3) {
            console.log('Invalid command format');
            return client.replyMessage(event.replyToken, {
                type: 'text',
                text: '請使用正確的格式設置語言：\n/set 來源語言 目標語言\n例如：/set 印尼語 繁體中文'
            });
        }

        const sourceLang = parts[1];
        const targetLang = parts[2];
        console.log('Setting languages:', { sourceLang, targetLang });

        // 儲存設定到 Google Sheets
        const result = await setLanguageSettings(sourceId, sourceLang, targetLang);
        console.log('Settings update result:', result);

        return client.replyMessage(event.replyToken, {
            type: 'text',
            text: `✅ 語言設定已更新：\n來源語言：${sourceLang}\n目標語言：${targetLang}`
        });
    } catch (error) {
        console.error('Error setting language:', error);
        return client.replyMessage(event.replyToken, {
            type: 'text',
            text: '設定語言時發生錯誤，請稍後再試。\n錯誤訊息：' + error.message
        });
    }
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
