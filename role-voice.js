// Windows voice labels: Microsoft Support, Appendix A: supported languages/voices.
// Web Speech has no standard gender field; unknown names are never guessed.
export function voiceGender(v){
 if(/\bMicrosoft\b/i.test(v.name)&&/\bZhiwei\b/i.test(v.name))return '男';
 if(/\bMicrosoft\b/i.test(v.name)&&/\b(?:Yating|Hanhan)\b/i.test(v.name))return '女';
 return '';
}
export function selectRoleVoice(voices,{mode,gender,preferred='',male='',female=''}={}){
 const chinese=voices.filter(v=>/^zh|cmn/i.test(v.lang));
 const fallback=chinese.find(v=>v.voiceURI===preferred)||chinese[0];
 if(mode!=='practice'||!['男','女'].includes(gender))return {voice:fallback,matched:true,automatic:false};
 const manual=chinese.find(v=>v.voiceURI===(gender==='男'?male:female));
 const known=chinese.filter(v=>voiceGender(v)===gender).sort((a,b)=>Number(/^zh[-_]TW$/i.test(b.lang))-Number(/^zh[-_]TW$/i.test(a.lang))||Number(b.localService)-Number(a.localService));
 const selected=manual||known[0];return {voice:selected||fallback,matched:!!selected,automatic:true,gender};
}
