#!/bin/sh

# 设置响应的 Content-Type 为 text/html，字符编码为 utf-8
echo "Content-Type: text/html; charset=utf-8"
echo ""

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
        #uci set wireless.wifinet2.device='MT7986_1_1'
        uci set wireless.wifinet2.device="$(uci show wireless | grep -Eo "wireless\..*\.band='$BAND'" | cut -d '.' -f 2)"

    elif [ "$BAND" = "5g" ]; then
        #uci set wireless.wifinet2.device='MT7986_1_2'
        uci set wireless.wifinet2.device="$(uci show wireless | grep -Eo "wireless\..*\.band='$BAND'" | cut -d '.' -f 2)"
    fi

    # 使用 uci 命令设置新的 WiFi 名称和密码
    uci set wireless.wifinet2.ssid="$SSID"
    uci set wireless.wifinet2.key="$KEY"
    # 提交 uci 配置更改
    uci commit wireless
    # 保存应用 WiFi 设置
    #wifi reload

    # 返回成功消息的 HTML 内容
    echo "<html><body>"
    echo "<head><style>"
    echo "body { font-family: 'Arial', sans-serif; background-color: #181818; margin: 0; padding: 20px; display: flex; justify-content: center; align-items: center; flex-direction: column; height: 100vh; }"
    echo ".success-message { background-color: #282828; border: 1px solid #4CAF50; color: #ffffff; padding: 20px; border-radius: 10px; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6); width: 100%; max-width: 600px; margin: 20px 0; text-align: center; box-sizing: border-box; }"
    echo "h2 { color: #ffd700; margin-bottom: 20px; font-weight: bold; text-shadow: 2px 2px 8px rgba(0, 0, 0, 0.8); }"
    echo "p { color: #ffffff; line-height: 1.8; font-size: 1.1em; margin: 10px 0; }"
    echo "strong { color: #4CAF50; }"
    echo ".info-text { color: #ffffff; margin-top: 15px; }"
    echo "a { color: #4CAF50; text-decoration: none; font-weight: bold; }"  # 这里是链接的颜色
    echo "a:hover { color: #ffd700; }"  # 悬停时的颜色
    echo "@media (max-width: 600px) {.success-message { padding: 15px; } }"  # 针对小屏幕的内边距调整
    echo "</style></head>"
    echo "<div class='success-message'>"
    echo "<h2>WiFi 配置已更新</h2>"
    echo "<p>名称: <strong>$SSID</strong></p>"
    echo "<p>密码: <strong>$KEY</strong></p>"
    echo "<p>频段: <strong>$(echo "$BAND" | tr 'a-z' 'A-Z')</strong></p>"
    echo "<p class='info-text'>请您在 120 秒后检查网络是否正常</p>"
    echo "<p class='info-text'>若有问题，可点击 <a href=''>这里</a> 重新配置</p>"
    echo "</div>"
    echo "</body></html>"
    exit 0
fi
