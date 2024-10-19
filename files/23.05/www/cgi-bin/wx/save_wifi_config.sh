#!/bin/sh

# wifi-config.json 文件路径
CONFIG_FILE="/www/wx/wifi-config.json"

# 读取 POST 请求的 JSON 数据
read -r POST_DATA

# 提取 WiFi 名称、密码和频段
SSID=$(echo "$POST_DATA" | jq -r '.name')
PASSWORD=$(echo "$POST_DATA" | jq -r '.password')
BAND=$(echo "$POST_DATA" | jq -r '.band')

# 检查配置文件是否存在，如果不存在则创建一个空的 JSON 结构
if [ ! -f "$CONFIG_FILE" ]; then
  echo '{"wifi": []}' > "$CONFIG_FILE"
fi

# 使用 jq 处理 JSON 文件
# 如果配置文件中存在相同的 WiFi 名称，则更新该配置；如果不存在，则新增该 WiFi 名称

EXISTING=$(jq --arg ssid "$SSID" '.wifi[] | select(.name == $ssid)' "$CONFIG_FILE")

if [ -z "$EXISTING" ]; then
  # 不存在该 WiFi 名称，新增一条记录
  jq --arg ssid "$SSID" --arg password "$PASSWORD" --arg band "$BAND" \
     '.wifi += [{"name": $ssid, "password": $password, "band": $band}]' \
     "$CONFIG_FILE" > "$CONFIG_FILE.tmp" && mv "$CONFIG_FILE.tmp" "$CONFIG_FILE"
else
  # 存在该 WiFi 名称，更新记录
  jq --arg ssid "$SSID" --arg password "$PASSWORD" --arg band "$BAND" \
     '(.wifi[] | select(.name == $ssid) | .password) = $password |
      (.wifi[] | select(.name == $ssid) | .band) = $band' \
     "$CONFIG_FILE" > "$CONFIG_FILE.tmp" && mv "$CONFIG_FILE.tmp" "$CONFIG_FILE"
fi

# 返回保存成功的响应
echo "Content-Type: text/plain"
echo ""
echo "WiFi 配置已更新"
