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

    # 打印调试信息
    echo "SSID: $SSID"
    echo "KEY: $KEY"
    echo "BAND: $BAND"

    # 根据频段设置设备
    if [ "$BAND" = "2g" ]; then
        uci set wireless.wifinet2.device="$(uci show wireless | grep -Eo "wireless\..*\.band='$BAND'" | cut -d '.' -f 2)"
    elif [ "$BAND" = "5g" ]; then
        uci set wireless.wifinet2.device="$(uci show wireless | grep -Eo "wireless\..*\.band='$BAND'" | cut -d '.' -f 2)"
    else
        echo "错误：无效的频段"
        exit 1
    fi

    # 使用 uci 命令设置新的 WiFi 名称和密码
    uci set wireless.wifinet2.ssid="$SSID"
    uci set wireless.wifinet2.key="$KEY"
    # 提交 uci 配置更改
    uci commit wireless
    # 保存应用 WiFi 设置
    # wifi reload

    # 返回成功状态
    echo "成功"
    exit 0
else
    echo "错误：无效的请求方法"
    exit 1
fi