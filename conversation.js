export class Conversation {
  constructor(voice, send, options, onError) { Object.assign(this,{voice,send,options,onError});this.epoch=0;this.active=false; }
  stop(){clearTimeout(this.retryTimer);this.active=false;this.epoch++;this.voice.stop();this.options().cancelAudio?.();}
  start(opening){
    if(this.active)return;
    this.stop();this.active=true;this.emptyTurns=0;const epoch=this.epoch;
    // This first audible utterance must run synchronously in the tap handler.
    if(opening){const {voiceURI,rate}=this.options();try{this.voice.speak(opening,voiceURI,rate,()=>this.listen(epoch),message=>{if(epoch===this.epoch){this.stop();this.onError(message);}});}catch(e){this.stop();this.onError(e.message);}}
    else this.listen(epoch);
  }
  listen(epoch){
    if(!this.active||epoch!==this.epoch)return;
    const fail=message=>{if(epoch!==this.epoch)return;this.stop();this.onError(message);};
    const begin=()=>{if(!this.active||epoch!==this.epoch)return;let consumed=false;
    try { this.voice.listen(this.options().onText,fail,async text=>{
      if(!this.active||epoch!==this.epoch||consumed)return;
      consumed=true;
      if(!text){
        this.options().cancelAudio?.();
        if(++this.emptyTurns>=12){fail('暫時沒有聽到聲音，已暫停收音。準備好後可再開始。');return;}
        this.retryTimer=setTimeout(()=>this.listen(epoch),600);return;
      }
      this.emptyTurns=0;
      try{
        const audio=this.options().finishAudio?.();
        const answer=await this.send(text,audio);
        if(!this.active||epoch!==this.epoch)return;
        const {voiceURI,rate}=this.options();
        this.voice.speak(answer.reply,voiceURI,rate,()=>{
          if(!this.active||epoch!==this.epoch)return;
          if(answer.ended)this.stop();else this.retryTimer=setTimeout(()=>this.listen(epoch),300);
        },fail);
      }catch(e){fail(e.message);}
    }); }catch(e){fail(e.message);}
    };
    const prepare=this.options().prepareAudio;
    if(prepare)Promise.resolve().then(()=>{if(this.active&&epoch===this.epoch)return prepare();}).then(ready=>{if(ready===false){fail('錄音尚未就緒，請重試或取消本場聲音評估。');return;}begin();}).catch(e=>fail(e.message));else begin();
  }
}
