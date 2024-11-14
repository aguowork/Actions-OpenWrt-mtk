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
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',  // 强制不缓存
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
            // 验证通过，显示配置界面
            document.getElementById('loginContainer').classList.add('hidden');
            // 显示配置界面
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

      // 隐藏配置界面
      document.getElementById('configContainer').style.display = 'none';
      // 隐藏配置成功界面
      document.getElementById('successMessage').style.display = 'none';
      // 隐藏自动切换界面
      document.getElementById('autoSwitchPage').style.display = 'none';
      // 显示 管理界面
      document.getElementById('manageContainer').style.display = 'block';


      // 清除选择框的状态，确保每次进入都是全新的
      document.getElementById('wifiNameSelect').value = '';
      document.getElementById('wifiNameInput').value = '';
      document.getElementById('wifiPwd').value = '';
      document.getElementById('wifiBand').value = '';
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
  
        console.log("加载 wifi-config.json 配置信息到已知热点界面");
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
    const response = await fetch('/cgi-bin/wx/integrated.sh?action=delete', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ names: namesToDelete })
    });
    if (response.ok) {
        await updateWiFiList(); // 刷新列表
        console.log("已删除热点：" + namesToDelete);
    } else {
        const error = await response.text();
        await updateWiFiList(); // 刷新列表
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
  
  async function saveConfig() {
      // 检查配置输入是否有效，无效则直接返回
      if (!isConfigInputValid()) {
          return;
      }
    
      // 获取当前接口名称
      const currentInterface = document.getElementById('currentInterface').textContent;
      // 如果当前接口不是 wwan，则提示用户并返回
      if (currentInterface !== 'wwan') {
          alert('没有 wwan 接口无法执行中继');
          return;
      }
    
      // 获取 WiFi 名称和密码
      const wifiName = document.getElementById('wifiNameInput').value || document.getElementById('wifiNameSelect').value;
      const wifiPwd = document.getElementById('wifiPwd').value;
      const wifiBand = document.getElementById('wifiBand').value;
    
      // 构建确认消息
      const confirmMessage = `
            热点名称：${wifiName}
            热点密码：${wifiPwd}
            频段：${wifiBand}
    
            确定切换到该热点吗？`;
      // 显示确认对话框，如果用户取消则返回
      if (!confirm(confirmMessage)) {
          return;
      }
    
      // 构建 WiFi 配置对象
      const wifiConfig = {
          "name": wifiName,
          "password": wifiPwd,
          "band": wifiBand
      };
    
      try {
          // 发送 POST 请求保存 WiFi 配置
          const response1 = await fetch('/cgi-bin/wx/integrated.sh?action=save', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify(wifiConfig)
          });
          // 如果请求成功，打印成功信息
          if (response1.ok) {
              console.log('WiFi 配置保存成功！');
          } else {
              // 如果请求失败，获取错误信息并提示用户
              const errorMessage = await response1.text();
              alert('保存失败，请重试。错误信息：' + errorMessage);
          }
      } catch (error) {
          // 捕获异常并提示用户
          alert('保存失败，请重试。');
      }
    
      try {
          // 发送 POST 请求进行配置，立即返回，不等待结果
          fetch('/cgi-bin/wx/integrated.sh?action=config', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/x-www-form-urlencoded'
              },
              body: `ssid=${wifiName}&key=${wifiPwd}&band=${wifiBand}`
          });
          // 配置请求已发送
          console.log('WiFi UCI配置请求已发送');

          // 显示成功消息并更新相关元素
          const successMessage = document.getElementById('successMessage');
          if (successMessage) {
              successMessage.style.display = 'block';
              document.getElementById('successSSID').textContent = wifiName;
              document.getElementById('successKey').textContent = wifiPwd;
              document.getElementById('successBand').textContent = wifiBand.toUpperCase();
              // 隐藏配置界面
              document.getElementById('configContainer').style.display = 'none';
          } else {
              console.error('未找到 id 为 “successMessage” 的元素');
          }
      } catch (error) {
          // 捕获异常并记录日志，提示用户
          console.error('配置失败:', error);
          alert('配置请求发送失败，请重试。');
      }
  }  
  
  // 返回到配置界面的函数
  function returnToConfig() {

    // 隐藏管理界面
    document.getElementById('manageContainer').style.display = 'none';
    // 隐藏配置成功界面
    document.getElementById('successMessage').style.display = 'none';
    // 隐藏自动切换界面
    document.getElementById('autoSwitchPage').style.display = 'none';
    // 显示 配置界面
    document.getElementById('configContainer').style.display = 'block';

    // 更新当前中继 WiFi 配置信息
    fetchCurrentConfig(); 
    // 加载已保存的WiFi配置下拉框
    loadWiFiConfigs();
}


  
  
  
  // 获取当前中继配置状态
  async function fetchCurrentConfig() {
    const data = await fetchData('/cgi-bin/wx/integrated.sh?action=getconfig');
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
  // 显示自动切换页面
  function showAutoSwitchPage() {
      const autoSwitchPage = document.getElementById('autoSwitchPage');
      const configContainer = document.getElementById('configContainer');
      const manageContainer = document.getElementById('manageContainer');
      const successMessage = document.getElementById('successMessage');
  
      if (autoSwitchPage) {
          autoSwitchPage.style.display = 'flex';
      }
      if (configContainer) {
          configContainer.style.display = 'none';
      }
      if (manageContainer) {
          manageContainer.style.display = 'none';
      }
      if (successMessage) {
          successMessage.style.display = 'none';
      }
  }
  
  
  async function startAutoSwitch() {
      const statusElement = document.getElementById('autoSwitchStatus');
      statusElement.textContent = '';  // 清空状态文本
  
      try {
          // 发起自动切换请求
          const response = await fetch('/cgi-bin/wx/integrated.sh?action=autowifi');
  
          if (response.ok) {
              // 如果请求成功，开始处理流式数据
              const reader = response.body.getReader();
              const decoder = new TextDecoder();
              let done = false;
              let output = '';
  
              while (!done) {
                  // 从流中读取数据
                  const { value, done: readerDone } = await reader.read();
                  done = readerDone;
  
                  // 将二进制数据解码为字符串
                  const chunk = decoder.decode(value, { stream: true });
  
                  // 将读取到的日志追加到输出
                  output += chunk;
                  statusElement.textContent = output; // 实时更新状态显示
  
                  // 自动滚动到输出框的底部
                  statusElement.scrollTop = statusElement.scrollHeight;
  
                  // 每次读取数据后，延时2秒
                  await new Promise(resolve => setTimeout(resolve, 2000));
              }
  
              // 处理完流数据后，显示完成信息
              statusElement.textContent += '\n运行结束';
              console.log('自动切换WiFi完成');
          
          } else {
              // 如果请求失败，显示失败信息
              console.error('自动切换热点失败，状态码：', response.status);
              statusElement.textContent = `自动切换失败，状态码：${response.status}`;
          }
      } catch (error) {
          // 捕获请求错误并显示错误信息
          console.error('请求失败，错误信息：', error);
          statusElement.textContent = `请求失败，错误信息：${error.message}`;
      }
  }
  

// 处理定时检测功能
async function autoSwitchTimer() {
    const statusElement = document.getElementById('autoSwitchStatus');
    const interval = prompt("Crontab任务断网自动连接已知热点\n\n请输入检测间隔时间(分钟,最大59分钟次)\n\n建议15-30");
    // 清空状态文本
    statusElement.textContent = "";
    if (!interval) {
        //alert("请输入一个有效的数字。");
        statusElement.textContent = "请输入1到59之间的整数。\n";
        return;
    }
    // 检查输入是否为数字
    const intervalNumber = parseInt(interval, 10);

    if (isNaN(intervalNumber) || intervalNumber <= 0 || intervalNumber > 59) {
        alert("无效的时间，请输入1到59之间的整数。");
        return;
    }

    // 向后端发送定时任务请求
    try {
        const response = await fetch(`/cgi-bin/wx/integrated.sh?action=wificrontab&interval=${intervalNumber}`, {
            method: 'GET'
        });

        if (response.ok) {
            const result = await response.text();
            statusElement.textContent += result;
        } else {
            statusElement.textContent += `设置定时任务失败，状态码：${response.status}`;
        }
    } catch (error) {
        console.error('请求失败，错误信息：', error);
        statusElement.textContent += `请求失败，错误信息：${error.message}`;
    }
}



  
  // 事件监听
  document.getElementById('password').addEventListener('keydown', validatePassword);
  document.getElementById('confirmButton').addEventListener('click', validatePassword);
  document.getElementById('saveButton').addEventListener('click', saveConfig);
  // 绑定 focus 事件而不是 click 事件
  document.getElementById('wifiNameSelect').addEventListener('focus', async function() {
     console.log('刷新下拉框');
     await loadWiFiConfigs();  // 每次点击下拉框展开时重新加载配置
  });

