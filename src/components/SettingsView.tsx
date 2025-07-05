import React, { FC, useState, useEffect } from 'react';

interface PomodoroSettings {
  focusTime: number;
  breakTime: number;
}

interface SettingsViewProps {
  settings: PomodoroSettings;
  onSettingsChange: (newSettings: PomodoroSettings) => void;
  notificationPermission: string;
  onRequestNotificationPermission: () => void;
  onExport: () => void;
  onImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
  theme: string;
  setTheme: (theme: string) => void;
}

export const SettingsView: FC<SettingsViewProps> = ({ settings, onSettingsChange, notificationPermission, onRequestNotificationPermission, onExport, onImport, theme, setTheme }) => {
  const [localSettings, setLocalSettings] = useState<PomodoroSettings>(settings);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
    setHasChanges(false);
  }, [settings]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLocalSettings(prev => ({ ...prev, [name]: parseInt(value, 10) * 60 }));
    setHasChanges(true);
  };

  const handleSave = () => {
    onSettingsChange(localSettings);
    setHasChanges(false);
  };

  return (
    <div className="flex flex-col items-center max-w-xl mx-auto bg-white rounded-lg shadow-md p-8">
      <h2 className="text-3xl font-bold text-indigo-700 mb-8 text-center">
        用户信息与设置
      </h2>
      <p className="text-lg text-gray-700 mb-6 text-center">
        此页面用于管理您的账户信息、个性化设置以及应用偏好。
      </p>
      <div className="w-full space-y-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-xl font-semibold text-gray-800 mb-2">账户设置</h3>
          <p className="text-gray-600">用户名: 测试用户</p>
          <p className="text-gray-600">邮箱: user@example.com</p>
          <button className="mt-4 px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition">
            修改资料
          </button>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-xl font-semibold text-gray-800 mb-2">数据管理</h3>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">备份与恢复:</span>
            <div className="flex space-x-2">
              <button
                onClick={onExport}
                className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition text-sm font-semibold"
              >
                导出数据
              </button>
              <label className="px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 transition text-sm font-semibold cursor-pointer">
                导入数据
                <input type="file" accept=".json" className="hidden" onChange={onImport} />
              </label>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">应用偏好</h3>
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-300">主题模式:</span>
            <div className="flex rounded-lg bg-gray-200 dark:bg-gray-600 p-1">
              <button
                onClick={() => setTheme('light')}
                className={`px-3 py-1 text-sm font-semibold rounded-md transition ${theme === 'light' ? 'bg-white dark:bg-gray-400 text-indigo-700 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}
              >
                亮色
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`px-3 py-1 text-sm font-semibold rounded-md transition ${theme === 'dark' ? 'bg-white dark:bg-gray-400 text-indigo-700 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}
              >
                暗色
              </button>
              <button
                onClick={() => setTheme('system')}
                className={`px-3 py-1 text-sm font-semibold rounded-md transition ${theme === 'system' ? 'bg-white dark:bg-gray-400 text-indigo-700 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}
              >
                跟随系统
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between mt-4">
            <span className="text-gray-600 dark:text-gray-300">桌面通知:</span>
            <button
              onClick={onRequestNotificationPermission}
              disabled={notificationPermission === 'granted'}
              className={`px-3 py-1 rounded-md text-sm font-semibold
                ${notificationPermission === 'granted' ? 'bg-green-200 text-green-800' : ''}
                ${notificationPermission !== 'granted' ? 'bg-blue-200 text-blue-800 hover:bg-blue-300' : ''}
              `}
            >
              {notificationPermission === 'granted' ? '通知已启用' : '启用通知'}
            </button>
          </div>
          <div className="mt-4">
            <h4 className="text-lg font-medium text-gray-700 dark:text-gray-200 mb-2">番茄钟时长 (分钟)</h4>
            <div className="flex items-center justify-between mt-2">
              <label htmlFor="focusTime" className="text-gray-600 dark:text-gray-300">专注时间:</label>
              <input
                type="number"
                id="focusTime"
                name="focusTime"
                value={localSettings.focusTime / 60}
                onChange={handleInputChange}
                className="w-20 px-2 py-1 border border-gray-300 rounded-md text-center bg-white dark:bg-gray-600 dark:text-white dark:border-gray-500"
                min="1"
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <label htmlFor="breakTime" className="text-gray-600 dark:text-gray-300">休息时间:</label>
              <input
                type="number"
                id="breakTime"
                name="breakTime"
                value={localSettings.breakTime / 60}
                onChange={handleInputChange}
                className="w-20 px-2 py-1 border border-gray-300 rounded-md text-center bg-white dark:bg-gray-600 dark:text-white dark:border-gray-500"
                min="1"
              />
            </div>
            {hasChanges && (
              <div className="mt-4 text-right">
                <button
                  onClick={handleSave}
                  className="px-5 py-2 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-600 transition"
                >
                  保存设置
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <p className="mt-6 text-sm text-gray-500 text-center">
        （更多高级设置将在后续版本中添加。）
      </p>
    </div>
  );
}; 