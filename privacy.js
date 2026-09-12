export function checkCustomerText(text) {
  const value = String(text || '').normalize('NFKC');
  const patterns = [
    [/[A-Z][12]\d{8}\b/i, '身分證字號'], [/09[\d\s-]{8,12}/, '手機號碼'],
    [/(?:\+886[-\s]?|0[2-8][-\s]?)[\d-]{7,10}/, '電話號碼'],
    [/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i, '電子郵件'],
    [/(?:姓名|客戶叫|名字是|名叫|聯絡人)\s*[:：為是]?\s*[\p{L}]{2,}/u, '真實姓名'],
    [/[\p{Script=Han}]{2,}(?:路|街|大道)[\p{Script=Han}\d段巷弄-]{0,16}\d+號/u, '詳細地址'],
    [/(?:保單號碼|帳號|身分證|身份證|病歷號)\s*[:：]?\s*[a-z\d-]{5,}/i, '識別號碼'],
    [/(?:AIza[\w-]{25,}|sk-or-v1-[\w-]+|gsk_[\w-]{15,})/, 'API Key'],
    [/data:image|<img\b|base64,/i, '圖片資料'],
  ];
  const issues = patterns.filter(([p])=>p.test(value)).map(([,name])=>name);
  if(issues.length)throw new Error(`請先移除${issues.join('、')}，改用概括背景。`);
  return value;
}
