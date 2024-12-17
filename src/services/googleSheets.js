const { google } = require('googleapis');
const sheets = google.sheets('v4');
const { getGoogleCredentials } = require('../config/credentials');
require('dotenv').config();

// Sheet 設定
const SHEET_NAME = 'Sheet1';
const FULL_RANGE = `${SHEET_NAME}!A:D`;
const HEADERS = ['userId/groupId', 'languages', 'lastUpdated', 'isVerified'];

// 初始化 Google Sheets 客戶端
async function getAuthClient() {
    try {
        const credentials = getGoogleCredentials();
        const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        return auth.getClient();
    } catch (error) {
        console.error('Error initializing auth client:', error);
        throw error;
    }
}

// 建立一個快取的 auth client
let cachedAuth = null;
async function getCachedAuthClient() {
    if (!cachedAuth) {
        cachedAuth = await getAuthClient();
    }
    return cachedAuth;
}

// 確保表頭正確
async function ensureHeaders(auth, spreadsheetId) {
    try {
        const response = await sheets.spreadsheets.values.get({
            auth,
            spreadsheetId,
            range: `${SHEET_NAME}!A1:D1`,
        });

        const currentHeaders = response.data.values?.[0] || [];
        if (!arraysEqual(currentHeaders, HEADERS)) {
            await sheets.spreadsheets.values.update({
                auth,
                spreadsheetId,
                range: `${SHEET_NAME}!A1:D1`,
                valueInputOption: 'RAW',
                resource: {
                    values: [HEADERS],
                },
            });
        }
    } catch (error) {
        console.error('Error ensuring headers:', error);
        throw error;
    }
}

// 比較兩個陣列是否相等
function arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    return a.every((val, index) => val === b[index]);
}

// 讀取設定
async function getLanguageSettings(userId) {
    try {
        const auth = await getCachedAuthClient();
        const spreadsheetId = process.env.GOOGLE_SHEET_ID;

        const response = await sheets.spreadsheets.values.get({
            auth,
            spreadsheetId,
            range: FULL_RANGE,
        });

        const rows = response.data.values || [];
        const userRow = rows.find(row => row[0] === userId);

        if (!userRow) {
            return null;
        }

        return {
            languages: userRow[1] ? JSON.parse(userRow[1]) : [],
            lastUpdated: userRow[2] || null,
            isVerified: userRow[3] === 'true'
        };
    } catch (error) {
        console.error('Error getting language settings:', error);
        throw error;
    }
}

// 儲存設定
async function setLanguageSettings(userId, languages, isVerified = false) {
    try {
        const auth = await getCachedAuthClient();
        const spreadsheetId = process.env.GOOGLE_SHEET_ID;

        await ensureHeaders(auth, spreadsheetId);

        const response = await sheets.spreadsheets.values.get({
            auth,
            spreadsheetId,
            range: FULL_RANGE,
        });

        const rows = response.data.values || [];
        const rowIndex = rows.findIndex(row => row[0] === userId);
        const now = new Date().toISOString();
        const newRow = [userId, JSON.stringify(languages), now, isVerified.toString()];

        if (rowIndex === -1) {
            // Add new row
            await sheets.spreadsheets.values.append({
                auth,
                spreadsheetId,
                range: FULL_RANGE,
                valueInputOption: 'RAW',
                resource: {
                    values: [newRow],
                },
            });
        } else {
            // Update existing row
            await sheets.spreadsheets.values.update({
                auth,
                spreadsheetId,
                range: `${SHEET_NAME}!A${rowIndex + 1}:D${rowIndex + 1}`,
                valueInputOption: 'RAW',
                resource: {
                    values: [newRow],
                },
            });
        }
    } catch (error) {
        console.error('Error setting language settings:', error);
        throw error;
    }
}

// 更新驗證狀態
async function updateVerificationStatus(userId, isVerified) {
    const settings = await getLanguageSettings(userId);
    const languages = settings ? settings.languages : [];
    return setLanguageSettings(userId, languages, isVerified);
}

// 檢查使用者是否已有設定
async function hasLanguageSettings(userId) {
    const settings = await getLanguageSettings(userId);
    return settings !== null;
}

// 檢查使用者是否已驗證
async function isUserVerified(userId) {
    const settings = await getLanguageSettings(userId);
    return settings ? settings.isVerified : false;
}

module.exports = {
    getLanguageSettings,
    setLanguageSettings,
    hasLanguageSettings,
    isUserVerified,
    updateVerificationStatus
};
