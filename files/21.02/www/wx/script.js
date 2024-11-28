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
    const timeout = 60000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            cache: 'reload'
        };
        if (body) options.body = JSON.stringify(body);

        const response = await fetch(url, options);
        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorStatus = response.status;
            const errorMessages = {
                404: '请求的资源不存在',
                500: '服务器内部错误，请稍后重试',
                502: '网关错误，请检查网络连接',
                503: '服务暂时不可用，请稍后重试',
                504: '网关超时，请检查网络连接'
            };
            throw new Error(errorMessages[errorStatus] || `请求失败 (${errorStatus})，请稍后重试`);
        }
        return await response.json();
    } catch (error) {
        if (error.name === 'AbortError') {
            showToast('请求超时，请检查网络连接', 'error');
        } else if (error.message === 'Failed to fetch') {
            showToast('网络连接失败，请检查网络是否正常', 'error');
        } else {
            showToast(error.message, 'error');
        }
        console.error('请求错误:', error);
        return null;
    } finally {
        clearTimeout(timeoutId);
    }
}

function displayErrorMessage(message) {
    document.getElementById('errorMessage').textContent = message;
}

// 在文件开头添加音效对象
const clickSound = new Audio('click-sound.mp3');


// 提取播放音效的函数
function playSound(audioElement) {
    audioElement.currentTime = 0;
    audioElement.play().catch(error => {
        console.log('音效播放失败:', error);
    });
}

// 提取显示元素的函数
function showElement(element) {
    if (element) {
        element.style.display = 'block';
    }
}

// 提取隐藏元素的函数
function hideElement(element) {
    if (element) {
        element.style.display = 'none';
    }
}

// 提取显示弹窗的函数
function showDialog(dialog) {
    if (dialog) {
        dialog.classList.remove('hidden');
        dialog.classList.remove('closing');
    }
}

// 提取隐藏弹窗的函数
function closeDialog(dialog) {
    if (dialog) {
        dialog.classList.add('closing');
        setTimeout(() => {
            dialog.classList.add('hidden');
            dialog.classList.remove('closing');
        }, 300);
    }
}

// 使用提取的函数
async function validatePassword(event) {
    if (event.key === 'Enter' || event.type === 'click') {
        playSound(clickSound); // 使用提取的音效函数
        const password = document.getElementById('password').value;
        if (password === 'admin') {
            const loginContainer = document.getElementById('loginContainer');
            if (loginContainer) {
                loginContainer.classList.add('fade-out');
                setTimeout(() => {
                    hideElement(loginContainer); // 使用提取的隐藏函数
                    const mainContainer = document.getElementById('mainContainer');
                    if (mainContainer) {
                        showElement(mainContainer); // 使用提取的显示函数
                        mainContainer.classList.add('fade-in');
                    }
                }, 300);
            }
            await fetchCurrentConfig();
        } else {
            showToast('密码错误，请重试');
            return;
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
  
// 修改显示已知热点选择弹窗的函数
async function showWiFiSelectDialog() {
    const button = document.querySelector('.wifi-select-button');
    button.disabled = true; // 禁用按钮

    try {
        const dialog = document.getElementById('wifiSelectDialog');
        const listContainer = dialog.querySelector('.wifi-select-list');
        
        // 显示弹窗
        dialog.classList.remove('hidden');
        dialog.classList.remove('closing');
        
        // 获取已知热点列表并加到弹窗中
        const wifiList = await processWiFiConfigData(wifi => wifi);
        
        if (!wifiList || wifiList.length === 0) {
            // 如果没有热点，保持显示空状态提示
            return;
        }
        
        // 清除空状态提示
        listContainer.innerHTML = '';
        
        wifiList.forEach(wifi => {
            const item = document.createElement('div');
            item.className = 'wifi-select-item';
            item.setAttribute('data-value', wifi.name);
            item.innerHTML = `
                <span class="wifi-select-name">${wifi.name}</span>
                <div class="wifi-select-details">
                    <span class="wifi-band">${wifi.band}</span>
                    <span class="wifi-password">${wifi.encryption === 'none' || wifi.encryption === 'owe' ? '无密码' : '有密码'}</span>
                </div>
            `;
            
            // 添加点击事件
            item.addEventListener('click', () => {
                selectWiFi(wifi);
                closeWiFiSelectDialog();
            });
            
            listContainer.appendChild(item);
        });
    } catch (error) {
        console.error('加载已知热点列表失败:', error);
        showToast('加载已知热点列表失败，请重试');
    } finally {
        button.disabled = false; // 恢复按钮
    }
}

// 关闭已知热点选择弹窗
function closeWiFiSelectDialog() {
    const dialog = document.getElementById('wifiSelectDialog');
    if (dialog) {
        dialog.classList.add('closing');
        setTimeout(() => {
            dialog.classList.add('hidden');
            dialog.classList.remove('closing');
            // 重置列表内容为默认的空状态
            dialog.querySelector('.wifi-select-list').innerHTML = `
                <div class="wifi-empty-state">
                    <span class="nav-icon">📡</span>
                    <p>暂无已知热点</p>
                    <p class="wifi-empty-tip">请先 "手动输入" 添加数据</p>
                </div>
            `;
        }, 300);
    }
}

// 选择WiFi后的处理函数
function selectWiFi(wifi) {
    if (wifi) {
        document.getElementById('wifiNameInput').value = wifi.name;
        document.getElementById('wifiPwd').value = wifi.password || '';
        document.getElementById('wifiBand').value = wifi.band.toUpperCase();
        document.getElementById('encryption').value = wifi.encryption || 'none';
        
        // 根据加密类型显示或隐藏密码框
        const passwordContainer = document.getElementById('passwordContainer');
        if (wifi.encryption === 'none' || wifi.encryption === 'owe' || wifi.encryption === '') {
            passwordContainer.style.display = 'none';
            document.getElementById('wifiPwd').value = '';
        } else {
            passwordContainer.style.display = 'block';
        }
    } else {
        // 手动输入时清空所有字段
        document.getElementById('wifiNameInput').value = '';
        document.getElementById('wifiPwd').value = '';
        document.getElementById('wifiBand').value = '';
        document.getElementById('encryption').value = 'none';
        document.getElementById('passwordContainer').style.display = 'none';
    }
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

    // 更新WiFi列表(不示加载动画)
    updateWiFiList();
}
  
// 刷新 wifi-config.json 文件的函数，用于显示管理已知热点界面，删除 WiFi 之后刷新列表
async function updateWiFiList() {
    console.log("开始更新WiFi列表");

    try {
        await processWiFiConfigData((wifiList) => {
            const listContainer = document.getElementById('wifiList');
            if (!listContainer) {
                console.error("未找到WiFi列表容器");
                return;
            }
            listContainer.innerHTML = ''; // 清空有列表

            if (!wifiList || wifiList.length === 0) {
                console.log("WiFi列表为空");
                listContainer.innerHTML = '<p style="color: #ffd700; text-align: center;">暂无已知热点</p>';
                return;
            }

            const fragment = document.createDocumentFragment();
            wifiList.forEach(wifi => {
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
                        <span class="wifi-password">${wifi.encryption === 'none' || wifi.encryption === 'owe' ? '无密码' : '有密码'}</span>
                    </span>
                `;
                
                wifiItem.appendChild(checkbox);
                wifiItem.appendChild(label);
                fragment.appendChild(wifiItem);
            });
            
            listContainer.appendChild(fragment);
            console.log("WiFi列表更新完成");
        });
    } catch (error) {
        console.error("更新WiFi列表失败:", error);
    }
}
  
// 显示删除确认弹窗
function showDeleteConfirmDialog() {
    const checkboxes = document.querySelectorAll('#wifiList input[type="checkbox"]:checked');
    if (checkboxes.length === 0) {
        showToast('请选择删除的热点');
        return;
    }

    const dialog = document.getElementById('deleteConfirmDialog');
    const countElement = document.getElementById('deleteCount');
    countElement.textContent = checkboxes.length;
    
    dialog.classList.remove('hidden');
    dialog.classList.remove('closing');
}

// 关闭删除确认弹窗
function closeDeleteConfirmDialog() {
    const dialog = document.getElementById('deleteConfirmDialog');
    if (dialog) {
        dialog.classList.add('closing');
        setTimeout(() => {
            dialog.classList.add('hidden');
            dialog.classList.remove('closing');
        }, 300);
    }
}

// 确认删除操作
async function confirmDelete() {
    const deleteButton = document.querySelector('#manageContainer button:first-child');
    deleteButton.disabled = true;

    const checkboxes = document.querySelectorAll('#wifiList input[type="checkbox"]:checked');
    const namesToDelete = Array.from(checkboxes).map(checkbox => checkbox.value);

    try {
        showLoading();
        setLoadingText(`正在删除 ${namesToDelete.length} 个热点...`);
        
        const response = await fetch('/cgi-bin/wx/integrated.sh?action=delete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ names: namesToDelete })
        });
        
        if (response.ok) {
            await updateWiFiList();
            showToast('删除成功', 'success');
            console.log("已删除热点：" + namesToDelete);
        } else {
            const error = await response.text();
            await updateWiFiList();
            showToast('删除失败: ' + error);
        }
    } catch (error) {
        console.error('删除请求失败:', error);
        showToast('删除失败，请重试');
    } finally {
        hideLoading();
        setLoadingText();
        deleteButton.disabled = false;
        closeDeleteConfirmDialog();
    }
}

// 修改原有的 deleteSelectedWiFi 函数
function deleteSelectedWiFi() {
    playSound(clickSound);
    showDeleteConfirmDialog();
}
  
// 验证配置输入是否完整
function isConfigInputValid() {
    const wifiName = document.getElementById('wifiNameInput').value;
    const encryption = document.getElementById('encryption').value;
    const wifiBand = document.getElementById('wifiBand').value;
    const wifiPwd = document.getElementById('wifiPwd').value;

    // 检查WiFi名称
    if (!wifiName) {
        showToast('请输入WiFi名称');
        return false;
    }

    // 查频段
    if (!wifiBand) {
        showToast('请选择WiFi频段');
        return false;
    }

    // 根据加密方式检查密码
    if (encryption !== 'none' && encryption !== 'owe') {
        if (!wifiPwd) {
            showToast('请输入WiFi密码');
            return false;
        }
        // 检查密码长度（最少8位）
        if (wifiPwd.length < 8) {
            showToast('WiFi密码不能少于8位');
            return false;
        }
        // WPA/WPA2/WPA3密码最大长度为63位
        if (wifiPwd.length > 63) {
            showToast('WiFi密码不能超过63位');
            return false;
        }
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
        // 重置可能存在的关闭动画类
        dialog.classList.remove('closing');
    }
}

// 关闭保存确认弹窗
function closeSaveConfirmDialog() {
    playSound(clickSound); // 使用提取的音效函数
    const dialog = document.getElementById('saveConfirmDialog');
    closeDialog(dialog); // 使用提取的关闭弹窗函数
}

// 修改保存配置函数
async function saveConfig() {
    playSound(clickSound); // 使用提取的音效函数
    // WIFI名、段加类、密码是否有效，无效则直接返回
    if (!isConfigInputValid()) {
        return;
    }

    // 获取当前配置的接口名称 
    const currentInterface = document.getElementById('currentInterface').textContent;
    // 检查接口名称是否包含"不存在"或为空
    console.log('接口名称：', currentInterface);
    if (!currentInterface || currentInterface.includes('不存在')) {
        alert('未获取到效的中继接口，无法执行继');
        return;
    }

    // 获取配置信息
    const wifiName = document.getElementById('wifiNameInput').value;
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
    playSound(clickSound);
    showLoading();
    setLoadingText('保存配置中...');
    
    const wifiName = document.getElementById('confirmSSID').textContent;
    const encryption = document.getElementById('encryption').value;
    const wifiPwd = document.getElementById('wifiPwd').value;
    const wifiBand = document.getElementById('confirmBand').textContent;

    const wifiConfig = {
        name: wifiName,
        encryption: encryption,
        password: wifiPwd,
        band: wifiBand
    };

    try {
        // 发送保存请求
        const saveResponse = await fetch('/cgi-bin/wx/integrated.sh?action=save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(wifiConfig)
        });

        if (!saveResponse.ok) {
            throw new Error('保存配置失败，请重试');
        }
        console.log('WiFi 写入JSON配置成功');

        // 发送配置请求
        const configResponse = await fetch('/cgi-bin/wx/integrated.sh?action=config', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `ssid=${wifiName}&encryption=${encryption}&key=${wifiPwd}&band=${wifiBand}`
        });

        if (!configResponse.ok) {
            throw new Error('应用配置失败，请重试');
        }
        console.log('WiFi UCI配置请求完成');

        // 关闭确认弹窗并显示成功弹窗
        closeSaveConfirmDialog();
        showSuccessDialog(wifiConfig);

    } catch (error) {
        console.error('配置失败:', error);
        showToast(error.message || '配置失败，请重试', 'error');
    } finally {
        hideLoading();
        setLoadingText();
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
    
    // 显示配容器，隐藏他容器
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
}

// 获取当前中继配置状态
async function fetchCurrentConfig() {
    // 显示加载动画
    showLoading();
    setLoadingText('加载配置中...'); // 设置专门加载文本
    
    try {
        const data = await fetchData('/cgi-bin/wx/integrated.sh?action=getconfig');
        if (data) {
            document.getElementById('currentSSID').textContent = data.ssid;
            // 改密码显示 - 统一显示emoji
            const keyElement = document.getElementById('currentKEY');
            keyElement.dataset.password = data.key; // 存储实密码
            keyElement.textContent = data.key ? '🤔'.repeat(6) : ''; // 固定显示emoji
            document.getElementById('currentBand').textContent = data.band.toUpperCase();
            document.getElementById('currentInterface').textContent = data.interface;

            // 修改接口显示，添加标记样式
            const interfaceElement = document.getElementById('currentInterface');
            if (data.interface.includes('不存在')) {
                interfaceElement.innerHTML = `<span class="status-tag status-disconnected">${data.interface}</span>`;
            } else {
                // 显示绿色标记 
                interfaceElement.innerHTML = `<span class="status-tag status-connected">${data.interface}</span>`;
            }

            // 修改状态显示，添加标记样式
            const bridgeStatus = document.getElementById('currentBridgeStatus');
            if (data.bridge_status.includes('连接成功')) {
                bridgeStatus.innerHTML = `<span class="status-tag status-connected">${data.bridge_status}</span>`;
            } else {
                // 显示"连接失败"加上WiFi名称
                bridgeStatus.innerHTML = `<span class="status-tag status-disconnected">连接失败 ${data.ssid}</span>`;
            }
            
            // 修改网络显示，添加标记样式
            const networkStatus = document.getElementById('currentnetworkstatus');
            if (data.network_status === '连接成功') {
                networkStatus.innerHTML = `<span class="status-tag status-connected">连接成功</span>`;
            } else {
                networkStatus.innerHTML = `<span class="status-tag status-disconnected">连接失败</span>`;
            }
            
            console.log("获取当前中继 WiFi 状态");
        } else {
            console.error("获取当前中继配置状态失败");
            showToast('获取配置失败，请检查中继模式是否已设置', 'error');
        }
    } catch (error) {
        console.error("获取配置出错:", error);
        showToast('获取配置失败，请检查络连接', 'error');
    } finally {
        // 无论成功还是失败，都隐藏加载动画
        hideLoading();
        setLoadingText(); // 重置为默认文本
    }
}
// 显示自动切换面
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
    playSound(clickSound);
    const statusElement = document.getElementById('autoSwitchStatus');
    
    // 清空状态并添加控制按钮
    statusElement.innerHTML = '';
    addLogControls();

    // 直接开始自动切换
    appendLog("开始切换到网络正常的热点", 'info');

    try {
        const response = await fetch('/cgi-bin/wx/integrated.sh?action=autowifi');
        if (!response.ok) {
            throw new Error(`切换失败 (${response.status})`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const {value, done} = await reader.read();
            if (done) break;

            const text = decoder.decode(value);
            text.split('\n').forEach(line => {
                if (line.trim()) {
                    const logType = line.includes('成功') ? 'success' : 
                                  line.includes('失败') || line.includes('错误') ? 'error' : 
                                  line.includes('警告') || line.includes('注意') ? 'warning' : 
                                  'info';
                    appendLog(line, logType);
                }
            });
        }

        appendLog("------------------------", 'info');
        appendLog("✅ 切换WiFi运行结束", 'success');

    } catch (error) {
        console.error('切换错误:', error);
        appendLog("------------------------", 'info');
        appendLog('⚠️ 已断开连接，请等待重新连接...', 'warning');
        appendLog('⚠️ 如1分钟后仍未恢复连接，请手动连接并刷新页面', 'warning');
        appendLog('❌ 自动切换WiFi运行异常结束', 'error');
    }
}
  

// 显示定时器设置弹窗
function showTimerDialog() {
    const dialog = document.getElementById('timerDialog');
    if (dialog) {
        dialog.classList.remove('hidden');
        // 重置可能存在的关闭动画类
        dialog.classList.remove('closing');
    }
}

// 关闭定时器设置弹窗
function closeTimerDialog() {
    playSound(clickSound); // 使用提取的音效函数
    const dialog = document.getElementById('timerDialog');
    if (dialog) {
        dialog.classList.add('closing');
        setTimeout(() => {
            dialog.classList.add('hidden');
            dialog.classList.remove('closing');
        }, 300);
    }
}

// 确认定时器设置
async function confirmTimer() {
    playSound(clickSound); // 使用提取的音效函数
    const intervalInput = document.getElementById('timerInterval');
    const statusElement = document.getElementById('autoSwitchStatus');
    const interval = intervalInput.value;

    // 验证输入
    const intervalNumber = parseInt(interval, 10);
    if (isNaN(intervalNumber) || intervalNumber < 0 || intervalNumber > 59) {
        showToast('请输入0-59之间的整数');
        return;
    }

    // 关弹窗
    closeTimerDialog();

    // 清空状态文本
    if (statusElement) {
        statusElement.textContent = "";
    }

    // 送请求
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

// 修改自切换定时函数
function autoSwitchTimer() {
    //playSound(clickSound); // 添加音效
    showTimerDialog();
}

document.getElementById('encryption').addEventListener('change', function () {
    const encryptionType = this.value;
    const passwordContainer = document.getElementById('passwordContainer');
    // 检查选择的加密类型，隐藏或显示密码输入
    if (encryptionType === 'none' || encryptionType === 'owe') {
        // 如果是无加密类，隐藏密码输入框
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
// 初始化时根据默认选择隐藏密码框（可选）
document.getElementById('encryption').dispatchEvent(new Event('change'));

// 添加重置输入表单的函数
function resetConfigForm() {
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
        passwordContainer.style.display = 'none';  // 默认藏密码框
    }
}

// 合并所有的 DOMContentLoaded 事件处理
document.addEventListener('DOMContentLoaded', function() {
    // 导航切换处理
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', async function() {
            playSound(clickSound);
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');

            const targetId = this.getAttribute('data-target');
            const targetContainer = document.getElementById(targetId);
            if (targetContainer) {
                document.querySelectorAll('.content-container').forEach(content => {
                    content.classList.remove('active');
                    content.style.display = 'none';
                });
                targetContainer.classList.add('active');
                targetContainer.style.display = 'flex';

                // 根据不同的页面加载对应的数据
                switch (targetId) {
                    case 'statusContainer':
                        await fetchCurrentConfig();
                        break;
                    case 'configContainer':
                        resetConfigForm();
                        break;
                    case 'manageContainer':
                        await updateWiFiList();
                        break;
                    case 'wirelessContainer':
                        await fetchWirelessSettings();
                        break;
                    case 'autoSwitchPage':
                        const statusElement = document.getElementById('autoSwitchStatus');
                        if (statusElement) {
                            statusElement.textContent = '';
                            const oldCounter = document.getElementById('logCounter');
                            if (oldCounter) {
                                oldCounter.remove();
                            }
                            const autoSwitchTips = [
                                "⚠️ 重要提示:",
                                "• 程序只支持设备是\"中继模式\"下运行",
                                "• 切换/定时模式，都需要有 2+ 已知热点", 
                                "• 切换会重启WiFi，出现断开连接属于正常现象",
                                "• 定时模式，断网后会切换热点",
                                "• 定时模式，输入 0 则是关闭",
                                "• 当前配置，点一次刷新一次",
                                "• 连接失败，可能是密码、频段、安全性不对",
                            ];
                            autoSwitchTips.forEach(tip => appendLog(tip, 'warning'));
                        }
                        break;
                }
            }
        });
    });

    // 自动切换提示处理
    const tips = [
        "自动切换会断开WiFi连接，输出错误是正常的",
        "自动/定时模式，都需要有 2+ 已知热点",
        "程序只支持设备是\"中继模式\"下运行",
        "定时检测模式，输入 0 则是关闭",
        "定时检测模式，断网后会切换热点",
        "PC端有线连接路由器自动切换不会报错",
        "当前配置，点一次刷新一次",
        "当前配置，热点连接成功，状态连接成功",
        "当前配置，网络正常，网络连接成功",
        "连接失败，可能是密码、频段、安全性不对",
        "uhttpd默认60秒超时",
        "前端操作只能执行60秒就被强制结束",
        "修改uhttpd超时时间，可ssh执行一下",
        "uci set uhttpd.main.script_timeout='600'"
    ];
    let currentTipIndex = 0;
    const tipElement = document.getElementById('autoSwitchTip');

    function showNextTip() {
        currentTipIndex = (currentTipIndex + 1) % tips.length;
        tipElement.innerHTML = tips[currentTipIndex].replace(/\n/g, '<br>');
    }

    setInterval(showNextTip, 3000); // 每3秒切换一次

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

    initStatusSelectHandlers();
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
        // 重置可能存在的关闭动画类
        dialog.classList.remove('closing');
    }
}

// 关闭成功弹窗并返回配置
function closeSuccessDialog() {
    const dialog = document.getElementById('successDialog');
    if (dialog) {
        dialog.classList.add('closing');
        setTimeout(() => {
            dialog.classList.add('hidden');
            dialog.classList.remove('closing');
            
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
            
            playSound(clickSound); // 使用提取的音效函数
            // 只刷新当前配置信息
            fetchCurrentConfig();
        }, 300);
    }
}

// 添加点击 emoji 效果
document.addEventListener('DOMContentLoaded', function() {
    // emoji 数组
    const emojis = ['🐁','🐂','🐖','🐅','🦁','🐔','🐉','🌟','✨','💫','⭐','🍎','🍅','🎂','👍','😀','😁','🌕️','🌜','🤪','🤗','🤔','🎠','😀','😃','😄','😁','😆','😅','😂','🤣','😊','😚','','😗','😘','😍','😌','😉','🤗','🙂','😇','😋','😜','😝','😛','🤑','🤗','😎','🤡','🤠','😖','😣','🐷','😎','😕','😴','😺','😬','😒','😏','😫','😩','😤','😠','😡','😶','😐','💌','😯','😦','😥','😢','😨','😱','😵','😲','😮','😦','🤤','😭','😪','😴','🙄','😬','🤥','🤐','👺','🫡','🤫','😈','🤩','🤒','😷','🤧','🤪','👻','😉','🐽','😉','🥰','🤖','🥹','😺','😸','😹','🤭','👏','😭','🫣','😾','😿','🙀','😽','😼','😻','❤','💖','💕','🐶','🐐','🦢','🤓','🖕','😘','🥱','🌞','💩','🤣'];
    
    // 添加点击事件监听器，但排除label和input元素
    document.addEventListener('click', function(e) {
        // 如果点击的是复选框、label、input或select素，则不创建emoji
        if (e.target.type === 'checkbox' || 
            e.target.tagName.toLowerCase() === 'label' || 
            e.target.tagName.toLowerCase() === 'input' ||
            e.target.tagName.toLowerCase() === 'select') {
            return;
        }
        
        // 随机选择一个emoji
        const emoji = emojis[Math.floor(Math.random() * emojis.length)];
        
        // 创建emoji元素
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

// 添加切换密码显示的函数
function togglePassword(element) {
    const actualPassword = element.dataset.password;
    if (element.textContent.includes('🤔')) {
        // 如果当前是emoji，切换到实际密码
        element.textContent = actualPassword;
    } else {
        // 如果当前实际密码，切换到emoji
        element.textContent = '🤔'.repeat(6); // 固定显示6个emoji
    }
}

// 添加迟显示加载动画的能
let loadingTimer;

function showLoading() {
    // 清除可能存在的定时器
    if (loadingTimer) {
        clearTimeout(loadingTimer);
    }
    // 延迟 100ms 显示加载动画，避免操作太快时的烁
    loadingTimer = setTimeout(() => {
        document.getElementById('loadingSpinner').classList.remove('hidden');
    }, 100);
}

function hideLoading() {
    // 清除定时器
    if (loadingTimer) {
        clearTimeout(loadingTimer);
    }
    document.getElementById('loadingSpinner').classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', function() {
    const tips = [
        "自动切换会断开WiFi连接，输出错误是正常的",
        "自动/定时模式，都需要有 2+ 已知热点",
        "程序只支持设备是\"中继模式\"下运行",
        "定时检测模式，输入 0 则是关闭",
        "定时检测模式，断网后会切换热点",
        "PC端有线连接路由器自动切换不会报错",
        "当前配置，点一次刷新一次",
        "当前配置，热点连接成功，状态连接成功",
        "当前配置，网络正常，网络连接成功",
        "连接失败，可能是密码、频段、安全性不对",
        "uhttpd默认60秒超时",
        "前端操作只能执行60秒就被强制结束",
        "修改uhttpd超时时间，可ssh执行一下",
        "uci set uhttpd.main.script_timeout='600'"
    ];
    let currentTipIndex = 0;
    const tipElement = document.getElementById('autoSwitchTip');

    function showNextTip() {
        currentTipIndex = (currentTipIndex + 1) % tips.length;
        //tipElement.textContent = tips[currentTipIndex];
        // 将文本中的换行替换为 <br> 标签
        tipElement.innerHTML = tips[currentTipIndex].replace(/\n/g, '<br>');
    }

    setInterval(showNextTip, 3000); // 每3秒切换一次
});

// 修改 showToast 函数,将示时间改为2秒
function showToast(message, type = 'error') {
    document.querySelectorAll('.toast').forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add('show');
        toast.style.animation = 'toastIn 0.3s ease forwards';
    });

    setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

// 添加一个函数来设置加载文本
function setLoadingText(text = '处理中...') {
    const loadingText = document.querySelector('.loading-text');
    if (loadingText) {
        loadingText.textContent = text;
    }
}

// 监听输入框聚焦事件，调整页面滚动
document.getElementById('wifiPwd').addEventListener('focus', function() {
    setTimeout(() => {
        this.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
});

// 修改添加日志控制元素数
function addLogControls() {
    const container = document.querySelector('.status-container');
    
    // 移除可能存在的旧按钮
    const oldButton = document.getElementById('logCounter');
    if (oldButton) {
        oldButton.remove();
    }
    
    // 加复制按钮
    const copyButton = document.createElement('div');
    copyButton.className = 'log-counter';
    copyButton.id = 'logCounter';
    copyButton.textContent = '复制日志';
    copyButton.onclick = copyLogs;
    container.appendChild(copyButton);
}

// 添加复制日志功能
function copyLogs() {
    const statusElement = document.getElementById('autoSwitchStatus');
    const logText = statusElement.innerText;
    const copyButton = document.getElementById('logCounter');
    
    try {
        // 创建临时文本区域
        const textArea = document.createElement('textarea');
        textArea.value = logText;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '0';
        document.body.appendChild(textArea);
        
        // 选择并复制文本
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        // 显示复制功
        const originalText = copyButton.textContent;
        copyButton.textContent = '已复制';
        
        // 1秒后恢复原来的文字
        setTimeout(() => {
            copyButton.textContent = originalText;
        }, 1000);
        
    } catch (err) {
        console.error('复制失败:', err);
        showToast('复制失败，请重试');
    }
}

// 修改 appendLog 函数，改进日志类型判断
function appendLog(message, type = 'info') {
    const statusElement = document.getElementById('autoSwitchStatus');
    const logLine = document.createElement('div');
    logLine.className = `log-line log-${type}`;
    
    // 根据消息内容定日志类型
    let logType = type;
    if (message.includes('失败') || message.includes('错误')) {
        logType = 'error';
    } else if (message.includes('成功')) {
        logType = 'success';
    } else if (message.includes('警告') || message.includes('注意') || message.includes('断开')) {
        logType = 'warning';
    }
    
    // 设置日志行的类
    logLine.className = `log-line log-${logType}`;
    
    // 直接显示消息，不包含时间戳
    logLine.textContent = message;
    
    statusElement.appendChild(logLine);
    statusElement.scrollTop = statusElement.scrollHeight;
}

// 全选功能
function selectAllWiFi() {
    const checkboxes = document.querySelectorAll('#wifiList input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = true;
    });
}

// 反选功能
function selectInverseWiFi() {
    const checkboxes = document.querySelectorAll('#wifiList input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = !checkbox.checked;
    });
}

// 添加一个对象来存储初始状态
// 存储初始无线设置状态的对象
let initialWirelessSettings = {
    disabled_2g: '',     // 2.4G 是否禁用
    ssid_2g: '',        // 2.4G SSID名称
    key_2g: '',         // 2.4G 密码
    channel_2g: '',     // 2.4G 信道
    htmode_2g: '',      // 2.4G 带宽模式
    hidden_2g: '',      // 2.4G 是否隐藏
    disabled_5g: '',    // 5G 是否禁用
    ssid_5g: '',        // 5G SSID名称
    key_5g: '',         // 5G 密码
    channel_5g: '',     // 5G 信道
    htmode_5g: '',      // 5G 带宽模式
    hidden_5g: ''       // 5G 是否隐藏
};

/**
 * 获取无线设置并更新表单
 * 后端获取当前无线设置,保存初始状态并填充表单
 */
async function fetchWirelessSettings() {
    try {
        showLoading();
        setLoadingText('无线设置加载中...');

        // 请求后端获取无线设置
        const response = await fetch('/cgi-bin/wx/integrated.sh?action=getwireless');
        if (!response.ok) {
            throw new Error('获取无线设置失败');
        }
        const data = await response.json();
        
        // 保存初始状态,转换布尔值为字符串
        initialWirelessSettings = {
            disabled_2g: data.disabled_2g === "true" ? "1" : "0",
            ssid_2g: data.ssid_2g,
            key_2g: data.key_2g,
            channel_2g: data.channel_2g,
            htmode_2g: data.htmode_2g,
            hidden_2g: data.hidden_2g === "true" ? "1" : "0",
            disabled_5g: data.disabled_5g === "true" ? "1" : "0",
            ssid_5g: data.ssid_5g,
            key_5g: data.key_5g,
            channel_5g: data.channel_5g,
            htmode_5g: data.htmode_5g,
            hidden_5g: data.hidden_5g === "true" ? "1" : "0"
        };
        // 输出log
        //console.log('获取到的状态:', initialWirelessSettings);
        
        // 设置2.4G表单值
        document.getElementById('status2g').value = initialWirelessSettings.disabled_2g;
        document.getElementById('ssid2g').value = initialWirelessSettings.ssid_2g;
        document.getElementById('key2g').value = initialWirelessSettings.key_2g;
        document.getElementById('channel2g').value = initialWirelessSettings.channel_2g;
        document.getElementById('htmode2g').value = initialWirelessSettings.htmode_2g;
        document.getElementById('hidden2g').value = initialWirelessSettings.hidden_2g;
        
        // 设置5G表单值
        document.getElementById('status5g').value = initialWirelessSettings.disabled_5g;
        document.getElementById('ssid5g').value = initialWirelessSettings.ssid_5g;
        document.getElementById('key5g').value = initialWirelessSettings.key_5g;
        document.getElementById('channel5g').value = initialWirelessSettings.channel_5g;
        document.getElementById('htmode5g').value = initialWirelessSettings.htmode_5g;
        document.getElementById('hidden5g').value = initialWirelessSettings.hidden_5g;
        
        // 根据状态显示/隐藏设置
        toggleWifiSettings('2g');
        toggleWifiSettings('5g');

        // 在设置完值后立即初始化状态样式
        initStatusSelectHandlers();

    } catch (error) {
        showToast('获取无线设置失败: ' + error.message);
    } finally {
        hideLoading();
        setLoadingText();
    }
}

/**
 * 保存无线设置
 * 验证设置,检查变更,显示确认弹窗
 */
async function saveWirelessSettings() {
    // 点击音效
    playSound(clickSound);
    // 验证设置
    if (!validateWirelessSettings()) {
        return;
    }

    // 获取所有设置值
    const settings = {
        // 2.4G设置
        disabled_2g: document.getElementById('status2g').value === "1",
        ssid_2g: document.getElementById('ssid2g').value,
        key_2g: document.getElementById('key2g').value,
        channel_2g: document.getElementById('channel2g').value,
        htmode_2g: document.getElementById('htmode2g').value,
        hidden_2g: document.getElementById('hidden2g').value === "1",
        // 5G设置
        disabled_5g: document.getElementById('status5g').value === "1",
        ssid_5g: document.getElementById('ssid5g').value,
        key_5g: document.getElementById('key5g').value,
        channel_5g: document.getElementById('channel5g').value,
        htmode_5g: document.getElementById('htmode5g').value,
        hidden_5g: document.getElementById('hidden5g').value === "1"
    };

    // 检查设置是否有变化
    const changes = {};
    let hasChanges = false;

    // 比较并记录变化的设置
    Object.entries(settings).forEach(([key, value]) => {
        const initialValue = key.includes('disabled') || key.includes('hidden') 
            ? initialWirelessSettings[key] === "1"
            : initialWirelessSettings[key];
            
        if (value !== initialValue) {
            changes[key] = value;
            hasChanges = true;
            console.log(`${key} 变化:`, initialValue, '->', value);
        }
    });

    // 如果没有变化则提示并返回
    if (!hasChanges) {
        showToast('无线配置未发生变化', 'info');
        return;
    }

    // 显示确认弹窗
    const dialog = document.getElementById('wirelessSaveConfirmDialog');
    if (dialog) {
        dialog.dataset.changes = JSON.stringify(changes);
        dialog.classList.remove('hidden');
        dialog.classList.remove('closing');
    }
}

/**
 * 关闭无线设置保存确认弹窗
 */
function closeWirelessSaveConfirmDialog() {
    const dialog = document.getElementById('wirelessSaveConfirmDialog');
    if (dialog) {
        dialog.classList.add('closing');
        setTimeout(() => {
            dialog.classList.add('hidden');
            dialog.classList.remove('closing');
        }, 300);
    }
}

/**
 * 确认保存无线设置
 * 发送变更到后端并处理响应
 */
async function confirmWirelessSave() {
    closeWirelessSaveConfirmDialog(); // 关闭弹窗
    
    try {
        showLoading(); // 显示加载动画
        setLoadingText('保存无线设置中...');

        // 从弹窗元素中获取变化的设置
        const dialog = document.getElementById('wirelessSaveConfirmDialog'); // 获取弹窗元素
        const changes = JSON.parse(dialog.dataset.changes); // 获取变化的设置
        //console.log('提交的内容:', changes);
        // 发送变更到后端
        const response = await fetch('/cgi-bin/wx/integrated.sh?action=savewireless', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json' // 设置请求头
            },
            body: JSON.stringify(changes) // 发送变化的设置
        });
        
        // 检查响应状态
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || '保存设置失败');
        }
        
        // 解析响应结果
        const result = await response.json();
        if (result.status !== 'success') {
            throw new Error(result.message || '保存设置失败');
        }

        showToast('保存成功', 'success');
        // 重新获取设置以更新初始状态
        await fetchWirelessSettings();
    } catch (error) {
        console.error('保存设置失败:', error);
        showToast(`保存失败: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

/**
 * 切换WiFi设置显示状态
 * @param {string} band - 频段('2g'或'5g')
 */
function toggleWifiSettings(band) {
    const status = document.getElementById(`status${band}`).value;
    const settings = document.getElementById(`settings${band}`);
    settings.style.display = status === '0' ? 'block' : 'none';
}

/**
 * 验证无线设置输入
 * 检查必填项和输入值的有效性
 * @returns {boolean} 验证是否通过
 */
function validateWirelessSettings() {
    const settings = {
        '2g': {
            status: document.getElementById('status2g').value,
            ssid: document.getElementById('ssid2g').value,
            key: document.getElementById('key2g').value,
            channel: document.getElementById('channel2g').value,
            htmode: document.getElementById('htmode2g').value,
            hidden: document.getElementById('hidden2g').value
        },
        '5g': {
            status: document.getElementById('status5g').value,
            ssid: document.getElementById('ssid5g').value,
            key: document.getElementById('key5g').value,
            channel: document.getElementById('channel5g').value,
            htmode: document.getElementById('htmode5g').value,
            hidden: document.getElementById('hidden5g').value
        }
    };

    // 检查是否至少有一个无线开启
    if (settings['2g'].status === "1" && settings['5g'].status === "1") {
        showToast('至少需要开启一个无线网络');
        return false;
    }

    // 验证每个频段的设置
    for (const [band, config] of Object.entries(settings)) {
        if (config.status === "0") {  // 如果该频段开启
            if (!config.ssid.trim()) {
                showToast(`请输入${band.toUpperCase()} WiFi名称`);
                return false;
            }
            if (!config.key.trim()) {
                showToast(`请输入${band.toUpperCase()} WiFi密码`);
                return false;
            }
            if (config.key.length < 8) {
                showToast(`${band.toUpperCase()} WiFi密码不能少于8位`);
                return false;
            }
            if (config.key.length > 63) {
                showToast(`${band.toUpperCase()} WiFi密码不能超过63位`);
                return false;
            }
            if (!config.channel) {
                showToast(`请选择${band.toUpperCase()}信道`);
                return false;
            }
            if (!config.htmode) {
                showToast(`请选择${band.toUpperCase()}带宽`);
                return false;
            }
            if (config.hidden === undefined || config.hidden === "") {
                showToast(`请选择${band.toUpperCase()}是否隐藏`);
                return false;
            }
        }
    }
    return true; // 验证通过
}

// 添加状态选择框变化监听
function initStatusSelectHandlers() {
    const status2g = document.getElementById('status2g');
    const status5g = document.getElementById('status5g');

    function handleStatusChange(select) {
        if (select.value === "1") {
            select.classList.add('disabled');
        } else {
            select.classList.remove('disabled');
        }
    }

    if (status2g) {
        // 添加change事件监听
        status2g.addEventListener('change', () => handleStatusChange(status2g));
        // 初始化时立即检查状态
        handleStatusChange(status2g);
    }
    
    if (status5g) {
        // 添加change事件监听
        status5g.addEventListener('change', () => handleStatusChange(status5g));
        // 初始化时立即检查状态
        handleStatusChange(status5g);
    }
}

