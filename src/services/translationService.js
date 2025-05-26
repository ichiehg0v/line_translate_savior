const { OpenAI } = require('openai');
const config = require('../config/config');

const openai = new OpenAI({
    apiKey: config.openai.apiKey
});

async function translateText(text, targetLanguages) {
    try {
        // 首先翻譯成英文
        const englishResponse = await openai.chat.completions.create({
            model: "gpt-4.1-nano",
            messages: [{
                role: "system",
                content: `You are a professional translator. Please rewrite the input text to English only. No additional explanations needed.`
            }, {
                role: "user",
                content: text
            }]
        });

        const englishText = englishResponse.choices[0].message.content;
        const translations = { 'English': englishText }; // 使用物件來儲存翻譯結果

        // 翻譯成其他目標語言
        for (const targetLang of targetLanguages) {
            if (targetLang.toLowerCase() === 'english') continue; // 跳過英文

            const response = await openai.chat.completions.create({
                model: "gpt-4.1-nano",
                messages: [{
                    role: "system",
                    content: `You are a professional translator. Please rewrite the following English text to ${targetLang}. No additional explanations needed.`
                }, {
                    role: "user",
                    content: englishText
                }]
            });

            translations[targetLang] = response.choices[0].message.content;
        }

        // 返回翻譯結果物件
        return translations;
    } catch (error) {
        console.error('Translation error:', error);
        throw error;
    }
}

// 語言代碼映射表
const languageMapping = {
    '繁體中文': 'Traditional Chinese',
    '簡體中文': 'Simplified Chinese',
    '日文': 'Japanese',
    '韓文': 'Korean',
    '英文': 'English',
    // 可以根據需要添加更多映射
};

// 轉換語言代碼
function normalizeLanguage(lang) {
    return languageMapping[lang] || lang;
}

module.exports = { 
    translateText,
    normalizeLanguage
};
