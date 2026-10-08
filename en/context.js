(function (root) {
  "use strict";
  const pageSource = root.document?.documentElement?.dataset?.pageSource || "global";
  root.GameFitPageContext = Object.freeze({ language: "en", regionVersion: "global", pageSource });
})(window);
