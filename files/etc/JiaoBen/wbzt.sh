#!/bin/bash

SCRIPT_DIR=$(dirname "$(readlink -f "$0")") # 获取当前脚本所在目录
LOG_FILE="${SCRIPT_DIR}/$(basename $0 .sh).log" # 日志文件的存储路径
MAX_LOG_SIZE=100                      # 日志文件最大大小，单位为KB
PUSH_API_URL="https://wxpusher.zjiecode.com/api/send/message/"
APP_TOKEN="AT_jf0zuTx0PjA4qBnyCGeKf5J4t0DeUIc6"
MY_UID="UID_L22PV9Qdjy4q6P3d0dthW1TJiA3k"
TOPIC_ID="25254"

# 日志记录函数
log_message() {
    local msg="$1"
    echo "$(date "+%Y-%m-%d %H:%M:%S") - $msg" | tee -a "${LOG_FILE}"
}

# 错误处理函数
handle_error() {
    # 如果最后的命令退出状态不为零，则认为是错误导致的退出
    local last_exit_status=$?
    if [ "$last_exit_status" != "0" ]; then
        log_message "发生错误，已停止脚本执行，请检查脚本！"
    fi
}

# 设置trap，只捕获ERR信号（错误），而不是EXIT（退出）trap 'handle_error' ERR EXIT
trap 'handle_error' ERR

# 推送消息函数
push_message() {
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

# 检查日志文件是否存在，不存在则创建日志文件
check_log_file() {
    if [ ! -e "${LOG_FILE}" ]; then
        touch "${LOG_FILE}"
        echo "#Key=\"100-200-300-400\"" > "${LOG_FILE}"   
    fi
}

# 检查日志文件大小
check_log_size() {
    check_log_file
    if [ -e "${LOG_FILE}" ]; then
        local size=$(du -s "${LOG_FILE}" | cut -f1)
        if [ "$size" -gt "$MAX_LOG_SIZE" ]; then
            log_message "日志文件大小超过了最大值，清空日志文件"
            > "${LOG_FILE}"
            echo "#Key=\"100-200-300-400\"" > "${LOG_FILE}"
        fi
    fi
}

# 检查互联网连通性
check_internet() {
    if curl -s --head "223.5.5.5" >/dev/null; then
        return 0
    else
        return 1
    fi
}

check_internet
#检查日志文件是否存在，不存在则创建日志文件
check_log_size
# 获取URL中的JSON数据
json_data=$(curl -s "https://m.weibo.cn/api/container/getIndex?jumpfrom=weibocom&type=uid&value=3192362522&containerid=1005053192362522")

# 使用jq工具解析JSON数据并提取字段值
statuses_count=$(echo "$json_data" | jq -r '.data.userInfo | .statuses_count')
follow_count=$(echo "$json_data" | jq -r '.data.userInfo | .follow_count')
followers_count=$(echo "$json_data" | jq -r '.data.userInfo | .followers_count')
description=$(echo "$json_data" | jq -r '.data.userInfo | .description')


content=$(grep -m 1 -o '#Key="[^"]*"' "${LOG_FILE}" | sed 's/#Key="//; s/"//g')
# 按照 "-" 符号拆分字符串为数组
IFS='-' read -r -a array <<< "$content"

# 循环判断数值是否变化，若有变化则推送消息
if [ "$statuses_count" != "${array[0]}" ] || [ "$follow_count" != "${array[1]}" ] || [ "$followers_count" != "${array[2]}" ] || [ "$description" != "${array[3]}" ]; then
    sed -i "s/#Key=\"$content\"/#Key=\"$statuses_count-$follow_count-$followers_count-$description\"/g" "${LOG_FILE}"
    log_message "NRGX NRS：$statuses_count GZS：$follow_count FSS：$followers_count GRJJ：$description GXQ：NRS：${array[0]} GZS：${array[1]} FSS：${array[2]} GRJJ：${array[3]}"
    push_message "NRGX\nNRS：$statuses_count\nGZS：$follow_count\nFSS：$followers_count\nGRJJ：$description\n\n GXQ：\nNRS：${array[0]}\nGZS：${array[1]}\nFSS：${array[2]}\nGRJJ：${array[3]}"
fi
