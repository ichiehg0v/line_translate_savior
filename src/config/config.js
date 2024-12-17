require('dotenv').config();

module.exports = {
    line: {
        channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
        channelSecret: process.env.LINE_CHANNEL_SECRET
    },
    openai: {
        apiKey: process.env.OPENAI_API_KEY
    },
    googleSheet: {
        sheetId: process.env.GOOGLE_SHEET_ID
    }
};
