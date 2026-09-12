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
  stop() { clearTimeout(this.timer); const old = this.recognition; this.recognition = null; this.utterance = null; old?.abort(); this.synth?.cancel(); this.listening = false; this.speaking = false; this.status = '已停止收音與播放'; this.onState?.(); }
  speak(text, voiceURI, rate = 1, onDone, onError) {
    if (!this.synth) throw new Error('這個瀏覽器不支援朗讀，請使用文字閱讀。');
    this.stop();
    const sentence = new SpeechSynthesisUtterance(text); this.utterance = sentence;
    sentence.lang = 'zh-TW'; sentence.rate = Number(rate) || 1;
    sentence.voice = this.voices.find(v => v.voiceURI === voiceURI) || this.chineseVoices[0] || null;
    this.status = '正在準備朗讀…'; this.onState?.();
    sentence.onstart = () => { if(this.utterance !== sentence)return; this.speaking = true; this.status = '教練正在朗讀…'; this.onState?.(); };
    sentence.onend = () => { if(this.utterance !== sentence)return; this.speaking = false; this.status = '朗讀已完成'; this.onState?.(); onDone?.(); };
    sentence.onerror = e => { if(this.utterance !== sentence)return; this.speaking = false; this.status = ['canceled','interrupted'].includes(e.error) ? '播放已停止' : '此瀏覽器未能播放音訊，請在桌面 Chrome／Edge 試聽。'; this.onState?.(); onError?.(this.status); };
    this.synth.speak(sentence);
  }
  listen(onText, onError, onEnd) {
    if (!this.Recognition) throw new Error('這個瀏覽器沒有提供語音辨識。可先使用文字練習，或以 Chrome／Edge 再測試。');
    if (!window.isSecureContext) throw new Error('麥克風需要安全連線或本機預覽環境。');
    this.stop();
    const rec = new this.Recognition(); this.recognition = rec;
    let finalText = '', failed = false;
    const finish = () => {
      if(this.recognition!==rec)return;
      this.recognition=null; clearTimeout(this.timer); this.listening=false;
      this.status=finalText?'已收到語句，正在準備回應…':'收音已結束'; this.onState?.();
      if(!failed)onEnd?.(finalText);
    };
    rec.lang = 'zh-TW'; rec.continuous = false; rec.interimResults = true;
    rec.onstart = () => { if(this.recognition!==rec)return; this.listening = true; this.status = '正在聆聽… 說完後可按停止'; this.onState?.(); };
    rec.onresult = e => {
      if(this.recognition!==rec)return;
      let text = ''; let final = false;
      for (let i = 0; i < e.results.length; i++) { text += e.results[i][0].transcript; final ||= e.results[i].isFinal; }
      onText(text, final);
      finalText = Array.from(e.results).filter(r=>r.isFinal).map(r=>r[0].transcript).join('').trim();
      // A non-continuous final utterance is ready; do not wait for the browser's
      // delayed onend event. Never send interim text or send the utterance twice.
      if(onEnd && finalText && Array.from(e.results).every(r=>r.isFinal)) {
        rec.stop(); finish();
      }
    };
    rec.onerror = e => {
      if(this.recognition!==rec)return;
      const messages = { 'not-allowed': '麥克風權限未開啟，請在瀏覽器允許後重試。', 'audio-capture': '找不到可用的麥克風。', 'no-speech': '沒有聽到聲音，請靠近麥克風再試一次。', network: '語音辨識服務連線失敗，可先輸入文字。', 'service-not-allowed': '瀏覽器不允許使用這個語音服務，可先用文字練習。' };
      failed=true;
      if (e.error !== 'aborted') { this.status = messages[e.error] || '語音辨識暫時無法使用，請重試。'; onError(this.status); }
    };
    rec.onend = finish;
    rec.start(); this.timer = setTimeout(() => rec.stop(), 45000);
  }
}
