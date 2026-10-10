(function () {
  "use strict";
  const store=window.GameFitPrivateValidationStore;
  let storage;
  try { storage=window.localStorage; } catch (error) { storage={ getItem(){ throw error; } }; }
  const byId=id=>document.getElementById(id);
  const checked=name=>[...document.querySelectorAll(`input[name="${name}"]:checked`)].map(node=>node.value);
  let lastActiveTester=null;
  const gateLabel=value=>({ PASS:"通過", STOP:"停止中", INCONCLUSIVE:"判定保留", PENDING:"確認中" })[value]||"確認中";

  function friendlyError(error,message) {
    console.error(error);
    return message;
  }

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
      byId("console-status").textContent="このブラウザの保存内容を読み取れません。保存設定をご確認ください。";
      return;
    }
    const report=store.report(loaded.state),active=activeData(loaded.state);
    if ((active?.testerId||null)!==lastActiveTester) resetControls();
    lastActiveTester=active?.testerId||null;
    const counts=report.gate.report?.counts||{},quality=report.gate.report?.quality||{};
    const severeCount=(quality.severe_errors||0)+(quality.privacy_incidents||0)+(quality.game_input_contamination||0)+(quality.hard_avoid_violations||0)+(quality.compatibility_major_violations||0)+(quality.affiliate_rank_influence||0);
    byId("console-summary").textContent=[
      `現在の判定: ${gateLabel(report.gate.status)}`,
      `確認済み: ${report.finalized}/10人（担当者確認待ち: ${report.awaiting_review}人）`,
      `誘導なしで最後まで完了: ${counts.flow_completed ?? 0}人`,
      `推薦理由を理解: ${quality.reasons_understood ?? 0}人`,
      `重大な問題: ${severeCount}件`,
      `外部への自動送信: なし`
    ].join("\n");
    byId("active-console").hidden=!active;
    byId("facilitator-review").hidden=!active||active.status!=="awaiting_review";
    byId("console-tester-id").textContent=active?.testerId||"";
    byId("console-status").textContent=report.gate.status==="STOP"?"テストを停止しています。次の参加者は開始できません。":"記録はこのブラウザ内だけに保存されています。";
  }

  byId("refresh-console").addEventListener("click",refresh);
  byId("import-tester").addEventListener("click",async()=>{
    const file=byId("import-tester-file").files?.[0];
    if (!file) { byId("import-status").textContent="取り込むJSONファイルを選択してください。"; return; }
    try {
      store.importTesterExport(storage,await file.text());
      byId("import-status").textContent="参加者番号とbuildを確認して取り込みました。続けて担当者レビューを行ってください。";
      byId("import-tester-file").value="";
      refresh();
    } catch (error) { byId("import-status").textContent=friendlyError(error,"取り込めませんでした。番号の重複、build、ファイル内容を確認してください。"); }
  });
  byId("console-stop").addEventListener("click",()=>{
    if (!window.confirm("重大な問題を確定し、10人テストをすぐに停止します。")) return;
    try { store.stopTester(storage,byId("console-stop-reason").value); refresh(); }
    catch (error) { byId("console-status").textContent=friendlyError(error,"停止処理を完了できませんでした。記録を書き出し、画面をそのままにしてください。"); }
  });
  byId("console-abandon").addEventListener("click",()=>{
    if (!window.confirm("現在の参加者を途中離脱として記録に残します。別の参加者への差し替えはできません。")) return;
    try {
      store.finishTester(storage,{ category:"unknown",game_id:"unknown",input_method:"unknown",flow_completed:false,reason_understood:false,intended_judgment:"unsure",assistance_level:"none",severe_error:false,privacy_incident:false,game_input_contamination:false,hard_avoid_violation:false,compatibility_major_violation:false,affiliate_rank_influence:false,ux_issue_codes:["other"] });
      refresh();
    } catch (error) { byId("console-status").textContent=friendlyError(error,"途中離脱として保存できませんでした。"); }
  });
  byId("finalize-review").addEventListener("click",()=>{
    const understood=document.querySelector('input[name="facilitator_understood"]:checked')?.value;
    if (!understood) { byId("console-status").textContent="推薦理由を説明できたか選択してください。"; return; }
    const loaded=store.load(storage),active=activeData(loaded.state),self=active?.selfReview?.properties;
    if (!active||!self) { byId("console-status").textContent="参加者の回答がまだ保存されていません。"; return; }
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
    } catch (error) { byId("console-status").textContent=friendlyError(error,"担当者レビューを保存できませんでした。"); }
  });
  byId("export-console").addEventListener("click",()=>{
    try {
      const loaded=store.load(storage);
      const blob=new Blob([store.exportState(loaded.state)],{ type:"application/json" });
      const link=document.createElement("a"); link.href=URL.createObjectURL(blob); link.download="gamefit-private-validation-n10.json"; link.click(); URL.revokeObjectURL(link.href);
      byId("console-status").textContent="参加者番号付き記録を書き出しました。";
    } catch (error) { byId("console-status").textContent=friendlyError(error,"参加者番号付き記録を書き出せませんでした。"); }
  });
  byId("delete-console").addEventListener("click",()=>{
    if (!window.confirm("参加者番号付きの10人テスト記録をすべて削除します。元に戻せません。")) return;
    try { store.deleteAll(storage); refresh(); }
    catch (error) { byId("console-status").textContent=friendlyError(error,"参加者番号付き記録を削除できませんでした。ブラウザの保存設定をご確認ください。"); }
  });
  refresh();
})();
