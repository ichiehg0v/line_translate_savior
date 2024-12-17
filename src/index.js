const line = require('@line/bot-sdk');
const express = require('express');
const { translateText, normalizeLanguage } = require('./services/translationService');
const {
    getLanguageSettings,
    setLanguageSettings,
    updateVerificationStatus,
    isUserVerified
} = require('./services/googleSheets');

require('dotenv').config();

const config = {
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.CHANNEL_SECRET,
};

const client = new line.Client(config);
const app = express();

const PASSPHRASE = "大大武花大武花";

app.post('/callback', line.middleware(config), async (req, res) => {
    try {
        await Promise.all(req.body.events.map(handleEvent));
        res.json({ status: 'ok' });
    } catch (err) {
        console.error(err);
        res.status(500).end();
    }
});

async function handleEvent(event) {
    if (event.type !== 'message' || event.message.type !== 'text') {
        return null;
    }

    const userId = event.source.userId || event.source.groupId;
    const inputText = event.message.text.trim();

    // 檢查是否為通關密語
    if (inputText === PASSPHRASE) {
        await updateVerificationStatus(userId, true);
        return client.replyMessage(event.replyToken, {
            type: 'text',
            text: '✨ 驗證成功！現在你可以使用翻譯功能了。\n\n請使用 /set 命令設定目標語言，例如：\n/set 繁體中文 日文 韓文'
        });
    }

    // 檢查用戶是否已驗證
    const verified = await isUserVerified(userId);
    if (!verified) {
        return client.replyMessage(event.replyToken, {
            type: 'text',
            text: '請輸入通關密語以啟用翻譯服務。'
        });
    }

    // 處理設定語言的命令
    if (inputText.startsWith('/set')) {
        return handleSetLanguage(event, userId, inputText);
    }

    // 處理翻譯請求
    try {
        const settings = await getLanguageSettings(userId);
        if (!settings || !settings.languages || settings.languages.length === 0) {
            return client.replyMessage(event.replyToken, {
                type: 'text',
                text: '請先使用 /set 命令設定目標語言。\n例如：/set 繁體中文 日文 韓文'
            });
        }

        const targetLanguages = settings.languages.map(normalizeLanguage);
        const translatedText = await translateText(inputText, targetLanguages);
        const translations = translatedText.split('\n\n');
        let responseText = '🌐 翻譯結果：\n\n';
        responseText += `🇺🇸 English:\n${translations[0]}\n\n`; // 第一個永遠是英文
        for (let i = 1; i < translations.length; i++) {
            responseText += `${settings.languages[i-1]}:\n${translations[i]}\n\n`;
        }

        return client.replyMessage(event.replyToken, {
            type: 'text',
            text: responseText.trim()
        });
    } catch (error) {
        console.error('Translation error:', error);
        return client.replyMessage(event.replyToken, {
            type: 'text',
            text: '翻譯時發生錯誤，請稍後再試。'
        });
    }
}

async function handleSetLanguage(event, userId, text) {
    console.log('Handling set language command:', text);
    try {
        // 分割命令，格式: /set 語言1 語言2 語言3 ...
        const parts = text.split(' ').filter(part => part.trim() !== '');
        console.log('Command parts:', parts);

        if (parts.length < 2) {
            console.log('Invalid command format');
            return client.replyMessage(event.replyToken, {
                type: 'text',
                text: '請使用正確的格式設置語言：\n/set 語言1 語言2 語言3 ...\n例如：/set 繁體中文 日文 韓文'
            });
        }

        // 移除 "/set" 並獲取語言列表
        const languages = parts.slice(1);
        console.log('Setting languages:', languages);

        // 儲存設定到 Google Sheets
        await setLanguageSettings(userId, languages);

        return client.replyMessage(event.replyToken, {
            type: 'text',
            text: `✅ 語言設定已更新：\n目標語言：${languages.join('、')}\n\n系統會自動將訊息翻譯成英文及以上語言。`
        });
    } catch (error) {
        console.error('Error setting language:', error);
        return client.replyMessage(event.replyToken, {
            type: 'text',
            text: '設定語言時發生錯誤，請稍後再試。'
        });
    }
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`listening on ${port}`);
});
