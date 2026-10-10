(function(){
  "use strict";

  const GAME_INPUTS = Object.freeze({
    valorant:Object.freeze(["mnk"]),
    apex:Object.freeze(["mnk","controller"]),
    cs2:Object.freeze(["mnk"]),
    overwatch2:Object.freeze(["mnk"]),
    fortnite:Object.freeze(["mnk"])
  });

  const INPUT_LABELS = Object.freeze({ mnk:"マウス・キーボード", controller:"コントローラー" });
  const GAME_LABELS = Object.freeze({
    valorant:"VALORANT", apex:"Apex Legends", cs2:"Counter-Strike 2",
    overwatch2:"Overwatch 2", fortnite:"Fortnite"
  });
  const CATEGORY_LABELS = Object.freeze({
    mouse:"マウス", keyboard:"キーボード", controller:"コントローラー",
    mousepad:"マウスパッド", monitor:"モニター", audio:"オーディオ",
    network:"ネットワーク", cable:"ケーブル"
  });
  const CATEGORY_SETS = Object.freeze({
    mnk:Object.freeze({ primary:Object.freeze(["mouse","keyboard"]), secondary:Object.freeze(["mousepad","monitor","audio","network","cable"]) }),
    controller:Object.freeze({ primary:Object.freeze(["controller"]), secondary:Object.freeze(["monitor","audio","network","cable"]) })
  });

  const state={game:null,input:null,category:null,product:null};

  const byId=id=>document.getElementById(id);
  const panels=[...document.querySelectorAll("[data-step-panel]")];

  function showStep(step){
    panels.forEach(panel=>{ panel.hidden=Number(panel.dataset.stepPanel)!==step; });
    document.querySelectorAll("[data-progress]").forEach(item=>item.classList.toggle("active",Number(item.dataset.progress)===step));
    byId("flow-status").textContent=step+" / 3";
  }

  function choiceButton(value,label,subtext,handler){
    const button=document.createElement("button");
    button.type="button";
    button.className="choice";
    button.dataset.value=value;
    const strong=document.createElement("strong");
    strong.textContent=label;
    button.append(strong);
    if(subtext){
      const small=document.createElement("small");
      small.textContent=subtext;
      button.append(small);
    }
    button.addEventListener("click",()=>handler(button,value));
    return button;
  }

  function selectWithin(container,button){
    container.querySelectorAll(".choice").forEach(node=>node.classList.toggle("selected",node===button));
  }

  function renderInputs(){
    const container=byId("input-choices");
    const summary=byId("input-summary");
    const next=byId("input-next");
    container.replaceChildren();
    summary.hidden=true;
    state.input=null;
    next.disabled=true;
    const inputs=GAME_INPUTS[state.game];
    if(!inputs) throw new Error("Unsupported game context");
    if(inputs.length===1){
      state.input=inputs[0];
      summary.textContent="現在のGameFit対象: "+INPUT_LABELS[state.input];
      summary.hidden=false;
      next.disabled=false;
      return;
    }
    for(const input of inputs){
      container.append(choiceButton(input,INPUT_LABELS[input],"このゲームでは別々に判定",(button,value)=>{
        state.input=value;
        selectWithin(container,button);
        next.disabled=false;
      }));
    }
  }

  function renderCategories(){
    const primary=byId("primary-categories");
    const secondary=byId("secondary-categories");
    const gearBlock=byId("current-gear-block");
    const finish=byId("finish-input");
    primary.replaceChildren();
    secondary.replaceChildren();
    gearBlock.hidden=true;
    state.category=null;
    state.product=null;
    finish.disabled=true;
    byId("current-product").value="";
    const set=CATEGORY_SETS[state.input];
    if(!set) throw new Error("Unsupported input method");
    const select=(button,value,container)=>{
      state.category=value;
      document.querySelectorAll("#primary-categories .choice,#secondary-categories .choice").forEach(node=>node.classList.remove("selected"));
      button.classList.add("selected");
      gearBlock.hidden=false;
      byId("current-product").focus();
      updateFinish();
    };
    for(const category of set.primary) primary.append(choiceButton(category,CATEGORY_LABELS[category],"まず見る",select));
    for(const category of set.secondary) secondary.append(choiceButton(category,CATEGORY_LABELS[category],"必要な場合だけ",select));
  }

  function updateFinish(){
    const product=byId("current-product").value.trim();
    state.product=product||null;
    byId("finish-input").disabled=!(state.category&&state.product);
  }

  document.querySelectorAll("[data-game]").forEach(button=>button.addEventListener("click",()=>{
    state.game=button.dataset.game;
    state.input=null;state.category=null;state.product=null;
    selectWithin(byId("game-choices"),button);
    renderInputs();
    showStep(2);
  }));

  byId("start-flow").addEventListener("click",()=>{
    byId("flow").hidden=false;
    byId("flow").scrollIntoView({behavior:"smooth",block:"start"});
    showStep(1);
  });

  byId("input-next").addEventListener("click",()=>{
    if(!state.input)return;
    renderCategories();
    showStep(3);
  });

  document.querySelectorAll("[data-back]").forEach(button=>button.addEventListener("click",()=>showStep(Number(button.dataset.back))));

  byId("current-product").addEventListener("input",updateFinish);
  byId("product-not-listed").addEventListener("click",()=>{
    byId("current-product").value="一覧にない";
    updateFinish();
  });

  byId("finish-input").addEventListener("click",()=>{
    updateFinish();
    if(byId("finish-input").disabled)return;
    panels.forEach(panel=>{panel.hidden=true;});
    document.querySelectorAll("[data-progress]").forEach(item=>item.classList.remove("active"));
    byId("flow-status").textContent="完了";
    byId("summary-game").textContent=GAME_LABELS[state.game]||"未確認";
    byId("summary-input").textContent=INPUT_LABELS[state.input]||"未確認";
    byId("summary-category").textContent=CATEGORY_LABELS[state.category]||"未確認";
    byId("summary-product").textContent=state.product;
    byId("flow-result").hidden=false;
  });

  window.GameFitDecisionFlowStaging=Object.freeze({GAME_INPUTS,CATEGORY_SETS});
})();