#!/bin/bash
# 用shuf依赖coreutils
# 安装coreutils
# sudo apt-get update
# sudo apt-get install coreutils

SCRIPT_DIR=$(dirname "$(readlink -f "$0")") # 获取当前脚本所在目录
LOG_FILE="${SCRIPT_DIR}/$(basename $0 .sh).log" # 日志文件的存储路径
MAX_LOG_SIZE="100"                      # 日志文件最大大小，单位为KB

# 设置错误处理的 trap
trap 'handle_error' ERR
# 错误处理函数
handle_error() {
    # 获取最后一次命令的退出状态
    local last_exit_status=$?
    # 获取错误发生的函数名
    local func_name=${FUNCNAME[1]}  # 获取调用 handle_error 的函数名，通常是发生错误的函数
    # 获取错误发生的行号
    local line_number=${BASH_LINENO[0]}

    if [ "$last_exit_status" != "0" ]; then
        log_message "发生错误：错误码为 $last_exit_status，错误发生在函数 $func_name 的第 $line_number 行。已停止脚本执行，请检查脚本！"
        exit 1
    fi
}

# 日志函数
log_message() {
    local msg="$1"
    echo "$(date "+%Y-%m-%d %H:%M:%S") - $msg" | tee -a "${LOG_FILE}"
}

# 检查日志文件大小
check_log_size() {
    if [ -e "${LOG_FILE}" ]; then
        local size=$(du -s "${LOG_FILE}" | cut -f1)
        if [ "$size" -gt "$MAX_LOG_SIZE" ]; then
            log_message "日志文件大小超过了最大值，清空日志文件"
            > "${LOG_FILE}"
        fi
    fi
}

# 定义发送消息的函数
send_push_notification() {
    local PUSH_URL="https://wxpusher.zjiecode.com/api/send/message"
    local APP_TOKEN="AT_jf0zuTx0PjA4qBnyCGeKf5J4t0DeUIc6"
    local MYUIDS=("UID_L22PV9Qdjy4q6P3d0dthW1TJiA3k")
    local UIDS=$(IFS=, ; echo "${MYUIDS[*]}")

    # 构建Markdown格式的消息内容
    local MESSAGE='{
      "appToken": "'"$APP_TOKEN"'",
      "content": "'"$2"'",
      "contentType": 3,
      "uids": ["'"$UIDS"'"],
      "summary": "'"$1"'"
    }'

    # 发送POST请求，并检查是否成功
    local HTTP_STATUS
    HTTP_STATUS=$(curl -sSf -o /dev/null -w "%{http_code}\\n" -X POST -H "Content-Type: application/json" -d "$MESSAGE" "$PUSH_URL")

    if [ $HTTP_STATUS -ne 200 ]; then
        log_message "$(date "+%Y-%m-%d %H:%M:%S") 推送失败，HTTP状态码：$HTTP_STATUS"
    fi
    # 使用示例：send_push_notification "$1" "$2"
}


#此处是脚本开始位置------------------------------------------
check_log_size #检查日志文件大小

# 获取今天的日期和星期几（0为星期日，1为星期一，以此类推）
today=$(date '+%Y-%m-%d')
day_of_week=$(date '+%u')  # %u 输出 1-7 表示星期一到星期天

# 在星期二（2）、星期四（4）和星期日（7）发送推送消息
if [ "$day_of_week" = "2" ] || [ "$day_of_week" = "4" ] || [ "$day_of_week" = "7" ]; then
    # 生成随机选号（1到33选6个数）
    numbers=($(shuf -i 1-33 -n 6 | sort -n))

    # 生成随机选号（1到16选一个数）
    special_number=$(shuf -i 1-16 -n 1)

    # 构建推送消息并发送
    log_message "$today 双色球推荐 红球：$(printf "%02d " "${numbers[@]}") 蓝球：$special_number"
    send_push_notification "$today 双色球推荐" "红球：$(printf "%02d " "${numbers[@]}")\n蓝球：$special_number"

# 在星期一（1）、星期三（3）和星期五（5）生成另一种推荐号码
elif [ "$day_of_week" = "1" ] || [ "$day_of_week" = "3" ] || [ "$day_of_week" = "5" ]; then
    # 生成随机选号（1到35选5个数）
    numbers=($(shuf -i 1-35 -n 5 | sort -n))

    # 生成随机选号（1到12选2个数）
    special_numbers=($(shuf -i 1-12 -n 2 | sort -n))

    # 构建推送消息并发送
    log_message "$today 大乐透推荐 红球：$(printf "%02d " "${numbers[@]}") 蓝球：$(printf "%02d " "${special_numbers[@]}")"
    send_push_notification "$today 大乐透推荐" "红球：$(printf "%02d " "${numbers[@]}")\n蓝球：$(printf "%02d " "${special_numbers[@]}")"

else
    # 获取星期几的名称
    case "$day_of_week" in
        "1") day_name="星期一" ;;
        "2") day_name="星期二" ;;
        "3") day_name="星期三" ;;
        "4") day_name="星期四" ;;
        "5") day_name="星期五" ;;
        "6") day_name="星期六" ;;
        "7") day_name="星期日" ;;
        *) day_name="未知" ;;
    esac

    log_message "今天不是推送日期，今天是$day_name，不发送消息。"
fi
