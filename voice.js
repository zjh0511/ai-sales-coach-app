export class Voice {
  constructor(onState) {
    this.onState = onState; this.synth = window.speechSynthesis;
    this.Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.listening = false; this.speaking = false; this.voices = []; this.status = '麥克風未開啟';
    this.refresh = () => { this.voices = this.synth?.getVoices() || []; this.onState?.(); };
    this.synth?.addEventListener('voiceschanged', this.refresh); this.refresh();
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.stop(); });
  }
  get chineseVoices() { return this.voices.filter(v => /^zh|cmn/i.test(v.lang)).sort((a,b) => Number(/^zh[-_]TW$/i.test(b.lang)) - Number(/^zh[-_]TW$/i.test(a.lang)) || Number(b.localService) - Number(a.localService)); }
  stop() { clearTimeout(this.timer); clearTimeout(this.endTimer);clearTimeout(this.speechTimer);clearInterval(this.speechPoll); const old = this.recognition; const speaking=this.utterance;this.recognition = null; this.utterance = null; try{old?.abort();}catch{} if(speaking)this.synth?.cancel(); this.listening = false; this.speaking = false; this.status = '已停止收音與播放'; this.onState?.(); }
  speak(text, voiceURI, rate = 1, onDone, onError) {
    if (!this.synth) throw new Error('這個瀏覽器不支援朗讀，請使用文字閱讀。');
    this.stop();
    this.refresh();
    const sentence = new SpeechSynthesisUtterance(text); this.utterance = sentence;
    sentence.lang = 'zh-TW'; sentence.rate = Number(rate) || 1; sentence.volume = 1;
    sentence.voice = this.voices.find(v => v.voiceURI === voiceURI) || this.chineseVoices[0] || null;
    if(sentence.voice)sentence.lang=sentence.voice.lang;
    this.status = '正在準備朗讀…'; this.onState?.();
    const fail=()=>{if(this.utterance!==sentence)return;clearTimeout(this.speechTimer);clearInterval(this.speechPoll);this.utterance=null;this.speaking=false;this.synth.cancel();this.status='裝置未能播放聲音。請確認媒體音量，按「播放上一句並繼續」重試。';this.onState?.();onError?.(this.status);};
    const done=()=>{if(this.utterance!==sentence)return;clearTimeout(this.speechTimer);clearInterval(this.speechPoll);this.utterance=null;this.speaking=false;this.status='朗讀已完成';this.onState?.();onDone?.();};
    sentence.onstart = () => {
      if(this.utterance !== sentence)return; clearTimeout(this.speechTimer);clearInterval(this.speechPoll);this.speaking = true; this.status = '教練正在朗讀…'; this.onState?.();this.speechTimer=setTimeout(fail,Math.max(30000,text.length*1000));
      // Some devices finish playback but omit onend. Require onstart plus two
      // consecutive idle observations; never listen over a paused utterance.
      let idle=0;this.speechPoll=setInterval(()=>{if(this.utterance!==sentence)return;idle=this.synth.speaking===false&&this.synth.pending===false&&this.synth.paused!==true?idle+1:0;if(idle>=2)done();},300);
    };
    sentence.onend = done;
    sentence.onerror = fail;
    this.speechTimer=setTimeout(fail,10000);
    this.synth.resume?.();
    this.synth.speak(sentence);
  }
  listen(onText, onError, onEnd) {
    if (!this.Recognition) throw new Error('這個瀏覽器沒有提供語音辨識。可先使用文字練習，或以 Chrome／Edge 再測試。');
    if (!window.isSecureContext) throw new Error('麥克風需要安全連線或本機預覽環境。');
    this.stop();
    const rec = new this.Recognition(); this.recognition = rec;
    let finalText = '', failed = false, stopping=false;
    const fail=message=>{
      if(this.recognition!==rec)return;
      failed=true;this.recognition=null;clearTimeout(this.timer);clearTimeout(this.endTimer);
      try{rec.abort();}catch{}
      this.listening=false;this.status=message;this.onState?.();onError?.(message);
    };
    const requestEnd=()=>{
      if(this.recognition!==rec||stopping)return;
      stopping=true;clearTimeout(this.timer);
      // Keep ownership until onend; never discard a still-running microphone.
      this.endTimer=setTimeout(()=>fail('手機語音辨識未正常結束，已停止收音。請重新開始；若持續發生，請用瀏覽器開啟網站後再試。'),4000);
      try{rec.stop();}catch{fail('語音辨識未能完成這一句，請重新開始。');}
    };
    const finish = () => {
      if(this.recognition!==rec)return;
      this.recognition=null; clearTimeout(this.timer);clearTimeout(this.endTimer); this.listening=false;
      this.status=finalText?'已收到語句，正在準備回應…':'收音已結束'; this.onState?.();
      if(!failed)onEnd?.(finalText);
    };
    rec.lang = 'zh-TW'; rec.continuous = false; rec.interimResults = true;
    const stalled=()=>{
      if(this.recognition!==rec||stopping)return;
      this.recognition=null;clearTimeout(this.timer);clearTimeout(this.endTimer);
      try{rec.abort();}catch{}
      this.listening=false;this.status='收音尚未取得文字，正在重新連接…';this.onState?.();
      if(onEnd)onEnd('',{reason:'stalled'});else onError?.('收音沒有取得文字，請重新接通收音。');
    };
    const arm=()=>{clearTimeout(this.timer);this.timer=setTimeout(stalled,12000);};
    rec.onstart = () => { if(this.recognition!==rec)return;arm(); this.listening = false; this.status = '正在連接麥克風…'; this.onState?.(); };
    rec.onaudiostart = () => {if(this.recognition!==rec||stopping)return;arm();this.listening=true;this.status='麥克風已接通，請說話…';this.onState?.();};
    rec.onresult = e => {
      if(this.recognition!==rec)return;
      if(stopping)return;
      arm();this.listening=true;this.status='正在辨識你的話…';this.onState?.();
      let text = ''; let final = false;
      for (let i = 0; i < e.results.length; i++) { text += e.results[i][0].transcript; final ||= e.results[i].isFinal; }
      onText(text, final);
      finalText = Array.from(e.results).filter(r=>r.isFinal).map(r=>r[0].transcript).join('').trim();
      // Mobile must release recognition before recording cleanup or playback.
      if(onEnd && finalText && Array.from(e.results).every(r=>r.isFinal)) {
        requestEnd();
      }
    };
    rec.onerror = e => {
      if(this.recognition!==rec)return;
      const messages = { 'not-allowed': '麥克風權限未開啟，請在瀏覽器允許後重試。', 'audio-capture': '找不到可用的麥克風。', 'no-speech': '沒有聽到聲音，請靠近麥克風再試一次。', network: '語音辨識服務連線失敗，可先輸入文字。', 'service-not-allowed': '瀏覽器不允許使用這個語音服務，可先用文字練習。' };
      // Normal mobile silence ends this recognition turn, not the conversation.
      if(e.error==='no-speech'){requestEnd();return;}
      fail(messages[e.error] || (e.error==='aborted'?'裝置中斷了收音，請重新開始語音對話。':'語音辨識暫時無法使用，請重試。'));
    };
    rec.onend = finish;
    this.timer=setTimeout(()=>fail('麥克風沒有啟動。請確認語音權限後重新開始。'),12000);
    try{rec.start();}catch{fail('無法啟動語音辨識，請確認麥克風權限後重試。');}
  }
}
