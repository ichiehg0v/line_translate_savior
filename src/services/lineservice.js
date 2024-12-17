const line = require('@line/bot-sdk');
const config = require('../config/config');

const client = new line.Client(config.line);

async function handleMessage(event) {
    // 實作訊息處理邏輯
}

module.exports = {
    client,
    handleMessage
};
