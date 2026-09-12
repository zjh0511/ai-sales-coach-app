export function authMessage(code) {
  const messages={EMAIL_EXISTS:'這個 E-mail 已註冊，請直接登入。',INVALID_LOGIN_CREDENTIALS:'E-mail 或密碼不正確。',INVALID_PASSWORD:'E-mail 或密碼不正確。',EMAIL_NOT_FOUND:'E-mail 或密碼不正確。',USER_DISABLED:'此帳號已停用，請聯絡管理者。',OPERATION_NOT_ALLOWED:'舊 Firebase 專案尚未啟用這個登入方式，請在原專案開啟對應供應商。',INVALID_IDP_RESPONSE:'Google 登入憑證未通過，請重新選擇帳戶登入。',INVALID_EMAIL:'請輸入有效的 E-mail。',UNAUTHORIZED_DOMAIN:'目前網址尚未加入原 Firebase 專案的授權網域。',INVALID_API_KEY:'Firebase 公開設定無法使用，請確認原專案設定。',TOKEN_EXPIRED:'登入已過期，請重新登入。',INVALID_REFRESH_TOKEN:'登入已失效，請重新登入。',USER_NOT_FOUND:'登入帳號已不存在，請重新登入。'};
  return messages[String(code).split(' : ')[0]] || (/TOO_MANY/.test(code)?'嘗試次數過多，請稍後再試。':/WEAK_PASSWORD/.test(code)?'密碼強度不足，請至少使用 8 個字元。':'登入服務暫時無法完成操作，請稍後再試。');
}
export class AuthSession {
  constructor(storage,request=fetch,now=()=>Date.now()) {this.storage=storage;this.request=request;this.now=now;this.pending=null;try{this.value=JSON.parse(storage.getItem('hao.session')||'null');}catch{this.value=null;}}
  save(data){this.value={idToken:data.idToken||data.id_token,refreshToken:data.refreshToken||data.refresh_token,expiresAt:this.now()+Number(data.expiresIn||data.expires_in||3600)*1000};this.storage.setItem('hao.session',JSON.stringify(this.value));return this.value.idToken;}
  clear(){this.value=null;this.storage.removeItem('hao.session');this.storage.removeItem('hao.auth');}
  async token(apiKey){
    if(!this.value)return '';
    if(this.value.expiresAt>this.now()+60000)return this.value.idToken;
    if(!this.value.refreshToken){this.clear();throw new Error('登入已過期，請重新登入。');}
    if(this.pending)return this.pending;
    const before=this.value;
    this.pending=(async()=>{
      const r=await this.request(`https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(apiKey)}`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'refresh_token',refresh_token:before.refreshToken}),signal:AbortSignal.timeout(20000)});
      const data=await r.json();
      if(this.value!==before)return this.value?.idToken||'';
      if(!r.ok){if([400,401,403].includes(r.status))this.clear();throw new Error(authMessage(data.error?.message||''));}
      return this.save(data);
    })();
    try{return await this.pending;}finally{this.pending=null;}
  }
}
