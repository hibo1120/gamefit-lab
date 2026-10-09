(function (root, factory) {
  const api = factory();
  root.GameFitBusinessModel = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";
  function nonNegative(value, key) {
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) throw new Error(`${key} must be a non-negative number`);
    return number;
  }
  function probability(value, key) {
    const number = nonNegative(value,key);
    if (number > 1) throw new Error(`${key} must be between 0 and 1`);
    return number;
  }
  function calculateScenario(input) {
    const monthlyUsers = nonNegative(input.monthly_users,"monthly_users");
    const setupCompletion = probability(input.diagnosis_setup_completion,"diagnosis_setup_completion");
    const purchaseIntent = probability(input.purchase_intent,"purchase_intent");
    const affiliateClick = probability(input.affiliate_click,"affiliate_click");
    const affiliateCv = probability(input.affiliate_cv,"affiliate_cv");
    const averageCommission = nonNegative(input.average_commission,"average_commission");
    const premiumConversion = probability(input.premium_conversion,"premium_conversion");
    const premiumArpu = nonNegative(input.premium_arpu,"premium_arpu");
    const infraApiCost = nonNegative(input.infra_api_cost,"infra_api_cost");
    const humanHours = nonNegative(input.human_hours,"human_hours");
    const humanHourlyCost = nonNegative(input.human_hourly_cost,"human_hourly_cost");
    const completed = monthlyUsers * setupCompletion;
    const purchaseIntents = completed * purchaseIntent;
    const clicks = purchaseIntents * affiliateClick;
    const conversions = clicks * affiliateCv;
    const affiliateRevenue = conversions * averageCommission;
    const premiumRevenue = monthlyUsers * premiumConversion * premiumArpu;
    const revenue = affiliateRevenue + premiumRevenue;
    const grossProfit = revenue - infraApiCost;
    const humanCost = humanHours * humanHourlyCost;
    const netProfit = grossProfit - humanCost;
    return Object.freeze({
      completed, purchase_intents:purchaseIntents, affiliate_clicks:clicks, affiliate_conversions:conversions,
      affiliate_revenue:affiliateRevenue, premium_revenue:premiumRevenue, revenue, infra_api_cost:infraApiCost,
      gross_profit:grossProfit, human_hours:humanHours, human_cost:humanCost, net_profit:netProfit,
      net_profit_per_human_hour:humanHours > 0 ? netProfit / humanHours : null,
      status:"hypothesis_not_actual"
    });
  }
  function automationRatio(workstreams) {
    const valid = new Set(["A","B","C","D"]);
    let total = 0;
    let automated = 0;
    for (const stream of workstreams || []) {
      if (!valid.has(stream.automation_class)) throw new Error("invalid automation class");
      const units = nonNegative(stream.workload_units,"workload_units");
      total += units;
      if (stream.automation_class === "A" || stream.automation_class === "B") automated += units;
    }
    return Object.freeze({ ratio:total > 0 ? automated / total : null, automated_units:automated, total_units:total, basis:"weighted workload units, not task count" });
  }
  return { calculateScenario, automationRatio };
});
