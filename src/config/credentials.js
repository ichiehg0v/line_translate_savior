require('dotenv').config();

function getGoogleCredentials() {
    if (process.env.GOOGLE_CREDENTIALS) {
        // 如果環境變數中有 credentials，使用它
        return JSON.parse(process.env.GOOGLE_CREDENTIALS);
    }

    try {
        // 否則嘗試從文件讀取
        return require('../../credentials/service-account.json');
    } catch (error) {
        console.error('Error loading Google credentials:', error);
        throw new Error('Google credentials not found');
    }
}

module.exports = {
    getGoogleCredentials
};
