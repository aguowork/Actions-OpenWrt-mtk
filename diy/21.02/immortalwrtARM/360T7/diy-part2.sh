#!/bin/bash
#
# Copyright (c) 2019-2020 P3TERX <https://p3terx.com>
#
# This is free software, licensed under the MIT License.
# See /LICENSE for more information.
#
# https://github.com/P3TERX/Actions-OpenWrt
# File name: diy-part2.sh
# Description: OpenWrt DIY script part 2 (After Update feeds)


# 修改openwrt登陆地址
sed -i 's/192.168.6.1/192.168.6.1/g' package/base-files/files/bin/config_generate
sed -i 's/\(root::0:0:99999:7:::\)/root:$1$2mmQ7Xbj$5FG6wrw3RA2zD\/WKktai\/.:19782:0:99999:7:::/g' package/base-files/files/etc/shadow

# 修改主机名字（不能纯数字或者使用中文）
sed -i "s/hostname='.*'/hostname='360-T7'/g" package/base-files/files/bin/config_generate

# 修改开源驱动wifi名称
#sed -i 's/OpenWrt/R30B1_AX3000/g' package/kernel/mac80211/files/lib/wifi/mac80211.sh

# 修改闭源驱动2G wifi名称
sed -i 's/ImmortalWrt-2.4G/Y/g' package/mtk/applications/mtwifi-cfg/files/mtwifi.sh

# 修改闭源驱动5G wifi名称
sed -i 's/ImmortalWrt-5G/Y/g' package/mtk/applications/mtwifi-cfg/files/mtwifi.sh

# 添加个性信息
#sed -i 's/R22.8.2/R22.8.2 by nanchuci/g' package/lean/default-settings/files/zzz-default-settings

#删除其他uci
find files/etc/uci-defaults/ -type f ! -name '360T7' -exec rm {} \;
rm -f /files/etc/JiaoBen/jkax6000.sh
rm -f /files/etc/JiaoBen/jkwr30u.sh
rm -f /files/etc/JiaoBen/wbzt.sh

# 脚本配置区
# 启用开机延迟100秒执行脚本
sed -i "s/#qdts~//g" files/etc/rc.local
#sed -i "s/#wifi~(sleep 150;/(sleep 150;/g" files/etc/rc.local
sed -i -e 's/#jk~(sleep 500;/(sleep 500;/g' -e 's/jkwr30u/jk360t7/g' files/etc/rc.local

# 启用每30分钟检测是否断网切换无线脚本
sed -i 's/#wifi\*\/[^ ]* \*/\*\/20 \*/' files/etc/crontabs/root
# 无线中继信号切换
sed -i 's/\[A\]=".*|.*|/\[802\]="qaz6688|2G|/' files/etc/JiaoBen/wifi.conf
sed -i 's/SHUCHUWIFI=(".*")/SHUCHUWIFI=("802")/g' files/etc/JiaoBen/wifi.conf
#sed -i 's/RETRY_INTERVAL=180/RETRY_INTERVAL=180/g' files/etc/JiaoBen/wifi.sh
#sed -i 's/RETRY_TIMES=2/RETRY_TIMES=2/g' files/etc/JiaoBen/wifi.sh
#sed -i 's/WIFI_CONFIG_PATH=".*"/WIFI_CONFIG_PATH="wireless.wifinet2"/g' files/etc/JiaoBen/wifi.sh
#sed -i 's/PING_HOST=".*"/PING_HOST="223.5.5.5"/g' files/etc/JiaoBen/wif.sh

# 无线中继预设配置
echo '{"wifi":[{"name":"802","password":"qaz6688","band":"2G"}]}' | jq . > files/www/wx/wifi-config.json

#重新启动日志
sed -i 's/RETRY_INTERVAL=120/RETRY_INTERVAL=120/g' files/etc/JiaoBen/qdts.sh


#ddnsto
echo -e "\toption token '78846bf5-9a1f-4178-8aca-eeac5c38d4e6'" >> feeds/nas/network/services/ddnsto/files/ddnsto.config
sed -i "s/option enabled '0'/option enabled '1'/g" feeds/nas/network/services/ddnsto/files/ddnsto.config
sed -i "s/option index '.*'/option index '2'/g" feeds/nas/network/services/ddnsto/files/ddnsto.config
sed -i 's/DDNSTO 远程控制/ddnsto/g' feeds/nas_luci/luci/luci-app-ddnsto/luasrc/controller/ddnsto.lua
sed -i 's/远程开机服务/wol/g' feeds/nas_luci/luci/luci-app-ddnsto/luasrc/controller/ddnsto.lua
sed -i 's/共享磁盘/文件/g' feeds/nas_luci/luci/luci-app-ddnsto/luasrc/controller/ddnsto.lua
sed -i 's/启用后可支持控制台的“文件管理”及“远程开机”功能/启用后可支持控制台/g' feeds/nas_luci/luci/luci-app-ddnsto/luasrc/controller/ddnsto.lua
sed -i 's/DDNSTO远程控制是Koolcenter小宝开发的，支持http2的远程穿透控制插件。/DDNSTO Koolcenter小宝开发的，支持http2的穿透插件。/g' feeds/nas_luci/luci/luci-app-ddnsto/luasrc/controller/ddnsto.lua
sed -i 's|支持通过浏览器访问自定义域名访问内网设备后台、远程RDP/VNC桌面、远程文件管理等多种功能。|支持通过浏览器访问自定义域名等多种功能。|g' feeds/nas_luci/luci/luci-app-ddnsto/luasrc/controller/ddnsto.lua
sed -i 's/"应用过滤"/"过滤规则"/g' feeds/luci/applications/luci-app-appfilter/po/zh_Hans/appfilter.po
rm -rf feeds/luci/applications/luci-app-wechatpush
git clone https://github.com/aguowork/luci-app-wechatpush.git feeds/luci/applications/luci-app-wechatpush
sed -i "s/option device_name '.*'/option device_name '360-T7'/g" feeds/luci/applications/luci-app-wechatpush/root/etc/config/wechatpush
