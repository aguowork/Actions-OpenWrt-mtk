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
    // 设置超时时间为 60 秒
    const timeout = 60000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            },
            signal: controller.signal,
            cache: 'reload'
        };
        if (body) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);
        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorStatus = response.status;
            let errorMessage;
            switch (errorStatus) {
                case 404:
                    errorMessage = '请求的资源不存在';
                    break;
                case 500:
                    errorMessage = '服务器内部错误，请稍后重试';
                    break;
                case 502:
                    errorMessage = '网关错误，请检查网络连接';
                    break;
                case 503:
                    errorMessage = '服务暂时不可用，请稍后重试';
                    break;
                case 504:
                    errorMessage = '网关超时，请检查网络连接';
                    break;
                default:
                    errorMessage = `请求失败 (${errorStatus})，请稍后重试`;
            }
            throw new Error(errorMessage);
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


// 添加播放音效的函数
function playClickSound() {
    // 重置音频播放位置到开始
    clickSound.currentTime = 0;
    // 播放音效
    clickSound.play().catch(error => {
        console.log('音效播放失败:', error);
    });
}

// 密码验证函数
async function validatePassword(event) {
    if (event.key === 'Enter' || event.type === 'click') {
        playClickSound(); // 添加音效
        const password = document.getElementById('password').value;
        if (password === 'admin') {
            // 添加淡出动画
            const loginContainer = document.getElementById('loginContainer');
            if (loginContainer) {
                loginContainer.classList.add('fade-out');
                setTimeout(() => {
                    loginContainer.style.display = 'none';
                    // 显示主容器并添加淡入动画
                    const mainContainer = document.getElementById('mainContainer');
                    if (mainContainer) {
                        mainContainer.style.display = 'flex';
                        mainContainer.classList.add('fade-in');
                    }
                }, 300);
            }
            // 只获取当前配置信息
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
            listContainer.innerHTML = ''; // 清空现有列表

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
        showToast('请选择要删除的热点');
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
    playClickSound();
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

    // 检查频段
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

// 关闭保确认弹窗
function closeSaveConfirmDialog() {
    playClickSound(); // 添加音效
    const dialog = document.getElementById('saveConfirmDialog');
    if (dialog) {
        dialog.classList.add('closing');
        setTimeout(() => {
            dialog.classList.add('hidden');
            dialog.classList.remove('closing');
        }, 300);
    }
}

// 修改保存配置函数
async function saveConfig() {
    playClickSound(); // 添加音效
    // 检查前端WIFI名称、频段、加密类型、密码是否有效，无效则直接返回
    if (!isConfigInputValid()) {
        return;
    }

    // 获取当前配置的接口名称 
    const currentInterface = document.getElementById('currentInterface').textContent;
    // 检查接口名称是否包含"不存在"或为空
    console.log('接口名称：',currentInterface);
    if (!currentInterface || currentInterface.includes('不存在')) {
        alert('未获取到效的中继接口，无法执行中继');
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
    playClickSound();
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
        console.log('WiFi 写入JSON配置完成');

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
}

// 获取当前中继配置状态
async function fetchCurrentConfig() {
    // 显示加载动画
    showLoading();
    setLoadingText('加载配置中...'); // 设置专门的加载文本
    
    try {
        const data = await fetchData('/cgi-bin/wx/integrated.sh?action=getconfig');
        if (data) {
            document.getElementById('currentSSID').textContent = data.ssid;
            // ���改密码显示 - 统一显示emoji
            const keyElement = document.getElementById('currentKEY');
            keyElement.dataset.password = data.key; // 存储实际密码
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
        showToast('获取配置失败，请检查网络连接', 'error');
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
    playClickSound();
    const statusElement = document.getElementById('autoSwitchStatus');
    statusElement.textContent = '';

    try {
        const response = await fetch('/cgi-bin/wx/integrated.sh?action=autowifi');

        if (!response.ok) {
            throw new Error(`自动切换失败 (${response.status})`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let output = '';

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            output += chunk;
            statusElement.textContent = output;

            // 确保滚动到底部
            requestAnimationFrame(() => {
                statusElement.scrollTop = statusElement.scrollHeight;
            });

            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        statusElement.textContent += '\n运行结束';
        requestAnimationFrame(() => {
            statusElement.scrollTop = statusElement.scrollHeight;
        });
        playClickSound();

    } catch (error) {
        console.error('自动切换失败:', error);
        statusElement.textContent = `自动切换失败: ${error.message}\n请检查网络连接或设备状态`;
        playClickSound();
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
    playClickSound(); // 添加音效
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
    playClickSound(); // 添加音效
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

// 修改自动切换定时函数
function autoSwitchTimer() {
    //playClickSound(); // 添加音效
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
        passwordContainer.style.display = 'none';  // 默认隐藏密码框
    }
}

// 修改导航切换逻辑
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', async function() {
            playClickSound(); // 添加音效
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
                        // 当前��置页面只需要获取当前状态
                        await fetchCurrentConfig();
                        break;
                    case 'configContainer':
                        // 重置表
                        resetConfigForm();
                        break;
                    case 'manageContainer':
                        // 热点管理页面需要更新WiFi列表
                        await updateWiFiList();
                        break;
                    case 'autoSwitchPage':
                        // 自动换页面清空状态
                        const statusElement = document.getElementById('autoSwitchStatus');
                        if (statusElement) {
                            const messagesvlaue = [
                                "自动切换会断开WiFi连接，输出错误是正常的",
                                "自动/定时模式，都需要有 2+ 已知热点",
                                "程序只支持设备是\"中继模式\"下运行",
                                "定时检测模式，输入 0 则是关闭",
                                "定时检测模式，断网后会切换热点",
                                "PC端有线连接路由，自动切换不会报错",
                                "当前配置，点一次刷新一次",
                                "当前配置，热点连接成功，状态连接成功",
                                "当前配置，网络正常，网络连接成功",
                                "连接失败，可能是密码、频段、安全性不对",
                                "uhttpd默认60秒超时",
                                "前端操作只能执行60秒就被强制结束",
                                "修改uhttpd超时时间，可ssh执行一下",
                                "uci set uhttpd.main.script_timeout='600'"
                              ];
                              
                              // 使用 join() 方法将数组项连接成一个字符串，并用换行符分隔
                              statusElement.textContent = messagesvlaue.join('\n');
                              
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
            
            playClickSound(); // 添加音效
            // 只刷新当前配置信息
            fetchCurrentConfig();
        }, 300);
    }
}

// 添加点击 emoji 效果
document.addEventListener('DOMContentLoaded', function() {
    // emoji 数组
    const emojis = ['🐁','🐂','🐖','🐅','🦁','🐔','🐉','🌟','✨','💫','⭐','🍎','🍅','🎂','👍','😀','😁','🌕️','🌜','🤪','🤗','🤔','🎠','😀','😃','😄','😁','😆','😅','😂','🤣','😊','😚','😙','😗','😘','😍','😌','😉','🤗','🙂','😇','😋','😜','😝','😛','🤑','🤗','','😎','🤡','🤠','😖','😣','🐷','😎','😕','😴','😺','😬','😒','😏','😫','😩','😤','😠','😡','😶','😐','💌','😯','😦','😥','😢','😨','😱','😵','😲','😮','😦','🤤','😭','😪','😴','🙄','😬','🤥','🤐','👺','🫡','🤫','😈','🤩','🤒','😷','🤧','🤪','👻','😉','🐽','😉','🥰','🤖','🥹','😺','😸','😹','🤭','👏','😭','🫣','😾','😿','🙀','😽','😼','😻','❤','💖','','💕','🐶','🐐','🦢','🤓','🖕','😘','🥱','🌞','💩','🤣'];    
    
    // 添加点击事件监听器，但排除label和input元素
    document.addEventListener('click', function(e) {
        // 如果点击的是复选框、label、input或select元素，则不创建emoji
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

// 添加延迟显示加载动画的功能
let loadingTimer;

function showLoading() {
    // 清除可能存在的定时器
    if (loadingTimer) {
        clearTimeout(loadingTimer);
    }
    // 延迟 100ms 显示加载动画，避免操作太快时的闪烁
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
        "PC端有线连接路由，自动切换不会报错",
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
        // 将文本中的换行符替换为 <br> 标签
        tipElement.innerHTML = tips[currentTipIndex].replace(/\n/g, '<br>');
    }

    setInterval(showNextTip, 3000); // 每3秒切换一次
});

// 修改 showToast 函数,将显示时间改为2秒
function showToast(message, type = 'error') {
    // 移除所有现有的 toast
    document.querySelectorAll('.toast').forEach(t => t.remove()); 
    
    const toast = document.createElement('div'); 
    toast.className = `toast ${type}`; 
    toast.textContent = message; 
    document.body.appendChild(toast); 
    
    // 添加显示类
    requestAnimationFrame(() => {
        toast.classList.add('show');
        toast.style.animation = 'toastIn 0.3s ease forwards'; // 这个0.3s是淡入动画时间
    });
    
    // 2秒后开始淡出动画
    setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s ease forwards'; // 这个0.3s是淡出动画时间
        setTimeout(() => {
            toast.remove();
        }, 300); // 改为300ms 这个300ms是淡出动画时间
    }, 2000); // 改为2000ms 这个2000ms是显示时间
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

