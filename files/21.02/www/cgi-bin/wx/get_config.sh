#!/bin/sh
# 这些脚本需要可执行权限chmod +x /www/cgi-bin/wx/save_wifi_config.sh /www/cgi-bin/wx/get_config.sh /www/cgi-bin/wx/delete_wifi_config.sh /www/cgi-bin/wx/config.sh
# 设置响应的 Content-Type 为 application/json，字符编码为 utf-8
echo "Content-Type: application/json; charset=utf-8"
echo ""

# 获取当前的 WiFi 名称
wifi_name=$(uci get wireless.wifinet2.ssid)
# 获取当前的 WiFi 密码
wifi_password=$(uci get wireless.wifinet2.key)
# 获取无线网络接口的带宽信息并转换为小写
wifi_band=$(echo "$(uci get wireless.$(uci get wireless.wifinet2.device).band)" | tr 'A-Z' 'a-z')
# 获取当前网络接口状态
#wifi_Interface=$(ifstatus $(uci get wireless.wifinet2.network) | jq -r '.device')
wifi_Interface=$(if ifstatus "wwan" &> /dev/null; then echo "wwan"; else echo "不存在wwan接口"; fi)
# 判断当前 中继WiFi 是否连接
wifi_bridge_status=$(if [ "$wifi_name" = "$(iwconfig $(ifstatus $(uci get wireless.wifinet2.network) | jq -r '.device') | awk -F '"' '/ESSID/{print $2}')" ]; then echo "已连接"; else echo "已断开"; fi)


# 返回包含当前 WiFi 名称、密码和频段的 JSON 格式数据
echo "{\"ssid\":\"$wifi_name\",\"key\":\"$wifi_password\",\"band\":\"$wifi_band\",\"interface\":\"$wifi_Interface\",\"bridge_status\":\"$wifi_bridge_status\"}"