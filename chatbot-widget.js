(function () {
'use strict';

const API_KEY = "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";

function init(){

  var btn = document.createElement('button');
  btn.innerHTML = "💬";
  btn.style = "position:fixed;bottom:20px;right:20px;width:60px;height:60px;border-radius:50%;background:#1E6FD9;color:#fff;border:none;font-size:22px;cursor:pointer;z-index:9999";
  document.body.appendChild(btn);

  var box = document.createElement('div');
  box.style = "position:fixed;bottom:90px;right:20px;width:320px;background:#0a0e1a;color:#fff;padding:10px;border-radius:12px;display:none;z-index:9999";
  document.body.appendChild(box);

  var msgs = document.createElement('div');
  msgs.style="max-height:300px;overflow:auto";
  box.appendChild(msgs);

  var input = document.createElement('input');
  input.placeholder = "Votre message...";
  input.style="width:100%;margin-top:10px;padding:8px;border-radius:6px;border:none";
  box.appendChild(input);

  btn.onclick = function(){
    box.style.display = box.style.display==="none"?"block":"none";
  };

  function addMsg(text,me){
    var d=document.createElement('div');
    d.innerHTML=text;
    d.style="margin:5px;padding:8px;border-radius:6px;background:"+(me?"#1E6FD9":"#222");
    msgs.appendChild(d);
    msgs.scrollTop=msgs.scrollHeight;
  }

  addMsg("Bonjour 👋 je suis Pape Cheikh, assistant SOKAN BUSINESS. Comment puis-je vous aider ?", false);

  async function askAI(message){
    try{
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions",{
        method:"POST",
        headers:{
          "Authorization":"Bearer "+API_KEY,
          "Content-Type":"application/json"
        },
        body:JSON.stringify({
          model:"openai/gpt-4o-mini",
          messages:[
            {
              role:"system",
              content:"Tu es Pape Cheikh, assistant professionnel de SOKAN BUSINESS. Tu es intelligent, humain, tu aides les clients en logistique (maritime, aérien, douane, Afrique). Tu encourages à demander un devis ou contacter l'entreprise. Tu ne dis jamais que tu ne comprends pas."
            },
            {role:"user",content:message}
          ]
        })
      });

      const data = await res.json();
      return data.choices[0].message.content;

    }catch(e){
      return "Erreur de connexion 😢";
    }
  }

  input.addEventListener("keydown", async function(e){
    if(e.key==="Enter"){
      var val=input.value.trim();
      if(!val) return;

      addMsg(val,true);
      input.value="";

      addMsg("...",false);

      var reply = await askAI(val);

      msgs.lastChild.remove();
      addMsg(reply,false);
    }
  });
}

if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded",init);
}else{
  init();
}

})();