const line = require('@line/bot-sdk');
const express = require('express');
const { translateText } = require('./services/translationService');
const {
    getLanguageSettings,
    setLanguageSettings,
    updateVerificationStatus,
    isUserVerified
} = require('./services/googleSheets');

require('dotenv').config();

const config = {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new line.Client(config);
const app = express();

const PASSPHRASE = "大大武花大武花";

// 新增健康檢查端點
app.get('/', (req, res) => {
    res.send('Hello World!');
});

// 將路徑改回 /webhook
app.post('/webhook', line.middleware(config), async (req, res) => {
    try {
        await Promise.all(req.body.events.map(handleEvent));
        res.json({ status: 'ok' });
    } catch (err) {
        console.error('Error handling webhook:', err);
        res.status(500).end();
    }
});

async function handleEvent(event) {
    if (event.type !== 'message' || event.message.type !== 'text') {
        return null;
    }

    const sourceType = event.source.type; // 'user' 或 'group'
    const id = sourceType === 'user' ? event.source.userId : event.source.groupId;
    const inputText = event.message.text.trim();

    console.log(`Received ${sourceType} message:`, inputText, 'from:', id);

    // 檢查是否為通關密語
    if (inputText === PASSPHRASE) {
        console.log('Passphrase matched for:', id);
        if (sourceType === 'group') {
            // 如果是群組，記錄驗證者的 userId
            const verifierId = event.source.userId;
            await updateVerificationStatus(id, true, sourceType, verifierId);
        } else {
            await updateVerificationStatus(id, true, sourceType);
        }
        return client.replyMessage(event.replyToken, {
            type: 'text',
            text: '✨ 驗證成功！現在你可以使用翻譯功能了。\n\n請使用 /set 命令設定目標語言，例如：\n/set 繁體中文 日文 韓文'
        });
    }

    // 檢查是否已驗證
    const verified = await isUserVerified(id, sourceType);
    console.log('Verification status:', verified);
    if (!verified) {
        return client.replyMessage(event.replyToken, {
            type: 'text',
            text: '請輸入通關密語以啟用翻譯服務。'
        });
    }

    // 處理設定語言的命令
    if (inputText.startsWith('/set')) {
        return handleSetLanguage(event);
    }

    // 處理翻譯請求
    try {
        const settings = await getLanguageSettings(id, sourceType);
        if (!settings || !settings.languages || settings.languages.length === 0) {
            return client.replyMessage(event.replyToken, {
                type: 'text',
                text: '請先使用 /set 命令設定目標語言。\n例如：/set 繁體中文 日文 韓文'
            });
        }

        const translations = await translateText(inputText, settings.languages);
        const responseText = formatTranslations(translations);

        return client.replyMessage(event.replyToken, {
            type: 'text',
            text: responseText
        });
    } catch (error) {
        console.error('Translation error:', error);
        return client.replyMessage(event.replyToken, {
            type: 'text',
            text: '翻譯時發生錯誤，請稍後再試。'
        });
    }
}

async function handleSetLanguage(event) {
    const sourceType = event.source.type;
    const id = sourceType === 'user' ? event.source.userId : event.source.groupId;
    const languages = event.message.text.slice(4).trim().split(/[,，\s]+/).filter(Boolean);

    try {
        if (languages.length === 0) {
            return client.replyMessage(event.replyToken, {
                type: 'text',
                text: '請指定至少一個目標語言。\n例如：/set 繁體中文 日文 韓文'
            });
        }

        // 如果是群組，記錄設定者的 userId
        if (sourceType === 'group') {
            const setterId = event.source.userId;
            await setLanguageSettings(id, languages, true, sourceType, setterId);
        } else {
            await setLanguageSettings(id, languages, true, sourceType);
        }

        return client.replyMessage(event.replyToken, {
            type: 'text',
            text: `已設定翻譯語言為：${languages.join('、')}`
        });
    } catch (error) {
        console.error('Error setting languages:', error);
        return client.replyMessage(event.replyToken, {
            type: 'text',
            text: '設定語言時發生錯誤，請稍後再試。'
        });
    }
}

function formatTranslations(translations) {
    let response = '';
    for (const [lang, text] of Object.entries(translations)) {
        response += `${lang}：\n${text}\n\n`;
    }
    return response.trim();
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
