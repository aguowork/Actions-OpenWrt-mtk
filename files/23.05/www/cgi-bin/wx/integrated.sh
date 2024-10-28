#!/bin/bash

# 定义配置文件路径
CONFIG_FILE="/www/wx/wifi-config.json"
# WiFi 中继接口名称
WIFI_INTERFACE_NAME="wifinet2"

# 删除 WiFi 配置函数
delete_wifi_config() {
    # 从 POST 请求中获取要删除的 WiFi 名称列表
    read INPUT
    wifi_names_to_delete=$(echo $INPUT | jq -r '.names[]')
    for wifi_name in $wifi_names_to_delete; do
        jq --arg name "$wifi_name" 'del(.wifi[] | select(.name == $name))' "$CONFIG_FILE" > tmp.json
        if [ $? -eq 0 ]; then
            mv tmp.json "$CONFIG_FILE"
        else
            echo "Content-Type: application/json"
            echo ""
            echo '{"status": "error", "message": "更新 JSON 文件失败。"}'
            exit 1
        fi
    done
    # 返回状态
    echo "Content-Type: application/json"
    echo ""
    echo '{"status": "更新 JSON 文件成功"}'
}

# 保存 WiFi 配置函数
save_wifi_config() {
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
    echo "Content-Type: text/html; charset=utf-8"
    echo ""
    echo "保存成功配置文件已更新"
}


# 设置 WiFi 配置函数
config_function() {
    # 如果请求方法是 POST
    if [ "$REQUEST_METHOD" = "POST" ]; then
        # 读取 POST 请求的数据，不再进行转码处理
        read POST_DATA
        # 使用 sed 命令从 POST 数据中提取 WiFi 名称（ssid）
        SSID=$(echo "$POST_DATA" | sed -n 's/^.*ssid=\([^&]*\).*$/\1/p')
        # 使用 sed 命令从 POST 数据中提取 WiFi 密码（key）
        KEY=$(echo "$POST_DATA" | sed -n 's/^.*key=\([^&]*\).*$/\1/p')
        # 从 POST_DATA 中提取 band 参数并转换为小写
        BAND=$(echo "$POST_DATA" | sed -n 's/^.*band=\([^&]*\).*$/\1/p' | tr 'A-Z' 'a-z')
        # 根据频段设置设备
        if [ "$BAND" = "2g" ]; then
            uci set wireless."$WIFI_INTERFACE_NAME".device="$(uci show wireless | grep -Eo "wireless\..*\.band='$BAND'" | cut -d '.' -f 2)"
        elif [ "$BAND" = "5g" ]; then
            uci set wireless."$WIFI_INTERFACE_NAME".device="$(uci show wireless | grep -Eo "wireless\..*\.band='$BAND'" | cut -d '.' -f 2)"
        else
            echo "Content-Type: text/plain"
            echo ""
            echo "错误：无效的频段"
            exit 1
        fi
        # 使用 uci 命令设置新的 WiFi 名称和密码
        uci set wireless."$WIFI_INTERFACE_NAME".ssid="$SSID"
        uci set wireless."$WIFI_INTERFACE_NAME".key="$KEY"
        # 提交 uci 配置更改
        uci commit wireless
        # 保存应用 WiFi 设置
        wifi reload
        # 返回成功状态
        echo "Content-Type: text/plain"
        echo ""
        echo "中继热点设置成功"
        exit 0
    else
        echo "Content-Type: text/plain"
        echo ""
        echo "中继错误：无效的请求方法"
        exit 1
    fi
}

# 获取 WiFi 配置函数
get_config() {
    # 获取当前的 WiFi 名称
    wifi_name=$(uci get wireless."$WIFI_INTERFACE_NAME".ssid)
    # 获取当前的 WiFi 密码
    wifi_password=$(uci get wireless."$WIFI_INTERFACE_NAME".key)
    # 获取无线网络接口的带宽信息并转换为小写
    wifi_band=$(echo "$(uci get wireless.$(uci get wireless."$WIFI_INTERFACE_NAME".device).band)" | tr 'A-Z' 'a-z')
    # 获取当前网络接口状态
    wifi_Interface=$(if ifstatus "wwan" &> /dev/null; then echo "wwan"; else echo "不存在 wwan 接口"; fi)
    # 判断当前中继 WiFi 是否连接
    wifi_bridge_status=$(if [ "$wifi_name" = "$(iwconfig $(ifstatus $(uci get wireless."$WIFI_INTERFACE_NAME".network) | jq -r '.device') | awk -F '"' '/ESSID/{print $2}')" ]; then echo "已连接"; else echo "已断开"; fi)
    # 返回包含当前 WiFi 名称、密码和频段的 JSON 格式数据
    echo "Content-Type: application/json; charset=utf-8"
    echo ""
    echo "{\"ssid\":\"$wifi_name\",\"key\":\"$wifi_password\",\"band\":\"$wifi_band\",\"interface\":\"$wifi_Interface\",\"bridge_status\":\"$wifi_bridge_status\"}"
}

# 解析 QUERY_STRING 获取 action 参数
action=$(echo "$QUERY_STRING" | cut -d'=' -f2)

if [ "$action" = "delete" ]; then
    delete_wifi_config
elif [ "$action" = "save" ]; then
    save_wifi_config
elif [ "$action" = "config" ]; then
    config_function
elif [ "$action" = "get" ]; then
    get_config
else
    echo "Content-Type: text/html; charset=utf-8"
    echo ""
    echo "错误：无效的参数"
    exit 1
fi
