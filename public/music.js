// Modern Chinese-inspired music, not a historical field recording.
// Guzheng City — Kevin MacLeod (incompetech.com), CC BY 4.0.
// See docs/music.md for the original source, attribution and web conversion.
export function setupMusic(){
  const buttons=[...document.querySelectorAll('#music-toggle, [data-music-toggle]')];
  const audio=document.getElementById('garden-music');
  const status=document.getElementById('music-status');
  if(!buttons.length||!audio||!status)return;
  const volume=.12;
  let wanted=false,revision=0,pauseTimer,context,gain;
  audio.volume=volume;

  function update(state){
    for(const button of buttons){
      button.dataset.state=state;
      button.setAttribute('aria-pressed',String(wanted));
      button.setAttribute('aria-busy',String(state==='loading'));
    }
  }
  function fade(level){
    if(gain){
      gain.gain.cancelScheduledValues(context.currentTime);
      gain.gain.setTargetAtTime(level,context.currentTime,level > 0 ? 0.35 : 0.06);
    }else audio.volume=level;
  }
  function failed(turn){
    if(turn!==revision||!wanted)return;
    wanted=false;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    update('off');
    status.textContent='Музыка не загрузилась. Нажмите на ноту, чтобы попробовать ещё раз.';
  }
  async function play(turn){
    clearTimeout(pauseTimer);
    update('loading');
    try{
      if(!audio.getAttribute('src'))audio.src='/assets/audio/guzheng-city.mp3';
      // A gain node keeps playback quiet on phones where audio.volume is ignored.
      const AudioContext=window.AudioContext||window.webkitAudioContext;
      if(!context&&AudioContext){
        try{
          context=new AudioContext();
          gain=context.createGain();
          gain.gain.value=0;
          context.createMediaElementSource(audio).connect(gain);
          gain.connect(context.destination);
          audio.volume=1;
        }catch{gain=null;audio.volume=volume;}
      }
      if(context?.state==='suspended')await context.resume();
      if(turn!==revision||!wanted||document.hidden)return;
      await audio.play();
      if(turn!==revision||!wanted)return;
      fade(volume);
      update('on');
      status.textContent='Спокойная музыка включена.';
    }catch{failed(turn);}
  }
  for(const button of buttons)button.addEventListener('click',()=>{
    wanted=!wanted;
    const turn=++revision;
    clearTimeout(pauseTimer);
    if(wanted){play(turn);return;}
    fade(0);
    update('off');
    status.textContent='Спокойная музыка выключена.';
    pauseTimer=setTimeout(()=>{if(!wanted)audio.pause();},250);
  });
  audio.addEventListener('error',()=>failed(revision));
  document.addEventListener('visibilitychange',()=>{
    const turn=++revision;
    if(document.hidden){audio.pause();return;}
    if(wanted)play(turn);
  });
  // Deliberately no autoplay or persisted "on" state: each visit starts silent.
  update('off');
}
