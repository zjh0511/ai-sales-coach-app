export class Conversation {
  constructor(voice, send, options, onError) { Object.assign(this,{voice,send,options,onError});this.epoch=0;this.active=false; }
  stop(){this.active=false;this.epoch++;this.voice.stop();this.options().cancelAudio?.();}
  start(){this.stop();this.active=true;this.listen(this.epoch);}
  listen(epoch){
    if(!this.active||epoch!==this.epoch)return;
    const fail=message=>{if(epoch!==this.epoch)return;this.stop();this.onError(message);};
    const begin=()=>{if(!this.active||epoch!==this.epoch)return;
    try { this.voice.listen(this.options().onText,fail,async text=>{
      if(!this.active||epoch!==this.epoch)return;
      if(!text){fail('沒有辨識到完整語句，語音對話已暫停。請再按開始。');return;}
      try{
        const audio=this.options().finishAudio?.();
        const answer=await this.send(text,audio);
        if(!this.active||epoch!==this.epoch)return;
        const {voiceURI,rate}=this.options();
        this.voice.speak(answer.reply,voiceURI,rate,()=>{
          if(answer.ended)this.stop();else this.listen(epoch);
        },fail);
      }catch(e){fail(e.message);}
    }); }catch(e){fail(e.message);}
    };
    const prepare=this.options().prepareAudio;
    if(prepare)Promise.resolve().then(()=>{if(this.active&&epoch===this.epoch)return prepare();}).then(begin).catch(e=>fail(e.message));else begin();
  }
}
