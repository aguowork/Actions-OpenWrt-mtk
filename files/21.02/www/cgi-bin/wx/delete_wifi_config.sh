#!/bin/bash

# 从 POST 请求中获取要删除的 WiFi 名称列表
read INPUT
wifi_names_to_delete=$(echo $INPUT | jq -r '.names[]')  # 确保这里与发送的 JSON 键匹配

# 指定配置文件
config_file="/www/wx/wifi-config.json"

# 删除指定的 WiFi 名称
for wifi_name in $wifi_names_to_delete; do
    jq --arg name "$wifi_name" 'del(.wifi[] | select(.name == $name))' $config_file > tmp.json
    if [ $? -eq 0 ]; then
        mv tmp.json $config_file
    else
        echo "Content-Type: application/json"
        echo ""
        echo '{"status": "error", "message": "Failed to update the JSON file."}'
        exit 1
    fi
done

# 返回状态
echo "Content-Type: application/json"
echo ""
echo '{"status": "success"}'
