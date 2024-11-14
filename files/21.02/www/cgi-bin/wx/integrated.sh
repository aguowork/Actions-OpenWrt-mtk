#!/bin/bash

# 定义配置文件路径
CONFIG_FILE="/www/wx/wifi-config.json"
# 检测网络失败后重试的间隔时间（单位：秒）不能太快否则wifi会卡住，要重启才行，建议都是120-180为好
RETRY_INTERVAL="30"
# 最多尝试次数
MAX_RETRIES="25"
# 断网最大重试次数
RETRY_TIMES="1"
# 重新连接同一个WIFI的间隔时间（单位：秒）
RETRYWIFI_TIMES="688"
#桥接后还是无法联网，则重启次数
RESTART="10"
# 用于检测互联网连通性的服务器地址
PING_HOST="www.baidu.com"
# 获取当前脚本所在目录 日志文件的存储路径
LOG_FILE="$(dirname "$(readlink -f "$0")")/$(basename $0 .sh).log"
# 设备名称
DEVICE_NAME=$(uci get system.@system[0].hostname)

# 错误处理函数
handle_error() {
    # 获取最后一次命令的退出状态
    local last_exit_status=$?
    # 获取错误发生的函数名
    local func_name=${FUNCNAME[1]}  # 获取调用 handle_error 的函数名，通常是发生错误的函数
    # 获取错误发生的行号
    local line_number=${BASH_LINENO[0]}

    if [ "$last_exit_status" != "0" ]; then
        echo "发生错误：错误发生在函数 $func_name 的第 $line_number 行。已停止脚本执行，请检查脚本代码！"
        exit 1
    fi
}

# 设置 trap，捕获 ERR 和 EXIT
trap 'handle_error' ERR

# 日志记录函数
log_message() {
    # 当前日期时间 - $1 为日志信息
    local log_entry="$(date "+%Y-%m-%d %H:%M:%S") - $1"
    # 将日志信息写入日志文件
    echo "$log_entry" | tee -a "${LOG_FILE}"
}

# 检查日志文件大小
check_log_size() {
    MAX_LOG_SIZE="100"   # 日志文件最大大小，单位为KB
    if [ -e "${LOG_FILE}" ]; then
        local size=$(du -s "${LOG_FILE}" | cut -f1)
        if [ "$size" -gt "$MAX_LOG_SIZE" ]; then
            # 清空日志文件
            > "${LOG_FILE}"
            log_message "日志文件大小超过了最大值，清空日志文件"
        fi
    fi
}

# 推送消息函数
push_message() {
    # 推送消息的API地址
    PUSH_API_URL="https://wxpusher.zjiecode.com/api/send/message/"
    # 替换为您自己的 APP_TOKEN 和 MY_UID 和 TOPIC_ID
    APP_TOKEN="AT_jf0zuTx0PjA4qBnyCGeKf5J4t0DeUIc6"
    MY_UID="UID_L22PV9Qdjy4q6P3d0dthW1TJiA3k"
    TOPIC_ID="25254"
    
    local content="$1"
    local json_data="{\"appToken\": \"$APP_TOKEN\", \"content\": \"$content\", \"topicId\": $TOPIC_ID, \"uids\": [\"$MY_UID\"]}"

    local response http_code
    response=$(curl -s -w "%{http_code}" -X POST -H "Content-Type: application/json" -d "$json_data" "$PUSH_API_URL")
    http_code=${response:(-3)}

    if [ "$http_code" != "200" ]; then
        log_message "推送消息失败，HTTP 状态码: $http_code"
        return 1
    fi
}

# 获取wifi接口状态
get_wireless_status() {
    # 声明多个局部变量
    local wifi_json_data output

    # 获取无线网络状态数据
    wifi_json_data=$(ubus call network.wireless status)

    # 提取2G和5G设备的名称，并且获取sta模式的接口信息
    output=$(echo "$wifi_json_data" | jq '{
        "wireless": {
            "2g_device": (
                (to_entries[] | select(.value.config.band == "2g") | .key)
            ),
            "5g_device": (
                (to_entries[] | select(.value.config.band == "5g") | .key)
            ),
            "sta": [
                (to_entries[] | .value.config.band as $jkdevice | .key as $jkdevice_name | .value.interfaces[] | select(.config.mode == "sta") | {
                    "device": $jkdevice_name,
                    "band": $jkdevice,
                    "section": .section,
                    "ifname": .ifname,
                    "ssid": .config.ssid,
                    "encryption": .config.encryption,
                    "key": .config.key,
                    "network": .config.network[0]
                })
            ]
        }
    }')
    # 判断是否只有一个sta接口
    if [ $(echo "$output" | grep -o '"section":' | wc -l) -eq 1 ] && [ -n "$(echo "$output" | sed -n 's/"ifname": "\(.*\)",/\1/p')" ]; then
        # 路由2.4GHz 网卡名称
        sta_device_2g=$(echo "$output" | sed -n 's/.*"2g_device": "\(.*\)",/\1/p')
        # 路由5G 网卡名称
        sta_device_5g=$(echo "$output" | sed -n 's/.*"5g_device": "\(.*\)",/\1/p')
        # 桥接接口网卡名称
        sta_device=$(echo "$output" | sed -n 's/.*"device": "\([^"]*\)",/\1/p')
        # 桥接接口的频段
        sta_band=$(echo "$output" | sed -n 's/.*"band": "\([^"]*\)".*/\1/p')
        # 桥接接口的配置文件名
        sta_section=$(echo "$output" | sed -n 's/.*"section": "\([^"]*\)",/\1/p')
        # 桥接接口的接口名
        sta_ifname=$(echo "$output" | sed -n 's/.*"ifname": "\([^"]*\)",/\1/p')
        # 桥接接口的ssid
        sta_ssid=$(echo "$output" | sed -n 's/.*"ssid": "\([^"]*\)",/\1/p')
        # 桥接接口的加密方式
        sta_encryption=$(echo "$output" | sed -n 's/.*"encryption": "\([^"]*\)",/\1/p')
        # 桥接接口的密码
        sta_key=$(echo "$output" | sed -n 's/.*"key": "\([^"]*\)",/\1/p')
        # 桥接接口的网络接口名称wwan
        sta_network=$(echo "$output" | sed -n 's/.*"network": "\([^"]*\)"/\1/p')
        return 0
    else
        return 1
    fi
    # 返回最终的JSON数据
}



# 检查互联网连通性
check_internet() {
    if curl -s --head "${PING_HOST}" >/dev/null; then
        return 0
    else
        # log_message "无法访问Internet, 当前SSID:${sta_ssid}"
        return 1
    fi
}


# 切换无线网络
switch_wifi() {

    local LOOP_NAME LOOP_PASSWORD LOOP_BAND LOOP_LAST_UPDATED DIFF WiFi_STATE CXQD

    # 使用 jq 一次性提取wifi-config.json文件所有 Wi-Fi 信息，并直接构建数组
    readarray -t CONFIG_WIFI < <(jq -r '.wifi[] | [.name, .password, .band, .last_updated] | @tsv' "$CONFIG_FILE")

    # CXQD 用于防呆，防止死循环，导致设备假死
    CXQD=$(jq -r '.autowifiranking[0].CQ_TIMES' "$CONFIG_FILE")

    # 循环获取 Wi-Fi 数组的每个元素
    for W in "${!CONFIG_WIFI[@]}"; do #循环一
        # 使用 IFS 分割字符串 以获取每个字段 (包括空格) LOOP_NAME是名称 LOOP_PASSWORD是密码 LOOP_BAND是频段 LOOP_LAST_UPDATED是更新时间
        IFS=$'\t' read -r LOOP_NAME LOOP_PASSWORD LOOP_BAND LOOP_LAST_UPDATED <<< "${CONFIG_WIFI[$W]}"
        # 检查字段是否为空或 BAND 是否不在允许范围内
        if [ -z "$LOOP_NAME" ] || [ -z "$LOOP_PASSWORD" ] || [ -z "$LOOP_LAST_UPDATED" ] || { [ "$LOOP_BAND" != "2G" ] && [ "$LOOP_BAND" != "5G" ]; }; then
            log_message "配置文件数据格式不正确，请检查name、password是否为空，band 是否为2G或5G。"
            exit 0
        fi

        if ! date -d "$LOOP_LAST_UPDATED" >/dev/null 2>&1; then
            log_message "不是时间格式,即将自动写入时间！"
            jq --arg new_time "$(date "+%Y-%m-%d %H:%M:%S")" --argjson index "$W" '.wifi[$index].last_updated = $new_time' "$CONFIG_FILE" > tmp.$$.json && mv tmp.$$.json "$CONFIG_FILE"
            LOOP_LAST_UPDATED=$(date "+%Y-%m-%d %H:%M:%S")
        fi
        
        # 此处判断当前WIFI、密码、频段是否与即将连接的LOOP_NAME、LOOP_PASSWORD、LOOP_BAND一致，一致则跳过，不一致则继续向下执行
        if [ "${sta_ssid}" == "$LOOP_NAME" ] && [ "${sta_key}" == "$LOOP_PASSWORD" ] && [ "$(echo "${sta_band}" | tr 'A-Z' 'a-z')" == "$LOOP_BAND" ]; then
            # 所有条件都相等，执行相关操作
            log_message "当前连接着的 ${sta_ssid} ，与即将尝试切换到 $LOOP_NAME 名称密码频段都一致，跳过本次连接！"
            # 跳出本次循环，执行下一次循环
            continue #跳出循环一
        fi


        # 此处计算时间差，获取秒数
        DIFF=$(( $(date +%s) - $(date -d "$LOOP_LAST_UPDATED" +%s) ))
        # 如果时间差小于300秒，则跳过本次循环，执行下一个循环
        if [ $DIFF -lt $RETRYWIFI_TIMES ]; then
            log_message "请在$(($RETRYWIFI_TIMES - ${DIFF}))秒后再重新尝试SSID：$LOOP_NAME，切换太频繁了。"
            # 跳出本次循环，执行下一次循环
            continue #跳出循环一
        fi
        
        # 此处更新wifi-config.json文件wifi字段的last_updated字段为当前时间
        jq --arg new_time "$(date "+%Y-%m-%d %H:%M:%S")" --argjson index "$W" '.wifi[$index].last_updated = $new_time' "$CONFIG_FILE" > tmp.$$.json && mv tmp.$$.json "$CONFIG_FILE"
        # 刷新LOOP_LAST_UPDATED变量
        LOOP_LAST_UPDATED=$(date "+%Y-%m-%d %H:%M:%S")

        # 通过uci根据LOOP_BAND频段设置网卡名称
        if [[ "$(echo "${LOOP_BAND}" | tr 'A-Z' 'a-z')" == "2g" ]]; then
            uci set wireless."${sta_section}".device="${sta_device_2g}"
        elif [[ "$(echo "${LOOP_BAND}" | tr 'A-Z' 'a-z')" == "5g" ]]; then
            uci set wireless."${sta_section}".device="${sta_device_5g}"
        else
            echo "未知频段请检查，仅支持2.4G/5G LOOP_BAND: $LOOP_BAND"
            exit 0
        fi

        # 使用 uci 命令设置新的 WiFi 名称和密码
        uci set wireless."${sta_section}".ssid="$LOOP_NAME"
        uci set wireless."${sta_section}".key="$LOOP_PASSWORD"
        # 提交 uci 配置更改
        uci commit wireless
        # 保存应用 WiFi 设置（此时wifi会重启）
        wifi reload
        
        # 等待网络就绪
        log_message "已尝试连接 ${LOOP_NAME} 密码：${LOOP_PASSWORD} 频段：${LOOP_BAND} 即将获取连接状态，持续${MAX_RETRIES}次！"
        # 循环等待设备名称获取
        for na in $(seq 1 ${MAX_RETRIES}); do #设备名称获取
            sleep 3 # 延迟3秒获取一次
            sta_ifname=$(ubus call network.interface."$sta_network" status | sed -n 's/.*"device": "\([^"]*\)".*/\1/p')
            if [ -n "$sta_ifname" ]; then
                echo "已获取到设备名称：$sta_ifname"
                break
            elif [ "$na" -eq "${MAX_RETRIES}" ]; then
                CXQD=$((CXQD + 1))
                # 更新配置文件的CQ_TIMES字段
                jq --arg value "$CXQD" '.autowifiranking[0].CQ_TIMES = ($value | tonumber)' "$CONFIG_FILE" > "tmp.$$.json" && mv "tmp.$$.json" "$CONFIG_FILE"
                log_message "获取中继设备名称失败，已停止运行！"
                exit 0
            else
                echo "第${na}次获取设备名称失败，即将重新尝试..."    
            fi    
        done #设备名称获取

        # 持续获取 wifi 状态，获取到则停止循环
        for ys in $(seq 1 ${MAX_RETRIES}); do  #循环二
            sleep 3 # 延迟3秒
            WiFi_STATE=$(iwinfo "${sta_ifname}" info | awk -F'"' '/ESSID/{print $2}')
            if [ "$LOOP_NAME" = "$WiFi_STATE" ]; then # 判断LOOP_NAME是否等于WiFi_STATE，如果相等
                log_message "连接成功 ${LOOP_NAME} 密码：${LOOP_PASSWORD} 频段：${LOOP_BAND}"
                log_message "开始获取 ${LOOP_NAME} 联网状态 持续${MAX_RETRIES}次！"
                # 获取联网状态
                for yslw in $(seq 1 ${MAX_RETRIES}); do #循环三
                    sleep 2 # 延迟2秒
                    # 检查网络是否连通
                    if curl -s --head "${PING_HOST}" >/dev/null; then
                        log_message "${LOOP_NAME}网络已连通！"
                        push_message "${DEVICE_NAME}切换到 ${LOOP_NAME} 网络正常！"
                        exit 0
                    elif [ "$yslw" -eq "${MAX_RETRIES}" ]; then
                        CXQD=$((CXQD + 1))
                        jq --arg value "$CXQD" '.autowifiranking[0].CQ_TIMES = ($value | tonumber)' "$CONFIG_FILE" > "tmp.$$.json" && mv "tmp.$$.json" "$CONFIG_FILE"
                        log_message "联网失败 ${LOOP_NAME} 即将切换下一个WiFi"
                        break # 结束循环三
                    else
                        echo "第 ${yslw} 次获取 ${LOOP_NAME} 联网状态失败 即将重新尝试..."
                    fi
                done # 循环三
                break # 结束循环二
            elif [ "$ys" -eq "${MAX_RETRIES}" ]; then
                CXQD=$((CXQD + 1))
                # 更新配置文件的CQ_TIMES字段
                jq --arg value "$CXQD" '.autowifiranking[0].CQ_TIMES = ($value | tonumber)' "$CONFIG_FILE" > "tmp.$$.json" && mv "tmp.$$.json" "$CONFIG_FILE"
                log_message "连接失败 请检查 ${LOOP_NAME} 密码：${LOOP_PASSWORD} 频段：${LOOP_BAND} 是否正确！"
                break # 结束循环二
            else
                echo "第 ${ys} 次获取 ${LOOP_NAME} 连接失败 即将重新尝试..."
            fi
        done #循环二
        
    done #循环一

    log_message "已检测配置文件全部WiFi，都无法访问Internet，结束本次脚本运行！"

    # 判断CXQD变量是否大于0，如果是则执行重新启动设备
    if [ "$CXQD" -gt "$RESTART" ]; then
        # 此处CXQD的值写入 wifi-config.json 文件的autowifiranking字段的CQ_TIMES字段
        jq '.autowifiranking[0].CQ_TIMES = 0' "$CONFIG_FILE" > tmp.$$.json && mv tmp.$$.json "$CONFIG_FILE"
        # jq --arg value "$CXQD" '.autowifiranking[0].CQ_TIMES = ($value | tonumber)' "$CONFIG_FILE" > "tmp.$$.json" && mv "tmp.$$.json" "$CONFIG_FILE"
        log_message "执行重启操作"
        sleep 3
        reboot
    fi 
}


# 自动切换中继WiFi  开启断网自动连接预设热点
auto_connect_wifi() {
    # 获取脚本名称作为锁文件名目录
    LOCKFILE="/tmp/$(basename "${BASH_SOURCE%.*}").lock"
    # 使用 flock 命令确保脚本不会同时执行
    (
        flock -n 200 || { echo "自动切换已经在运行，请勿重复运行！"; exit 0; }

        check_log_size # 检查日志文件大小并且是否存在
        # 判断桥接接口是否存在wwan接口
        if ifstatus ${sta_network} &> /dev/null; then
            echo "${sta_network} 桥接接口存在，即将执行联网判断！"
            # 循环检测互联网状态
            for ((i=0; i<${RETRY_TIMES}; i++)); do
                if check_internet; then
                    echo "可以访问Internet, 当前中继热点:${sta_ssid}"
                    # 访问互联网正常，退出脚本
                    exit 0
                else
                    log_message "当前中继热点:${sta_ssid} 无法访问Internet，等待${RETRY_INTERVAL}秒后进行第$((i+1))次重试..."
                    for ys in $(seq 1 ${RETRY_INTERVAL}); do
                        # 执行部分操作
                        echo "已等待 $ys 秒..."
                        sleep 1
                    done
                fi
            done

            log_message "当前中继热点:${sta_ssid} 经过检测${RETRY_TIMES}次无法访问Internet，即将尝试切换WiFi..."

            # 检查配置文件是否存在
            if [ ! -f "$CONFIG_FILE" ]; then
                log_message "配置文件不存在，请检查 ${CONFIG_FILE} 是否存在。"
                exit 0
            else
                # 检查 wifi/name字段是否为空
                WIFI_NAMES=($(jq -r '.wifi[] | select(.name != null and .name != "") | .name' "$CONFIG_FILE" 2>/dev/null))
                WIFI_COUNT=${#WIFI_NAMES[@]}  # 获取有效名称的数量
                # 频段WIFI_COUNT是否等于0
                if [ "$WIFI_COUNT" -eq 0 ]; then
                    log_message "wifi-config.json文件wifi字段为空，请检查配置文件！"
                    exit 0 # 终止脚本运行
                fi
            fi
            
            # 尝试切换WiFi
            switch_wifi

        else
            log_message "${sta_network} 桥接接口不存在，请检查桥接接口名称是否为 ${sta_network}"
            exit 0
        fi

    ) 200>"$LOCKFILE"    
}


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
    config_SSID=$(echo "$POST_DATA" | jq -r '.name')
    config_PASSWORD=$(echo "$POST_DATA" | jq -r '.password')
    config_BAND=$(echo "$POST_DATA" | jq -r '.band')
    config_CURRENT_TIME=$(date +"%Y-%m-%d %H:%M:%S")  # 获取当前时间

    # 检查配置文件是否存在，如果不存在则创建一个空的 JSON 结构
    if [ ! -f "$CONFIG_FILE" ]; then
        echo '{"wifi": []}' > "$CONFIG_FILE"
    fi

    # 使用 jq 处理 JSON 文件
    jq --arg ssid "$config_SSID" --arg password "$config_PASSWORD" --arg band "$config_BAND" --arg time "$config_CURRENT_TIME" \
       'if (.wifi | any(.name == $ssid)) then
            .wifi |= map(if .name == $ssid then .password = $password | .band = $band | .last_updated = $time else . end)
         else
            .wifi += [{"name": $ssid, "password": $password, "band": $band, "last_updated": $time}]
         end' \
       "$CONFIG_FILE" > "$CONFIG_FILE.tmp" && mv "$CONFIG_FILE.tmp" "$CONFIG_FILE"

    # 返回保存成功的响应
    echo "Content-Type: text/html; charset=utf-8"
    echo ""
    echo "保存成功，配置文件已更新"
}



# 设置 WiFi 配置函数
config_function() {
    # 如果请求方法是 POST
    if [ "$REQUEST_METHOD" = "POST" ]; then
        # 读取 POST 请求的数据，不再进行转码处理
        read POST_DATA
        # 使用 sed 命令从 POST 数据中提取 WiFi 名称（ssid）
        function_SSID=$(echo "$POST_DATA" | sed -n 's/^.*ssid=\([^&]*\).*$/\1/p')
        # 使用 sed 命令从 POST 数据中提取 WiFi 密码（key）
        function_KEY=$(echo "$POST_DATA" | sed -n 's/^.*key=\([^&]*\).*$/\1/p')
        # 从 POST_DATA 中提取 band 参数并转换为小写
        function_BAND=$(echo "$POST_DATA" | sed -n 's/^.*band=\([^&]*\).*$/\1/p' | tr 'A-Z' 'a-z')
        # 根据频段设置设备
        if [ "$function_BAND" = "2g" ]; then
            uci set wireless."$sta_section".device="$(uci show wireless | grep -Eo "wireless\..*\.band='$function_BAND'" | cut -d '.' -f 2)"
        elif [ "$function_BAND" = "5g" ]; then
            uci set wireless."$sta_section".device="$(uci show wireless | grep -Eo "wireless\..*\.band='$function_BAND'" | cut -d '.' -f 2)"
        else
            echo "Content-Type: text/plain"
            echo ""
            echo "错误：无效的频段"
            exit 1
        fi
        # 使用 uci 命令设置新的 WiFi 名称和密码
        uci set wireless."$sta_section".ssid="$function_SSID"
        uci set wireless."$sta_section".key="$function_KEY"
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
    get_wifi_name=${sta_ssid}
    # 获取当前的 WiFi 密码
    get_wifi_password=${sta_key}
    # 获取无线网络接口的带宽信息并转换为小写
    get_wifi_band=$(echo "${sta_band}" | tr 'A-Z' 'a-z')
    # 获取当前网络接口状态
    get_wifi_Interface=$(if [[ -n "${sta_network}" ]]; then echo "${sta_network}"; else echo "不存在 ${sta_network} 接口"; fi)
    # 判断当前中继 WiFi 是否连接 $(ifstatus "wwan" &> /dev/null)
    get_wifi_bridge_status=$(if [[ -n "${get_wifi_name}" ]]; then echo "已连接"; else echo "已断开"; fi)
    # 返回包含当前 WiFi 名称、密码和频段的 JSON 格式数据
    echo "Content-Type: application/json; charset=utf-8"
    echo ""
    echo "{\"ssid\":\"$get_wifi_name\",\"key\":\"$get_wifi_password\",\"band\":\"$get_wifi_band\",\"interface\":\"$get_wifi_Interface\",\"bridge_status\":\"$get_wifi_bridge_status\"}"
}

# 获取当前 WiFi 配置
device_get_wifi() {
    get_wireless_status
    if [ $? != 0 ]; then
        echo "Content-Type: text/html; charset=utf-8"
        echo ""
        echo "错误：无法获取当前路由的2.4G/5G网卡名称、WiFi名称、密码"
        exit 1
    fi
}

# 定义一个函数来更新 crontab
auto_crontab() {
    # 获取前端传递的 interval 参数
    interval=$(echo "$QUERY_STRING" | sed -n 's/.*interval=\([^&]*\).*/\1/p')

    # 检查 interval 是否有效
    if [ -z "$interval" ] || [ "$interval" -le 0 ] || [ "$interval" -gt 60 ]; then
        echo "无效的时间间隔（1-60分钟）。"
        exit 1
    fi

    # 要设置的命令
    cron_command="*/$interval * * * * if [ ! -x /www/cgi-bin/wx/integrated.sh ]; then chmod +x /www/cgi-bin/wx/integrated.sh; fi && export QUERY_STRING=\"action=autowifi\"; /www/cgi-bin/wx/integrated.sh"
    
    # 正则表达式
    regex="^\*\/([0-5]?\d) \* \* \* \* if \[ ! -x \/www\/cgi-bin\/wx\/integrated.sh \]; then chmod \+x \/www\/cgi-bin\/wx\/integrated.sh; fi && export QUERY_STRING=\"action=autowifi\"; \/www\/cgi-bin\/wx\/integrated.sh"

    # 获取当前 crontab 内容并存储到变量中
    current_crontab=$(crontab -l 2>/dev/null)

    # 检查 crontab 中是否已存在相似任务
    existing_task=$(echo "$current_crontab" | grep -E "$regex")

    # 如果找到了相似的任务
    if [ -n "$existing_task" ]; then
        # 判断现有任务与新的 cron 任务是否完全一致
        if [ "$existing_task" == "$cron_command" ]; then
            echo "相同的时间任务已存在，无需更新。"
            exit 0
        else
            # 任务内容不一致，删除旧任务并添加新任务
            #echo "任务时间内容不同，删除旧的定时任务并添加新的任务。"
            new_crontab=$(echo "$current_crontab" | grep -vE "$regex")
            echo "$new_crontab" | (cat - ; echo "$cron_command") | crontab -
            # 重启 cron 服务
            /etc/init.d/cron reload
            echo "已设为每 $interval 分钟检测一次。"
            echo "无法联网则自动切换已知的WiFi"
            exit 0
        fi
    else
        # 如果没有找到相同的任务，添加新的任务
        echo "没有定时任务，已添加任务。"
        echo "$current_crontab" | (cat - ; echo "$cron_command") | crontab -
        # 重启 cron 服务
        /etc/init.d/cron reload
        echo "定时任务已设置为每 $interval 分钟执行一次。"
        exit 0
    fi
}


# 解析 QUERY_STRING 获取 action 参数
action=$(echo "$QUERY_STRING" | sed -n 's/.*action=\([^&]*\).*/\1/p')

if [ "$action" = "delete" ]; then
    device_get_wifi
    delete_wifi_config
elif [ "$action" = "save" ]; then
    device_get_wifi
    save_wifi_config
elif [ "$action" = "config" ]; then
    device_get_wifi
    config_function
elif [ "$action" = "getconfig" ]; then
    device_get_wifi
    get_config
elif [ "$action" = "autowifi" ]; then
    #echo "Content-Type: text/html; charset=utf-8"
    #echo ""
    echo "Content-type: text/event-stream"
    echo "Cache-Control: no-cache"
    echo "Connection: keep-alive"
    echo ""
    device_get_wifi
    auto_connect_wifi
elif [ "$action" = "wificrontab" ]; then
    echo "Content-Type: text/html; charset=utf-8"
    echo ""
    auto_crontab
else
    echo "Content-Type: text/html; charset=utf-8"
    echo ""
    echo "错误：无效的参数"
    echo "参数：$QUERY_STRING"
    echo "参数：$action"
    exit 1
fi
