// ==UserScript==
// @name     utoronto LSM Addon Dev
// @version  1.1
// @description Development mode for React Userscripts.
// @include https://lsm.utoronto.ca/*
// @grant    none
// ==/UserScript==


"use strict";

function log(...args) {
    console.log("Userscript:", ...args);
}

log("Dev mode started")

async function main() {
  const resp = await fetch("http://localhost:8124/static/js/main.js")
  const script = await resp.text();
  log("Got Dev script")
  eval(script)
  log("Dev script evaled")
  
}

// Make sure we run once at the start
main.bind({})().catch(e => {
    log("ERROR", e);
});
