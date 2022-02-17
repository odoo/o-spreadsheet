#!/usr/bin/env bash
rm -rf ./tests/__xlsx__/xlsx_demo_data/*
unzip -o -d ./tests/__xlsx__/xlsx_demo_data ./tests/__xlsx__/xlsx_demo_data.xlsx

if dpkg-query -W -f'${Status}' "libxml2-utils" 2>/dev/null | grep -q "ok installed";
then
	find ./tests/__xlsx__/xlsx_demo_data -regex ".*\(xml\|xml.rels\)$" -type f -exec xmllint --output '{}' --format '{}' \;
else
	echo "install libxml2-utils if you want to have prettified xmls";
fi
