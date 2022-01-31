#!/bin/bash
DIRS=("img"
	"styles"
       	"scripts"
       	"scripts/lib/jquery"
       	"scripts/lib/lodash/4.17.15-npm");
ASSETS=("img/Robot_37500.png"
	"img/Sports-Finish-Flag-icon.png"
	"img/play-64.png"
	"img/undo-4-64.png"
	"favicon.ico"
	"styles/style.css"
	"scripts/script.js"
	"scripts/lib/jquery/jquery-3.6.0.js"
	"scripts/lib/jquery/jquery-3.6.0.min.js"
	"scripts/lib/jquery/jquery-3.6.0.min.map"
	"scripts/lib/lodash/4.17.15-npm/core.js"
	"scripts/lib/lodash/4.17.15-npm/lodash.js"
       	"index.html");
TARGET="/var/www/html";

for x in ${DIRS[@]}; do
    mkdir -p "${TARGET}/$x";
done;

for x in ${ASSETS[@]}; do
    rm -f "${TARGET}/$x";
    cp "$x" "${TARGET}/$x";
done;
