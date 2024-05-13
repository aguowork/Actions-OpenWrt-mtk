#!/bin/sh

interface_name="apcli0"

if iwinfo | grep $interface_name > /dev/null; then
    interface=$(iwinfo | grep $interface_name | cut -d' ' -f1)
    exit 0
else
    # /etc/config/system
    uci add system led # =cfg058bba
    uci set system.@led[-1].name='system'
    uci set system.@led[-1].sysfs='blue:system'
    uci set system.@led[-1].trigger='default-on'
    uci add system led # =cfg068bba
    uci set system.@led[-1].name='wifizj'
    uci set system.@led[-1].sysfs='blue:network'
    uci set system.@led[-1].trigger='netdev'
    uci set system.@led[-1].dev='apcli0'
    uci add_list system.@led[-1].mode='link'
    uci del system.led_network
    uci commit system
    
    # /etc/config/autoreboot
    uci set autoreboot.cfg01f8be.enable='1'
    uci set autoreboot.cfg01f8be.week='3'
    uci set autoreboot.cfg01f8be.hour='9'
    uci commit autoreboot
    
    # /etc/config/firewall
    uci del firewall.cfg02dc81.network
    uci add_list firewall.cfg02dc81.network='lan'
    uci del firewall.cfg03dc81.network
    uci add_list firewall.cfg03dc81.network='wan'
    uci add_list firewall.cfg03dc81.network='wan6'
    uci add_list firewall.cfg03dc81.network='wwan'
    uci commit firewall
    
    # /etc/config/network
    uci set network.wwan=interface
    uci set network.wwan.proto='dhcp'
    uci commit network
    
    # /etc/config/wireless
    #uci set wireless.default_MT7981_1_1.ssid='H'
    #uci set wireless.default_MT7981_1_1.hidden='1'
    uci set wireless.default_MT7981_1_1.encryption='sae-mixed'
    uci set wireless.default_MT7981_1_1.key='88888888..'
    uci set wireless.MT7981_1_1.channel='auto'
    #uci set wireless.MT7981_1_1.htmode='HE20'
    uci set wireless.default_MT7981_1_1.disabled='1'
    uci set wireless.MT7981_1_2.channel='36'
    #uci set wireless.default_MT7981_1_2.ssid='H'
    #uci set wireless.default_MT7981_1_2.hidden='1'
    uci set wireless.default_MT7981_1_2.encryption='sae-mixed'
    uci set wireless.default_MT7981_1_2.key='88888888..'
    uci set wireless.wifinet2=wifi-iface
    uci set wireless.wifinet2.device='MT7981_1_1'
    uci set wireless.wifinet2.mode='sta'
    uci set wireless.wifinet2.network='wwan'
    uci set wireless.wifinet2.ssid='1707'
    uci set wireless.wifinet2.encryption='psk2'
    uci set wireless.wifinet2.key='18566861705'
    uci commit wireless
    
    # /etc/config/zerotier
    uci set zerotier.sample_config.enabled='1'
    uci del zerotier.sample_config.join
    uci add_list zerotier.sample_config.join='9f77fc393e260f01'
    uci set zerotier.sample_config.nat='1'
    uci commit zerotier
    
    # /etc/config/appfilter
    uci set appfilter.global.enable='1'
    uci commit appfilter
    sleep 10
    reboot
fi
