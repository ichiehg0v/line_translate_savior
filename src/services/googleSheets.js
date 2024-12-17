const { google } = require('googleapis');
const sheets = google.sheets('v4');
require('dotenv').config();

// Sheet 設定
const SHEET_NAME = 'Sheet1';  // 使用預設的工作表名稱
const FULL_RANGE = `${SHEET_NAME}!A:D`;

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

// 讀取設定
async function getLanguageSettings(userId) {
    console.log('Getting language settings for userId:', userId);
    try {
        const auth = await getAuthClient();
        const spreadsheetId = process.env.GOOGLE_SHEET_ID;

        console.log('Fetching from sheet:', spreadsheetId, 'range:', FULL_RANGE);
        const response = await sheets.spreadsheets.values.get({
            auth,
            spreadsheetId,
            range: FULL_RANGE,
        });

        const rows = response.data.values || [];
        console.log('Received rows:', rows);
        
        if (rows.length) {
            // 跳過表頭行
            const userRow = rows.slice(1).find(row => row[0] === userId);
            console.log('Found user row:', userRow);
            
            if (userRow) {
                return {
                    userId: userRow[0],
                    sourceLang: userRow[1],
                    targetLang: userRow[2],
                    lastUpdated: userRow[3],
                    rowIndex: rows.indexOf(userRow) + 1
                };
            }
        }
        return null;
    } catch (error) {
        console.error('Error reading from Google Sheets:', error);
        throw error;
    }
}

// 儲存設定
async function setLanguageSettings(userId, sourceLang, targetLang) {
    console.log('Setting language settings:', { userId, sourceLang, targetLang });
    try {
        const auth = await getAuthClient();
        const spreadsheetId = process.env.GOOGLE_SHEET_ID;
        
        // 檢查是否已存在設定
        const existingSettings = await getLanguageSettings(userId);
        const now = new Date().toISOString();
        
        console.log('Existing settings:', existingSettings);

        if (existingSettings) {
            // 更新現有行
            const updateRange = `${SHEET_NAME}!A${existingSettings.rowIndex}:D${existingSettings.rowIndex}`;
            console.log('Updating existing row at range:', updateRange);
            
            await sheets.spreadsheets.values.update({
                auth,
                spreadsheetId,
                range: updateRange,
                valueInputOption: 'RAW',
                resource: {
                    values: [[userId, sourceLang, targetLang, now]]
                }
            });
        } else {
            // 新增一行
            console.log('Appending new row');
            
            // 如果是空表，先加入表頭
            const currentValues = await sheets.spreadsheets.values.get({
                auth,
                spreadsheetId,
                range: FULL_RANGE,
            });
            
            if (!currentValues.data.values || currentValues.data.values.length === 0) {
                // 加入表頭
                await sheets.spreadsheets.values.append({
                    auth,
                    spreadsheetId,
                    range: FULL_RANGE,
                    valueInputOption: 'RAW',
                    insertDataOption: 'INSERT_ROWS',
                    resource: {
                        values: [['userId/groupId', 'sourceLang', 'targetLang', 'lastUpdated']]
                    }
                });
            }
            
            // 加入新的資料行
            await sheets.spreadsheets.values.append({
                auth,
                spreadsheetId,
                range: FULL_RANGE,
                valueInputOption: 'RAW',
                insertDataOption: 'INSERT_ROWS',
                resource: {
                    values: [[userId, sourceLang, targetLang, now]]
                }
            });
        }
        console.log('Successfully updated/added settings');
        return true;
    } catch (error) {
        console.error('Error writing to Google Sheets:', error);
        throw error;
    }
}

// 檢查使用者是否已有設定
async function hasLanguageSettings(userId) {
    const settings = await getLanguageSettings(userId);
    return settings !== null;
}

module.exports = {
    getLanguageSettings,
    setLanguageSettings,
    hasLanguageSettings
};
