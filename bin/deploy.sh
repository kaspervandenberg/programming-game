#!/bin/bash
DIRS=("img" "styles" "scripts");
ASSETS=("img/Robot_37500.png"
	"styles/style.css"
	"scripts/script.js"
	"scripts/jquery-3.6.0.js"
       "index.html");
TARGET="/var/www/html";

for x in ${DIRS[@]}; do
    mkdir -p "${TARGET}/$x";
done;

for x in ${ASSETS[@]}; do
    rm -f "${TARGET}/$x";
    cp "$x" "${TARGET}/$x";
done;
