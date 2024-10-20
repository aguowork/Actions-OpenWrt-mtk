#!/bin/sh
read -r inputData
echo "$inputData" > /www/wx/wifi-config.json
echo "Content-type: text/plain"
echo ""
echo "WiFi配置已更新"
