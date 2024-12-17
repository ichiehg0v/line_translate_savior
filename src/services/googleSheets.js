const { google } = require('googleapis');
const sheets = google.sheets('v4');
const { getGoogleCredentials } = require('../config/credentials');
require('dotenv').config();

// Sheet 設定
const SHEET_NAME = 'Sheet1';
const FULL_RANGE = `${SHEET_NAME}!A:F`;  // 增加 lastModifiedBy 欄位
const HEADERS = ['id', 'type', 'languages', 'lastUpdated', 'isVerified', 'lastModifiedBy'];  // 修改欄位結構

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
            range: `${SHEET_NAME}!A1:F1`,
        });

        const currentHeaders = response.data.values?.[0] || [];
        if (!arraysEqual(currentHeaders, HEADERS)) {
            await sheets.spreadsheets.values.update({
                auth,
                spreadsheetId,
                range: `${SHEET_NAME}!A1:F1`,
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
async function getLanguageSettings(id, type = 'user') {
    try {
        const auth = await getCachedAuthClient();
        const spreadsheetId = process.env.GOOGLE_SHEET_ID;

        const response = await sheets.spreadsheets.values.get({
            auth,
            spreadsheetId,
            range: FULL_RANGE,
        });

        const rows = response.data.values || [];
        const settingRow = rows.find(row => row[0] === id && row[1] === type);

        if (!settingRow) {
            return null;
        }

        let languages = [];
        if (settingRow[2]) {
            try {
                languages = JSON.parse(settingRow[2]);
            } catch (e) {
                languages = settingRow[2].split(',').map(lang => lang.trim());
                await setLanguageSettings(id, languages, settingRow[4] === 'true', type, settingRow[5]);
            }
        }

        return {
            languages: languages,
            lastUpdated: settingRow[3] || null,
            isVerified: settingRow[4] === 'true',
            lastModifiedBy: settingRow[5] || null
        };
    } catch (error) {
        console.error('Error getting language settings:', error);
        throw error;
    }
}

// 儲存設定
async function setLanguageSettings(id, languages, isVerified = false, type = 'user', modifiedBy = null) {
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
        const rowIndex = rows.findIndex(row => row[0] === id && row[1] === type);
        const now = new Date().toISOString();
        const newRow = [id, type, JSON.stringify(languages), now, isVerified.toString(), modifiedBy];

        if (rowIndex === -1) {
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
            await sheets.spreadsheets.values.update({
                auth,
                spreadsheetId,
                range: `${SHEET_NAME}!A${rowIndex + 1}:F${rowIndex + 1}`,
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
async function updateVerificationStatus(id, isVerified, type = 'user', modifiedBy = null) {
    const settings = await getLanguageSettings(id, type);
    const languages = settings ? settings.languages : [];
    return setLanguageSettings(id, languages, isVerified, type, modifiedBy);
}

// 檢查使用者是否已有設定
async function hasLanguageSettings(id, type = 'user') {
    const settings = await getLanguageSettings(id, type);
    return settings !== null;
}

// 檢查是否已驗證
async function isUserVerified(id, type = 'user') {
    const settings = await getLanguageSettings(id, type);
    return settings ? settings.isVerified : false;
}

module.exports = {
    getLanguageSettings,
    setLanguageSettings,
    hasLanguageSettings,
    isUserVerified,
    updateVerificationStatus
};
