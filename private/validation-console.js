(function () {
  "use strict";
  const store=window.GameFitPrivateValidationStore;
  let storage;
  try { storage=window.localStorage; } catch (error) { storage={ getItem(){ throw error; } }; }
  const byId=id=>document.getElementById(id);
  const checked=name=>[...document.querySelectorAll(`input[name="${name}"]:checked`)].map(node=>node.value);
  let lastActiveTester=null;

  function resetControls() {
    document.querySelectorAll('input[name="facilitator_understood"],input[name="console_safety"]').forEach(node=>{ node.checked=false; });
    byId("assistance-level").value="none";
    byId("console-stop-reason").value="dangerous_recommendation";
  }

  function activeData(state) {
    const testerId=state?.active_tester_id;
    if (!testerId) return null;
    const events=state.events.filter(event=>event.properties.journey_id===testerId);
    const latest=name=>[...events].reverse().find(event=>event.name===name)||null;
    return { testerId,status:state.testers[testerId].status,events,selfReview:latest("tester_self_review_recorded") };
  }

  function refresh() {
    const loaded=store.load(storage);
    if (!loaded.state) {
      byId("console-summary").textContent="記録を読み取れません";
      byId("console-status").textContent=loaded.error||"localStorage unavailable";
      return;
    }
    const report=store.report(loaded.state),active=activeData(loaded.state);
    if ((active?.testerId||null)!==lastActiveTester) resetControls();
    lastActiveTester=active?.testerId||null;
    byId("console-summary").textContent=JSON.stringify({ finalized:report.finalized,gate:report.gate.status,counts:report.gate.report?.counts||{},quality:report.gate.report?.quality||{},composition:report.composition },null,2);
    byId("active-console").hidden=!active;
    byId("facilitator-review").hidden=!active||active.status!=="awaiting_review";
    byId("console-tester-id").textContent=active?.testerId||"";
    byId("console-status").textContent=report.gate.status==="STOP"?"STOP中。次Testerは開始できません。":"自動送信なし";
  }

  byId("refresh-console").addEventListener("click",refresh);
  byId("console-stop").addEventListener("click",()=>{
    if (!window.confirm("重大問題を確定し、10人テストを即時STOPします。")) return;
    try { store.stopTester(storage,byId("console-stop-reason").value); refresh(); }
    catch (error) { byId("console-status").textContent=error.message; }
  });
  byId("console-abandon").addEventListener("click",()=>{
    if (!window.confirm("現在のTesterを途中離脱として分母に残します。差し替えません。")) return;
    try {
      store.finishTester(storage,{ category:"unknown",game_id:"unknown",input_method:"unknown",flow_completed:false,reason_understood:false,intended_judgment:"unsure",assistance_level:"none",severe_error:false,privacy_incident:false,game_input_contamination:false,hard_avoid_violation:false,compatibility_major_violation:false,affiliate_rank_influence:false,ux_issue_codes:["other"] });
      refresh();
    } catch (error) { byId("console-status").textContent=error.message; }
  });
  byId("finalize-review").addEventListener("click",()=>{
    const understood=document.querySelector('input[name="facilitator_understood"]:checked')?.value;
    if (!understood) { byId("console-status").textContent="teach-back判定を選択してください。"; return; }
    const loaded=store.load(storage),active=activeData(loaded.state),self=active?.selfReview?.properties;
    if (!active||!self) { byId("console-status").textContent="Tester自己回答がありません。"; return; }
    const flags=checked("console_safety");
    try {
      store.finishTester(storage,{
        category:self.category,game_id:self.game_id,input_method:self.input_method,
        flow_completed:true,reason_understood:understood==="yes",intended_judgment:self.intended_judgment,
        assistance_level:byId("assistance-level").value,
        severe_error:flags.includes("dangerous_recommendation"),privacy_incident:flags.includes("privacy_leak"),
        game_input_contamination:flags.includes("game_input_contamination"),hard_avoid_violation:flags.includes("hard_avoid_violation"),
        compatibility_major_violation:flags.includes("compatibility_major_violation"),affiliate_rank_influence:flags.includes("affiliate_rank_influence"),
        ux_issue_codes:self.ux_issue_codes
      },flags);
      refresh();
    } catch (error) { byId("console-status").textContent=error.message; }
  });
  byId("export-console").addEventListener("click",()=>{
    try {
      const loaded=store.load(storage);
      const blob=new Blob([store.exportState(loaded.state)],{ type:"application/json" });
      const link=document.createElement("a"); link.href=URL.createObjectURL(blob); link.download="gamefit-private-validation-n10.json"; link.click(); URL.revokeObjectURL(link.href);
      byId("console-status").textContent="匿名記録をExportしました。";
    } catch (error) { byId("console-status").textContent=error.message; }
  });
  byId("delete-console").addEventListener("click",()=>{
    if (!window.confirm("匿名10人テスト記録をすべて削除します。元に戻せません。")) return;
    store.deleteAll(storage); refresh();
  });
  refresh();
})();
