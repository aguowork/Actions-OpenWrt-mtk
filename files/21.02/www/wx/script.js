const appState = {
    wifiConfigurations: {
        name: '',
        encryption: '',
        password: '',
        band: ''
    },
    currentRelayConfig: {
        ssid: '',
        encryption: '',
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
            },
            cache: 'reload'  // 强制重新加载，不使用缓存
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
            // 隐藏登容器
            const loginContainer = document.getElementById('loginContainer');
            if (loginContainer) {
                loginContainer.style.display = 'none';
            }

            // 显示主容器
            const mainContainer = document.getElementById('mainContainer');
            if (mainContainer) {
                mainContainer.style.display = 'flex';
            }

            // 只获取当前配置信息
            await fetchCurrentConfig();
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
    const passwordContainer = document.getElementById('passwordContainer');
    if (!select) {
        console.error("未找到 WiFi 选择框 (wifiNameSelect)");
        return;
    }

    await processWiFiConfigData(async (wifiList) => {
        let wifiDetails = {};
        select.innerHTML = '<option value="">手动输入</option>';

        // 填充下拉框和保存 WiFi 信息
        wifiList.forEach(wifi => {
            const option = document.createElement('option');
            option.value = wifi.name;
            option.textContent = wifi.name;
            select.appendChild(option);

            // 保存 WiFi 详细信息以便后续使用
            wifiDetails[wifi.name] = {
                password: wifi.password,
                band: wifi.band,
                encryption: wifi.encryption
            };
        });

        // 当用户选择已知 WiFi 时，加载对应信息到输入框并更新密码框状态
        select.addEventListener('change', function () {
            const wifiName = this.value;
            if (wifiDetails[wifiName]) {
                const wifiInfo = wifiDetails[wifiName];
                document.getElementById('wifiNameInput').value = wifiName;
                document.getElementById('wifiPwd').value = wifiInfo.password || '';
                document.getElementById('wifiBand').value = wifiInfo.band.toUpperCase();
                // 更新加密类型 
                document.getElementById('encryption').value = wifiInfo.encryption || 'none';

                // 根据加密类型显示或隐藏密码框
                if (wifiInfo.encryption === 'none' || wifiInfo.encryption === 'owe' || wifiInfo.encryption === '') {
                    // 隐藏密码框
                    passwordContainer.style.display = 'none';
                    document.getElementById('wifiPwd').value = ''; // 清空密码
                } else {
                    // 显示密码框
                    passwordContainer.style.display = 'block';
                }
            } else {
                // 如果未匹配到 WiFi 名称，则清空字段
                document.getElementById('wifiNameInput').value = '';
                document.getElementById('wifiPwd').value = '';
                document.getElementById('wifiBand').value = '';
                document.getElementById('encryption').value = 'none';
                passwordContainer.style.display = 'none';
            }
        });

        // 当用户手动输入 WiFi 名称时，清空其他信息并隐藏密码框
        document.getElementById('wifiNameInput').addEventListener('input', function () {
            const wifiName = this.value;
            if (wifiDetails[wifiName]) {
                const wifiInfo = wifiDetails[wifiName];
                document.getElementById('wifiPwd').value = wifiInfo.password || '';
                document.getElementById('wifiBand').value = wifiInfo.band.toUpperCase();
                document.getElementById('encryption').value = wifiInfo.encryption || 'none';

                // 根据加密类型显示或隐藏密码框
                if (wifiInfo.encryption === 'none' || wifiInfo.encryption === 'owe' || wifiInfo.encryption === '') {
                    passwordContainer.style.display = 'none';
                    document.getElementById('wifiPwd').value = ''; // 清空密码
                } else {
                    passwordContainer.style.display = 'block';
                }
            } else {
                select.value = ''; // 清空下拉框选择
                document.getElementById('wifiPwd').value = '';
                document.getElementById('wifiBand').value = '';
                document.getElementById('encryption').value = 'none';
                passwordContainer.style.display = 'none';
            }
        });
    });
}

  
  // 显示管理已知热点界面
  function showManageWiFi() {
      // 移除所有导航项的active类
      document.querySelectorAll('.nav-item').forEach(nav => {
          nav.classList.remove('active');
      });
      // 激活热点管理导航项
      const manageNavItem = document.querySelector('[data-target="manageContainer"]');
      if (manageNavItem) {
          manageNavItem.classList.add('active');
      }

      // 隐藏所有内容容器
      document.querySelectorAll('.content-container').forEach(content => {
          content.classList.remove('active');
          content.style.display = 'none';
      });

      // 显示管理界面
      const manageContainer = document.getElementById('manageContainer');
      if (manageContainer) {
          manageContainer.classList.add('active');
          manageContainer.style.display = 'flex';
      }

      // 更新WiFi列表
      updateWiFiList();
  }
  
  // 刷新 wifi-config.json 文件的函数，用于显示管理已知热点界面，删除 WiFi 之后刷新列表
  async function updateWiFiList() {
    console.log("开始更新WiFi列表");
    await processWiFiConfigData((wifiList) => {
        console.log("获取到的WiFi列表数据:", wifiList);
        const listContainer = document.getElementById('wifiList');
        if (!listContainer) {
            console.error("未找到WiFi列表容器");
            return;
        }
        listContainer.innerHTML = ''; // 清空现有列表

        if (!wifiList || wifiList.length === 0) {
            console.log("WiFi列表为空");
            listContainer.innerHTML = '<p style="color: #ffd700; text-align: center;">暂无已知热点</p>';
            return;
        }

        const fragment = document.createDocumentFragment();
        wifiList.forEach(wifi => {
            console.log("处理WiFi项:", wifi);
            const wifiItem = document.createElement('div');
            wifiItem.className = 'wifi-item';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = wifi.name;
            checkbox.value = wifi.name;
            
            const label = document.createElement('label');
            label.htmlFor = wifi.name;
            label.innerHTML = `
                <span class="wifi-name">${wifi.name}</span>
                <span class="wifi-details">
                    <span class="wifi-band">${wifi.band}</span>
                    <span class="wifi-password">${wifi.encryption === 'none' ? '无密码' : '已加密'}</span>
                </span>
            `;
            
            wifiItem.appendChild(checkbox);
            wifiItem.appendChild(label);
            fragment.appendChild(wifiItem);
        });
        
        listContainer.appendChild(fragment);
        console.log("WiFi列表更新完成");
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
        await updateWiFiList(); // 刷新列
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
    const encryption = document.getElementById('encryption').value;
    const wifiBand = document.getElementById('wifiBand').value;
    

    if (!wifiName || !encryption || !wifiBand) {
        alert('请填写完整 WiFi名称 和 频段');
        return false;
    }
    return true;
}
  
  // 显示保存确认弹窗
  function showSaveConfirmDialog(wifiConfig) {
      const dialog = document.getElementById('saveConfirmDialog');
      if (dialog) {
          // 填充确认信息
          document.getElementById('confirmSSID').textContent = wifiConfig.name;
          document.getElementById('confirmEncryption').textContent = 
              wifiConfig.encryption === 'none' || wifiConfig.encryption === 'owe' ? '无加密 (开放网络)' :
              wifiConfig.encryption === 'psk2' ? 'WPA2-PSK (强安全性)' :
              wifiConfig.encryption === 'sae' ? 'WPA3-SAE (强安全性)' :
              wifiConfig.encryption === 'psk' ? 'WPA-PSK (弱安全性)' : '未知';
          document.getElementById('confirmKey').textContent = wifiConfig.password || '未加密';
          document.getElementById('confirmBand').textContent = wifiConfig.band;
          
          dialog.classList.remove('hidden');
      }
  }

  // 关闭保存确认弹窗
  function closeSaveConfirmDialog() {
      const dialog = document.getElementById('saveConfirmDialog');
      if (dialog) {
          dialog.classList.add('hidden');
      }
  }

  // 修改保存配置函数
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
    
      // 获取配置信息
      const wifiName = document.getElementById('wifiNameInput').value || document.getElementById('wifiNameSelect').value;
      const encryption = document.getElementById('encryption').value;
      const wifiPwd = document.getElementById('wifiPwd').value;
      const wifiBand = document.getElementById('wifiBand').value;

      // 构建 WiFi 配置对象
      const wifiConfig = {
          name: wifiName,
          encryption: encryption || 'none',
          password: wifiPwd,
          band: wifiBand
      };

      // 显示确认弹窗
      showSaveConfirmDialog(wifiConfig);
  }

  // 确认保存函数
  async function confirmSave() {
      // 获取配置信息
      const wifiName = document.getElementById('confirmSSID').textContent;
      const encryption = document.getElementById('encryption').value;
      const wifiPwd = document.getElementById('wifiPwd').value;
      const wifiBand = document.getElementById('confirmBand').textContent;

      // 构建 WiFi 配置对象
      const wifiConfig = {
          name: wifiName,
          encryption: encryption,
          password: wifiPwd,
          band: wifiBand
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

          if (!response1.ok) {
              const errorMessage = await response1.text();
              alert('保存失败，请重试。错误信息：' + errorMessage);
              closeSaveConfirmDialog();
              return;
          }

          // 发送配置请求
          fetch('/cgi-bin/wx/integrated.sh?action=config', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/x-www-form-urlencoded'
              },
              body: `ssid=${wifiName}&encryption=${encryption}&key=${wifiPwd}&band=${wifiBand}`
          });

          console.log('WiFi UCI配置请求已发送');

          // 关闭确认弹窗
          closeSaveConfirmDialog();

          // 显示成功弹窗
          showSuccessDialog(wifiConfig);

      } catch (error) {
          console.error('配置失败:', error);
          alert('配置请求发送失败，请重试。');
          closeSaveConfirmDialog();
      }
  }
  
  // 返回到配置界面的函数
  function returnToConfig() {
      // 隐藏成功消息
      const successMessage = document.getElementById('successMessage');
      if (successMessage) {
          successMessage.style.display = 'none';  // 使用 style.display 而不是 classList
      }

      // 显示主容
      const mainContainer = document.getElementById('mainContainer');
      if (mainContainer) {
          mainContainer.style.display = 'flex';  // 确保主容器以 flex 方式显示
      }

      // 激活配置标签页
      document.querySelectorAll('.nav-item').forEach(nav => {
          nav.classList.remove('active');
      });
      const configNavItem = document.querySelector('[data-target="configContainer"]');
      if (configNavItem) {
          configNavItem.classList.add('active');
      }
      
      // 显示配容器，隐藏其他容器
      document.querySelectorAll('.content-container').forEach(content => {
          content.classList.remove('active');
          content.style.display = 'none';  // 确保所有容器都隐藏
      });
      
      const configContainer = document.getElementById('configContainer');
      if (configContainer) {
          configContainer.classList.add('active');
          configContainer.style.display = 'flex';  // 显示配置容器
      }
      
      // 刷新配置信
      fetchCurrentConfig();
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
        
        // 修改状态显示，添加标记样式
        const bridgeStatus = document.getElementById('currentBridgeStatus');
        if (data.bridge_status.includes('已连接')) {
            bridgeStatus.innerHTML = `<span class="status-tag status-connected">${data.bridge_status}</span>`;
        } else {
            // 显示"连接失败"加上WiFi名称
            bridgeStatus.innerHTML = `<span class="status-tag status-disconnected">连接失败 ${data.ssid}</span>`;
        }
        
        // 修改网络显示，添加标记样式
        const networkStatus = document.getElementById('currentnetworkstatus');
        if (data.network_status === '已连接') {
            networkStatus.innerHTML = `<span class="status-tag status-connected">已连接</span>`;
        } else {
            networkStatus.innerHTML = `<span class="status-tag status-disconnected">连接失败</span>`;
        }
        
        console.log("获取当前中继 WiFi 状态");
    } else {
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
          const statusElement = document.getElementById('autoSwitchStatus');
          statusElement.textContent = '';
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
  

// 显示定时器设置弹窗
function showTimerDialog() {
    const dialog = document.getElementById('timerDialog');
    if (dialog) {
        dialog.classList.remove('hidden');
    }
}

// 关闭定时器设置弹窗
function closeTimerDialog() {
    const dialog = document.getElementById('timerDialog');
    if (dialog) {
        dialog.classList.add('hidden');
    }
}

// 确认定时器设置
async function confirmTimer() {
    const intervalInput = document.getElementById('timerInterval');
    const statusElement = document.getElementById('autoSwitchStatus');
    const interval = intervalInput.value;

    // 验证输入
    const intervalNumber = parseInt(interval, 10);
    if (isNaN(intervalNumber) || intervalNumber < 0 || intervalNumber > 59) {
        alert("请输入0-59之间的整数");
        return;
    }

    // 关闭弹窗
    closeTimerDialog();

    // 清空状态文本
    if (statusElement) {
        statusElement.textContent = "";
    }

    // 发送请求
    try {
        const response = await fetch(`/cgi-bin/wx/integrated.sh?action=wificrontab&interval=${intervalNumber}`, {
            method: 'GET'
        });

        if (response.ok) {
            const result = await response.text();
            if (statusElement) {
                statusElement.textContent = result;
            }
        } else {
            if (statusElement) {
                statusElement.textContent = `设置定时任务失败，状态码：${response.status}`;
            }
        }
    } catch (error) {
        console.error('请求失败，错误信息：', error);
        if (statusElement) {
            statusElement.textContent = `请求失败，错误信息：${error.message}`;
        }
    }
}

// 修改自动切换定时器函数
function autoSwitchTimer() {
    showTimerDialog();
}

document.getElementById('encryption').addEventListener('change', function () {
    const encryptionType = this.value;
    const passwordContainer = document.getElementById('passwordContainer');
    // 检查选择的加密类型，隐藏或显示密码输入框
    if (encryptionType === 'none' || encryptionType === 'owe') {
        // 如果是无加密类型，隐藏密码输入框
        passwordContainer.style.display = 'none';
        document.getElementById('wifiPwd').value = ''; // 清空密码字段
    } else {
        // 如果是其他类型，显示密码输入框
        passwordContainer.style.display = 'block';
    }
});

  
// 事件监听
document.getElementById('password').addEventListener('keydown', validatePassword);
document.getElementById('confirmButton').addEventListener('click', validatePassword);
document.getElementById('saveButton').addEventListener('click', saveConfig);
// 添加下拉框的鼠标事件
document.getElementById('wifiNameSelect').addEventListener('mousedown', async function() {
    console.log('刷新下拉框');
    await loadWiFiConfigs();  // 每次点击下拉框时重新加载配置
});
// 初始化时根据默认选择隐藏密码框（可选）
document.getElementById('encryption').dispatchEvent(new Event('change'));

// 添加重置输入表单的函数
function resetConfigForm() {
    // 重置已知热点选择框
    const wifiNameSelect = document.getElementById('wifiNameSelect');
    if (wifiNameSelect) {
        wifiNameSelect.value = '';
    }

    // 重置WiFi名称输入框
    const wifiNameInput = document.getElementById('wifiNameInput');
    if (wifiNameInput) {
        wifiNameInput.value = '';
    }

    // 重置安全性选择框
    const encryption = document.getElementById('encryption');
    if (encryption) {
        encryption.value = 'none';  // 重置为默认值
    }

    // 重置WiFi密码输入框
    const wifiPwd = document.getElementById('wifiPwd');
    if (wifiPwd) {
        wifiPwd.value = '';
    }

    // 重置WiFi频段选择框
    const wifiBand = document.getElementById('wifiBand');
    if (wifiBand) {
        wifiBand.value = '';  // 重置为默认的"请选择频段"
    }

    // 根据加密方式显示/隐藏密码框
    const passwordContainer = document.getElementById('passwordContainer');
    if (passwordContainer) {
        passwordContainer.style.display = 'none';  // 默认隐藏密码框
    }
}

// 修改导航切换逻辑
document.addEventListener('DOMContentLoaded', function() {
    // 为所有导航项添加点击事件
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', async function() {
            // 移除所有导航项的active类
            document.querySelectorAll('.nav-item').forEach(nav => {
                nav.classList.remove('active');
            });
            // 为当前点击的导航项添加active类
            this.classList.add('active');
            
            // 隐藏所有内容容器
            document.querySelectorAll('.content-container').forEach(content => {
                content.classList.remove('active');
                content.style.display = 'none';
            });

            // 显示对应的内容容器
            const targetId = this.getAttribute('data-target');
            const targetContainer = document.getElementById(targetId);
            if (targetContainer) {
                targetContainer.classList.add('active');
                targetContainer.style.display = 'flex';

                // 根据不同的页面加载对应的数据
                switch (targetId) {
                    case 'statusContainer':
                        // 当前配置页面只需要获取当前状态
                        await fetchCurrentConfig();
                        break;
                    case 'configContainer':
                        // 重置表单
                        resetConfigForm();
                        // 切换热点页面需要加载已知热点到下拉框
                        await loadWiFiConfigs();
                        break;
                    case 'manageContainer':
                        // 热点管理页面需要更新WiFi列表
                        await updateWiFiList();
                        break;
                    case 'autoSwitchPage':
                        // 自动切换页面清空状态
                        const statusElement = document.getElementById('autoSwitchStatus');
                        if (statusElement) {
                            statusElement.textContent = '';
                        }
                        break;
                }
            }
        });
    });
});

// 同时在初始化时确保正确的显示状态
document.addEventListener('DOMContentLoaded', function() {
    // 确保登录容器显示，主容器和成功消息隐藏
    const loginContainer = document.getElementById('loginContainer');
    const mainContainer = document.getElementById('mainContainer');
    const successMessage = document.getElementById('successMessage');

    if (loginContainer) {
        loginContainer.style.display = 'block';
    }
    if (mainContainer) {
        mainContainer.style.display = 'none';
    }
    if (successMessage) {
        successMessage.style.display = 'none';
    }
});

// 显示成功弹窗
function showSuccessDialog(wifiConfig) {
    const dialog = document.getElementById('successDialog');
    if (dialog) {
        document.getElementById('successSSID').textContent = wifiConfig.name;
        document.getElementById('successEncryption').textContent = { 
            'none': '无加密 (开放网络)', 
            'owe': '无加密 (开放网络)', 
            'psk2': 'WPA2-PSK (强安全性)', 
            'sae': 'WPA3-SAE (强安全性)', 
            'psk': 'WPA-PSK (弱安全性)' 
        }[wifiConfig.encryption] || '未知';
        document.getElementById('successKey').textContent = wifiConfig.password || '未加密';
        document.getElementById('successBand').textContent = wifiConfig.band.toUpperCase();
        
        dialog.classList.remove('hidden');
    }
}

// 关闭成功弹窗并返回配置
function closeSuccessDialog() {
    // 关闭成功弹窗
    const dialog = document.getElementById('successDialog');
    if (dialog) {
        dialog.classList.add('hidden');
    }
    
    // 移除所有导航项的active类
    document.querySelectorAll('.nav-item').forEach(nav => {
        nav.classList.remove('active');
    });
    
    // 激活"当前配置"导航项
    const statusNavItem = document.querySelector('[data-target="statusContainer"]');
    if (statusNavItem) {
        statusNavItem.classList.add('active');
    }
    
    // 隐藏所有内容容器
    document.querySelectorAll('.content-container').forEach(content => {
        content.classList.remove('active');
        content.style.display = 'none';
    });
    
    // 显示"当前配置"容器并刷新状态
    const statusContainer = document.getElementById('statusContainer');
    if (statusContainer) {
        statusContainer.classList.add('active');
        statusContainer.style.display = 'flex';
    }
    
    // 只刷新当前配置信息
    fetchCurrentConfig();
}

// 添加点击 emoji 效果
document.addEventListener('DOMContentLoaded', function() {
    // emoji 数组
    const emojis = ['🐁', '🐂', '🐖', '🌟', '✨', '💫', '⭐', '🎯', '🎨', '🎭', '🎪', '🎡', '🎢', '🎠','😀','😃','😄','😁','😆','😅','😂','🤣','😊','😚','😙','😗','😘','😍','😌','😉','🙃','🙂','😇','😋','😜','😝','😛','🤑','🤗','🤓','😎','🤡','🤠','😖','😣','☹','🙁','😕','😟','😔','😞','😒','😏','😫','😩','😤','😠','😡','😶','😐','😑','😯','😦','😥','😢','😨','😱','😳','😵','😲','😮','😦','🤤','😭','😪','😴','🙄','🤔','😬','🤥','🤐','💩','👺','👹','👿','😈','🤕','🤒','😷','🤧','🤢','👻','💀','☠','👽','👾','🤖','🎃','😺','😸','😹','🙏','👏','🙌','👐','😾','😿','🙀','😽','😼','😻','❤','💖','💗','💕'];    
    // 添加点击事件监听器
    document.addEventListener('click', function(e) {
        // 随机选择一个 emoji
        const emoji = emojis[Math.floor(Math.random() * emojis.length)];
        
        // 创建 emoji 元素
        const emojiEl = document.createElement('span');
        emojiEl.innerText = emoji;
        emojiEl.className = 'click-emoji';
        
        // 设置初始位置为点击位置
        emojiEl.style.left = (e.clientX - 10) + 'px';
        emojiEl.style.top = (e.clientY - 10) + 'px';
        
        // 添加到文档中
        document.body.appendChild(emojiEl);
        
        // 动画结束后移除元素
        setTimeout(() => {
            emojiEl.remove();
        }, 1500);
    });
});

