// 密码验证函数，可同时处理点击按钮和按下回车键两种情况
function validatePassword(event) {
    if (event.key === 'Enter' || event.type === 'click') {
        const password = document.getElementById('password').value;
        if (password === 'admin') {
            document.getElementById('loginContainer').classList.add('hidden');
            document.getElementById('configContainer').classList.remove('hidden');
            loadWiFiConfigs();
            fetchCurrentConfig();
        } else {
            alert('密码错误，请重试。');
        }
    }
}

// 加载 WiFi 配置信息的函数
async function loadWiFiConfigs() {
    console.log("加载 WiFi 配置信息");
    const select = document.getElementById('wifiNameSelect');
    if (!select) {
        console.error("未找到 WiFi 选择框 (wifiNameSelect)");
        return;
    }

    try {
        const response = await fetch('wifi-config.json');
        if (!response.ok) {
            throw new Error('无法加载 wifi-config.json 文件');
        }
        const data = await response.json();
        let wifiPasswords = {};

        // 清空下拉框选项，避免重复添加
        select.innerHTML = '<option value="">手动输入</option>';

        const wifiList = data.wifi;
        wifiList.forEach(wifi => {
            const option = document.createElement('option');
            option.value = wifi.name;
            option.textContent = wifi.name;
            select.appendChild(option);
            wifiPasswords[wifi.name] = wifi.password;
        });

        // 监听下拉菜单的变化事件
        select.addEventListener('change', function () {
            const wifiName = this.value;
            document.getElementById('wifiNameInput').value = wifiName;
            document.getElementById('wifiPwd').value = wifiPasswords[wifiName] || '';
            const selectedWifi = wifiList.find(wifi => wifi.name === wifiName);
            if (selectedWifi) {
                document.getElementById('wifiBand').value = selectedWifi.band.toUpperCase();
            } else {
                document.getElementById('wifiBand').value = '';
            }
        });

        // 监听输入框的变化事件
        document.getElementById('wifiNameInput').addEventListener('input', function () {
            const wifiName = this.value;
            document.getElementById('wifiPwd').value = wifiPasswords[wifiName] || '';
            select.value = '';
            document.getElementById('wifiBand').value = '';
        });
    } catch (error) {
        console.error(error);
        select.innerHTML = '<option value="">手动输入</option>';
    }
}

// 显示管理已知热点界面
function showManageWiFi() {
    document.getElementById('manageContainer').classList.remove('hidden');
    document.getElementById('configContainer').classList.add('hidden');
    updateWiFiList();
}

// 返回到配置界面的函数
function returnToConfig() {
    document.getElementById('manageContainer').classList.add('hidden');
    document.getElementById('configContainer').classList.remove('hidden');
}


// 更新 WiFi 列表
async function updateWiFiList() {
    const response = await fetch('wifi-config.json');
    const data = await response.json();
    const wifiList = data.wifi;
    const listContainer = document.getElementById('wifiList');
    listContainer.innerHTML = ''; // 清空现有列表
    wifiList.forEach(wifi => {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = wifi.name;
        checkbox.value = wifi.name;
        listContainer.appendChild(checkbox);
        listContainer.appendChild(document.createTextNode(wifi.name));
        listContainer.appendChild(document.createElement('br'));
    });
}

// 删除选中的 WiFi
async function deleteSelectedWiFi() {
    const checkboxes = document.querySelectorAll('#wifiList input[type="checkbox"]:checked');
    const namesToDelete = Array.from(checkboxes).map(checkbox => checkbox.value);
    const response = await fetch('/cgi-bin/wx/delete_wifi_config.sh', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ names: namesToDelete })
    });
    if (response.ok) {
        updateWiFiList(); // 刷新列表
        alert('删除完成');
    } else {
        const error = await response.text();
        alert('删除失败: ' + error);
    }
}

// 保存配置
document.getElementById('password').addEventListener('keydown', validatePassword);
document.getElementById('confirmButton').addEventListener('click', validatePassword);
document.getElementById('saveButton').addEventListener('click', saveConfig);

async function fetchCurrentConfig() {
    try {
        const response = await fetch('/cgi-bin/wx/get_config.sh');
        if (response.ok) {
            const data = await response.json();
            document.getElementById('currentSSID').textContent = data.ssid;
            document.getElementById('currentKEY').textContent = data.key;
            document.getElementById('currentBand').textContent = data.band.toUpperCase();
            document.getElementById('currentInterface').textContent = data.interface;
            document.getElementById('currentBridgeStatus').textContent = data.bridge_status;
        } else {
            console.error('获取当前配置失败');
        }
    } catch (error) {
        console.error(error);
    }
}

async function saveConfig() {
    const currentInterface = document.getElementById('currentInterface').textContent;
    if (currentInterface!== 'wwan') {
        alert('没有 wwan 接口无法执行中继');
        return;
    }

    const wifiName = document.getElementById('wifiNameInput').value || document.getElementById('wifiNameSelect').value;
    const wifiPwd = document.getElementById('wifiPwd').value;
    const wifiBand = document.getElementById('wifiBand').value;

    if (!wifiName ||!wifiPwd || (!document.getElementById('wifiNameSelect').value &&!wifiBand)) {
        alert('请填写完整 WiFi 名称、密码、频段。');
        return;
    }

    const confirmMessage = `
        热点名称：${wifiName}
        热点密码：${wifiPwd}
        频段：${wifiBand}

        确定切换到该热点吗？`;
    if (!confirm(confirmMessage)) {
        return;
    }

    const wifiConfig = {
        "name": wifiName,
        "password": wifiPwd,
        "band": wifiBand
    };

    try {
        const response1 = await fetch('/cgi-bin/wx/save_wifi_config.sh', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(wifiConfig)
        });
        if (response1.ok) {
            console.log('WiFi 配置保存成功！');
        } else {
            alert('保存失败，请重试。');
        }
    } catch (error) {
        alert('保存失败，请重试。');
    }

    try {
        const response2 = await fetch('/cgi-bin/wx/config.sh', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `ssid=${wifiName}&key=${wifiPwd}&band=${wifiBand}`
        });
        if (response2.ok) {
            document.body.innerHTML = await response2.text();
        } else {
            alert('配置失败，请重试。');
        }
    } catch (error) {
        alert('配置失败，请重试。');
    }
}
