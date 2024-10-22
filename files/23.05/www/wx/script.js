const appState = {
    wifiConfigurations: {
      name: '',
      password: '',
      band: ''
    },
    currentRelayConfig: {
      ssid: '',
      key: '',
      band: '',
      interface: '',
      bridgeStatus: ''
    }
  };
  
  async function fetchData(url, method = 'GET', body = null) {
    try {
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json'
        }
      };
      if (body) {
        options.body = JSON.stringify(body);
      }
      const response = await fetch(url, options);
      if (!response.ok) {
        const errorStatus = response.status;
        let errorMessage;
        if (errorStatus === 404) {
          errorMessage = '资源未找到';
        } else if (errorStatus === 500) {
          errorMessage = '服务器内部错误';
        } else {
          errorMessage = `请求失败: ${errorStatus}`;
        }
        throw new Error(errorMessage);
      }
      return await response.json();
    } catch (error) {
      console.error(error);
      return null;
    }
  }
  
  function displayErrorMessage(message) {
    document.getElementById('errorMessage').textContent = message;
  }
  
  // 密码验证函数
  async function validatePassword(event) {
    if (event.key === 'Enter' || event.type === 'click') {
      const password = document.getElementById('password').value;
      if (password === 'admin') {
        document.getElementById('loginContainer').classList.add('hidden');
        document.getElementById('configContainer').classList.remove('hidden');
        // 获取当前中继状态信息
        await fetchCurrentConfig();
        // 获取获取 wifi-config.json 数据到下拉框中
        await loadWiFiConfigs();
      } else {
        alert('密码错误，请重试。');
      }
    }
  }
  
  // 通用函数，从 wifi-config.json 获取数据并处理
  async function processWiFiConfigData(callback) {
    const data = await fetchData('wifi-config.json');
    if (data) {
      return callback(data.wifi);
    } else {
      displayErrorMessage('加载 WiFi 列表失败，请稍后重试。');
      return null;
    }
  }
  
  // 加载 WiFi 配置信息的函数
  async function loadWiFiConfigs() {
    console.log("获取 wifi-config.json 数据到下拉框中");
    const select = document.getElementById('wifiNameSelect');
    if (!select) {
      console.error("未找到 WiFi 选择框 (wifiNameSelect)");
      return;
    }
  
    await processWiFiConfigData(async (wifiList) => {
      let wifiPasswords = {};
      select.innerHTML = '<option value="">手动输入</option>';
      wifiList.forEach(wifi => {
        const option = document.createElement('option');
        option.value = wifi.name;
        option.textContent = wifi.name;
        select.appendChild(option);
        wifiPasswords[wifi.name] = wifi.password;
      });
  
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
  
      document.getElementById('wifiNameInput').addEventListener('input', function () {
        const wifiName = this.value;
        document.getElementById('wifiPwd').value = wifiPasswords[wifiName] || '';
        select.value = '';
        document.getElementById('wifiBand').value = '';
      });
    });
  }
  
  // 显示管理已知热点界面
  function showManageWiFi() {
    document.getElementById('manageContainer').classList.remove('hidden');
    document.getElementById('configContainer').classList.add('hidden');
    updateWiFiList();
  }
  
  // 刷新 wifi-config.json 文件的函数，用于显示管理已知热点界面，删除 WiFi 之后刷新列表
  async function updateWiFiList() {
    await processWiFiConfigData((wifiList) => {
      const listContainer = document.getElementById('wifiList');
      listContainer.innerHTML = ''; // 清空现有列表
  
      const fragment = document.createDocumentFragment();
      wifiList.forEach(wifi => {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = wifi.name;
        checkbox.value = wifi.name;
        fragment.appendChild(checkbox);
        fragment.appendChild(document.createTextNode(wifi.name));
        fragment.appendChild(document.createElement('br'));
      });
      listContainer.appendChild(fragment);
  
      console.log("加载 wifi-config.json 配置信息");
    });
  }
  
  // 删除选中的 WiFi
  async function deleteSelectedWiFi() {
    const deleteButton = document.querySelector('#manageContainer button:first-child');
    deleteButton.disabled = true;
  
    const checkboxes = document.querySelectorAll('#wifiList input[type="checkbox"]:checked');
    if (checkboxes.length === 0) {
      alert('请选择要删除的 WiFi。');
      deleteButton.disabled = false;
      return;
    }
  
    const namesToDelete = Array.from(checkboxes).map(checkbox => checkbox.value);
    const response = await fetch('/cgi-bin/wx/delete_wifi_config.sh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ names: namesToDelete })
    });
    if (response.ok) {
      await updateWiFiList();
      console.log("已删除热点：" + namesToDelete);
    } else {
      const error = await response.text();
      await updateWiFiList();
      alert('删除失败: ' + error);
    }
  
    deleteButton.disabled = false;
  }
  
  // 验证配置输入是否完整
  function isConfigInputValid() {
    const wifiName = document.getElementById('wifiNameInput').value || document.getElementById('wifiNameSelect').value;
    const wifiPwd = document.getElementById('wifiPwd').value;
    const wifiBand = document.getElementById('wifiBand').value;
  
    if (!wifiName ||!wifiPwd || (!document.getElementById('wifiNameSelect').value &&!wifiBand)) {
      alert('请填写完整 WiFi 名称、密码、频段。');
      return false;
    }
    return true;
  }
// 保存配置
async function saveConfig() {
    if (!isConfigInputValid()) {
        return;
    }

    const currentInterface = document.getElementById('currentInterface').textContent;
    if (currentInterface!== 'wwan') {
        alert('没有 wwan 接口无法执行中继');
        return;
    }

    const wifiName = document.getElementById('wifiNameInput').value || document.getElementById('wifiNameSelect').value;
    const wifiPwd = document.getElementById('wifiPwd').value;
    const wifiBand = document.getElementById('wifiBand').value;

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
            const errorMessage = await response1.text();
            alert('保存失败，请重试。错误信息：' + errorMessage);
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
            const successMessage = document.getElementById('successMessage');
            if (successMessage) {
                successMessage.classList.remove('hidden');
                document.getElementById('successSSID').textContent = wifiName;
                document.getElementById('successKey').textContent = wifiPwd;
                document.getElementById('successBand').textContent = wifiBand.toUpperCase();
                document.getElementById('configContainer').classList.add('hidden');
            } else {
                console.error('Element with id "successMessage" not found');
            }
        } else {
            const errorText = await response2.text();
            console.error('配置失败:', errorText);
            alert('配置失败，请重试。');
        }
    } catch (error) {
        console.error('配置失败:', error);
        alert('配置失败，请重试。');
    }
}
  
  // 返回到配置界面的函数
  function returnToConfig() {
    const manageContainer = document.getElementById('manageContainer');
    const successMessage = document.getElementById('successMessage');
    const configContainer = document.getElementById('configContainer');
  
    if (manageContainer) {
      manageContainer.classList.add('hidden');
    }
    if (successMessage) {
      successMessage.classList.add('hidden');
    }
    if (configContainer) {
      configContainer.classList.remove('hidden');
    }
  
    // 返回后获取和更新 WiFi 配置和下拉列表
    setTimeout(async () => {
      // 更新当前中继 WiFi 配置信息
      await fetchCurrentConfig();
      // 更新已知 WiFi 列表
      await loadWiFiConfigs();
    }, 500);
  }
  
  // 获取当前中继配置状态
  async function fetchCurrentConfig() {
    const data = await fetchData('/cgi-bin/wx/get_config.sh');
    if (data) {
      document.getElementById('currentSSID').textContent = data.ssid;
      document.getElementById('currentKEY').textContent = data.key;
      document.getElementById('currentBand').textContent = data.band.toUpperCase();
      document.getElementById('currentInterface').textContent = data.interface;
      document.getElementById('currentBridgeStatus').textContent = data.bridge_status;
      console.log("获取当前中继 WiFi 状态");
    } else {
      //displayErrorMessage('获取当前中继配置状态失败');
      console.error("获取当前中继配置状态失败");
    }
  }
  
  // 事件监听
  document.getElementById('password').addEventListener('keydown', validatePassword);
  document.getElementById('confirmButton').addEventListener('click', validatePassword);
  document.getElementById('saveButton').addEventListener('click', saveConfig);