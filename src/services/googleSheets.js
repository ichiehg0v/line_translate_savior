const { google } = require('googleapis');
const sheets = google.sheets('v4');
require('dotenv').config();

// Sheet 設定
const SHEET_NAME = 'Sheet1';
const FULL_RANGE = `${SHEET_NAME}!A:D`;  // 增加一列用於存儲驗證狀態
const HEADERS = ['userId/groupId', 'languages', 'lastUpdated', 'isVerified'];

// 初始化 Google Sheets 客戶端
async function getAuthClient() {
    try {
        const auth = new google.auth.GoogleAuth({
            credentials: require('../../credentials/service-account.json'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        return auth.getClient();
    } catch (error) {
        console.error('Error initializing auth client:', error);
        throw error;
    }
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
                    values: [HEADERS]
                }
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
    console.log('Getting language settings for userId:', userId);
    try {
        const auth = await getAuthClient();
        const spreadsheetId = process.env.GOOGLE_SHEET_ID;

        // 確保表頭正確
        await ensureHeaders(auth, spreadsheetId);

        console.log('Fetching from sheet:', spreadsheetId, 'range:', FULL_RANGE);
        const response = await sheets.spreadsheets.values.get({
            auth,
            spreadsheetId,
            range: FULL_RANGE,
        });

        const rows = response.data.values || [];
        console.log('Received rows:', rows);
        
        if (rows.length > 1) {
            const userRow = rows.slice(1).find(row => row[0] === userId);
            console.log('Found user row:', userRow);
            
            if (userRow) {
                // 如果是舊資料（沒有 isVerified 欄位），預設為 false
                const isVerified = userRow[3] === 'true';
                
                // 如果是舊資料但有語言設定，自動更新資料格式
                if (userRow[1] && userRow[3] === undefined) {
                    await setLanguageSettings(userId, userRow[1].split(',').map(lang => lang.trim()), false);
                }

                return {
                    userId: userRow[0],
                    languages: userRow[1]?.split(',').map(lang => lang.trim()) || [],
                    lastUpdated: userRow[2],
                    isVerified: isVerified,
                    rowIndex: rows.indexOf(userRow) + 1
                };
            }
        }
        return null;
    } catch (error) {
        console.error('Error getting language settings:', error);
        throw error;
    }
}

// 儲存設定
async function setLanguageSettings(userId, languages, isVerified = false) {
    try {
        const auth = await getAuthClient();
        const spreadsheetId = process.env.GOOGLE_SHEET_ID;
        const now = new Date().toISOString();

        // 確保表頭正確
        await ensureHeaders(auth, spreadsheetId);

        // 檢查使用者是否已存在
        const existingSettings = await getLanguageSettings(userId);
        const languagesString = Array.isArray(languages) ? languages.join(', ') : languages;

        if (existingSettings) {
            // 更新現有設定
            const range = `${SHEET_NAME}!A${existingSettings.rowIndex}:D${existingSettings.rowIndex}`;
            await sheets.spreadsheets.values.update({
                auth,
                spreadsheetId,
                range,
                valueInputOption: 'RAW',
                resource: {
                    values: [[userId, languagesString, now, isVerified.toString()]]
                }
            });
        } else {
            // 新增設定
            await sheets.spreadsheets.values.append({
                auth,
                spreadsheetId,
                range: FULL_RANGE,
                valueInputOption: 'RAW',
                resource: {
                    values: [[userId, languagesString, now, isVerified.toString()]]
                }
            });
        }
        return true;
    } catch (error) {
        console.error('Error setting language settings:', error);
        throw error;
    }
}

// 更新驗證狀態
async function updateVerificationStatus(userId, isVerified) {
    const settings = await getLanguageSettings(userId);
    if (settings) {
        return setLanguageSettings(userId, settings.languages, isVerified);
    }
    return setLanguageSettings(userId, [], isVerified);
}

// 檢查使用者是否已有設定
async function hasLanguageSettings(userId) {
    const settings = await getLanguageSettings(userId);
    return settings !== null;
}

// 檢查使用者是否已驗證
async function isUserVerified(userId) {
    const settings = await getLanguageSettings(userId);
    return settings?.isVerified || false;
}

module.exports = {
    getLanguageSettings,
    setLanguageSettings,
    hasLanguageSettings,
    updateVerificationStatus,
    isUserVerified
};
