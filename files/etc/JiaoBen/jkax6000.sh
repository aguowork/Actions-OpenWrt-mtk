
#!/bin/sh

interface_name="apclix0"

if iwinfo | grep $interface_name > /dev/null; then
    interface=$(iwinfo | grep $interface_name | cut -d' ' -f1)
    exit 0
else
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
    #uci set wireless.default_MT7986_1_1.ssid='G'
    uci set wireless.default_MT7986_1_1.hidden='1'
    uci set wireless.default_MT7986_1_1.encryption='sae-mixed'
    uci set wireless.default_MT7986_1_1.key='88888888..'
    uci set wireless.MT7986_1_2.channel='auto'
    #uci set wireless.default_MT7986_1_2.ssid='G5G'
    uci set wireless.default_MT7986_1_2.hidden='1'
    uci set wireless.default_MT7986_1_2.encryption='sae-mixed'
    uci set wireless.default_MT7986_1_2.key='88888888..'
    uci set wireless.default_MT7986_1_2.disabled='1'
    uci set wireless.wifinet2=wifi-iface
    uci set wireless.wifinet2.device='MT7986_1_2'
    uci set wireless.wifinet2.mode='sta'
    uci set wireless.wifinet2.network='wwan'
    uci set wireless.wifinet2.ssid='CMCC-Ptbf-5G'
    uci set wireless.wifinet2.encryption='psk2'
    uci set wireless.wifinet2.key='cccc5926'
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
