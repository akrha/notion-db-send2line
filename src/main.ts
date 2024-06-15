const NOTION_API_KEY = PropertiesService.getScriptProperties().getProperty('NOTION_API_KEY') || '';
const NOTION_DATABASE_ID = PropertiesService.getScriptProperties().getProperty('NOTION_DATABASE_ID') || '';
const LINE_ACCESS_TOKEN = PropertiesService.getScriptProperties().getProperty('LINE_ACCESS_TOKEN') || '';
const LINE_USER_ID = PropertiesService.getScriptProperties().getProperty('LINE_USER_ID') || '';

const CREATED_TIME_PROPERTY_NAME = '作成日';

interface NotionEntry {
  id: string;
  properties: {
    Name: {
      title: Array<{
        text: {
          content: string;
        };
      }>;
    };
    [CREATED_TIME_PROPERTY_NAME]: {
      created_time: string;
    };
  };
  url: string;
}

function getNotionEntries(): any {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const url = `https://api.notion.com/v1/databases/${NOTION_DATABASE_ID}/query`;
  const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': `Bearer ${NOTION_API_KEY}`,
      'Notion-Version': '2022-06-28',
    },
    payload: JSON.stringify({
      filter: {
        property: CREATED_TIME_PROPERTY_NAME,
        date: {
          after: yesterday.toISOString()
        },
      },
    }),
  };

  const response = UrlFetchApp.fetch(url, options);
  return JSON.parse(response.getContentText());
}

function sendLineMessage(message: string): void {
  const url = 'https://api.line.me/v2/bot/message/push';
  const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': `Bearer ${LINE_ACCESS_TOKEN}`,
    },
    payload: JSON.stringify({
      to: LINE_USER_ID,
      messages: [
        {
          type: 'text',
          text: message,
        },
      ],
    }),
  };

  UrlFetchApp.fetch(url, options);
}

function main(): void {
  const entries = getNotionEntries();
  if (entries.results.length === 0) return;

  let message = `日記を更新しました。\n\n`;
  let entries_content: string[]= [];
  entries.results.forEach((entry: NotionEntry) => {
    if (entry.properties.Name.title) {
      const title = entry.properties.Name.title[0].text.content;
      const url = entry.url;
      const createdTime = new Date(entry.properties[CREATED_TIME_PROPERTY_NAME].created_time);

      entries_content.push(`タイトル: ${title}\nURL: ${url}\n作成日時: ${createdTime.toLocaleDateString('ja-JP')} ${createdTime.toLocaleTimeString('ja-JP')}`);

    } else {
      Logger.log('Title or Body property is missing or empty in entry: ' + JSON.stringify(entry));
    }
  });
  message += entries_content.join('\n----------\n');
  Logger.log(message);
  sendLineMessage(message);
}
