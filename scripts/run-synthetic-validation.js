"use strict";

const personas=require("../data/synthetic-personas.js");
const validation=require("../synthetic-validation-engine.js");

const report=validation.runSuite(personas.buildPersonas());
process.stdout.write(JSON.stringify(report.summary,null,2)+"\n");
if (report.summary.status!=="PASS") process.exitCode=1;
