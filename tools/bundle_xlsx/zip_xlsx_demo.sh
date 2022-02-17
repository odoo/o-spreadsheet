#!/usr/bin/env bash
cd ./tests/__xlsx__/xlsx_demo_data
find . -type f | xargs zip ../xlsx_demo_data.xlsx

