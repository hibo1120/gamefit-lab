const fixtures = require("../data/personal-gear-fixtures.js");
const audit = require("../evidence-audit.js");

const report = audit.auditEvidence(fixtures.products.flatMap(product => product.evidence),{ as_of:fixtures.CHECKED_DATE });
if (process.argv.includes("--issues")) console.log(JSON.stringify(report.issues.filter(item=>!["duplicate_url","same_corporate_publisher","missing_variant"].includes(item.code)),null,2));
else if (process.argv.includes("--errors")) console.log(JSON.stringify(report.issues.filter(item=>item.severity === "error"),null,2));
else if (process.argv.includes("--json")) console.log(JSON.stringify(report,null,2));
else console.log(audit.renderMarkdown(report));
if (report.blocking_count) process.exitCode = 1;
