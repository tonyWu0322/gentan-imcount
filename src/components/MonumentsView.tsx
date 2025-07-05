import React, { useState, useContext, FC } from 'react';
import { TimeAccountsContext } from '../contexts/TimeAccountsContext';

interface MonumentsViewProps {
  showAlert: (title: string, content: string) => void;
}

export const MonumentsView: FC<MonumentsViewProps> = ({ showAlert }) => {
  const context = useContext(TimeAccountsContext);
  if (!context) {
    throw new Error('MonumentsView must be used within a TimeAccountsContext.Provider');
  }
  const { timeAccounts, formatTime, timeUnitForGrowth, addMonumentAccount } = context;
  const [newMonumentName, setNewMonumentName] = useState<string>('');

  // 筛选出所有纪念碑子科目
  const monumentSubAccounts = Object.entries(timeAccounts).filter(([name]) =>
    name.startsWith('纪念碑 -')
  );

  // 计算所有纪念碑子科目的总时间
  const totalMonumentTime = monumentSubAccounts.reduce((sum, [, time]) => sum + (time as number), 0); // 明确类型断言

  const handleAddMonument = () => {
    if (newMonumentName.trim()) {
      const success = addMonumentAccount(newMonumentName.trim());
      if (success) {
        setNewMonumentName('');
      }
    } else {
      showAlert('创建失败', '请输入纪念碑名称！');
    }
  };

  return (
    <div className="flex flex-col items-center max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
      <h2 className="text-3xl font-bold text-indigo-700 dark:text-indigo-400 mb-8 text-center">
        我的纪念碑 (功能待完善)
      </h2>
      <p className="text-lg text-gray-700 dark:text-gray-300 mb-6 text-center">
        "纪念碑"是您所有投入时间最终转化为的回报或成就的集合。您可以自定义不同的纪念碑来反映您的产出。
      </p>

      {/* 添加新的纪念碑子科目 */}
      <div className="w-full mb-8 p-4 bg-blue-50 dark:bg-gray-700 rounded-lg shadow-sm">
        <h3 className="text-xl font-bold text-blue-700 dark:text-blue-400 mb-4 text-center">
          添加新的纪念碑子科目
        </h3>
        <div className="flex">
          <input
            type="text"
            className="flex-grow px-4 py-2 border border-blue-300 dark:border-blue-600 rounded-l-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-600 text-gray-800 dark:text-gray-100"
            placeholder="例如: 编写的开源库, 考取的证书, 完成的课程"
            value={newMonumentName}
            onChange={(e) => setNewMonumentName(e.target.value)}
            onKeyPress={(e) => { if (e.key === 'Enter') handleAddMonument(); }}
          />
          <button
            onClick={handleAddMonument}
            className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-r-lg hover:bg-blue-700 dark:hover:bg-blue-500 transition duration-300 ease-in-out"
          >
            创建纪念碑
          </button>
        </div>
      </div>

      {/* 纪念碑总计可视化 */}
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-indigo-700 dark:text-indigo-400 mb-4">
          总计产出时间纪念碑
        </h3>
        <div className="relative mb-4 flex items-center justify-center">
          <div
            className="bg-gray-300 dark:bg-gray-600 rounded-lg transform rotate-45"
            style={{
              width: `${Math.min(200, Math.floor(totalMonumentTime / timeUnitForGrowth) * 10 + 50)}px`,
              height: `${Math.min(200, Math.floor(totalMonumentTime / timeUnitForGrowth) * 10 + 50)}px`,
              backgroundColor: `hsl(210, 70%, ${Math.min(70, (Math.floor(totalMonumentTime / timeUnitForGrowth) * 10 + 50) / 2.8)}%)`,
              boxShadow: `0px 8px 20px rgba(0,0,0,0.3), inset 0px 0px 15px rgba(255,255,255,0.4)`
            }}
          ></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-white text-3xl font-extrabold rotate-[-45deg]">
              总计
            </span>
          </div>
        </div>
        <p className="text-2xl font-bold text-indigo-800 dark:text-indigo-300">
          总计产出时间: {formatTime(totalMonumentTime)}
        </p>
      </div>

      {/* 各个纪念碑子科目列表 */}
      <div className="w-full bg-gray-50 dark:bg-gray-700 rounded-lg p-6 mt-6">
        <h3 className="text-xl font-bold text-indigo-700 dark:text-indigo-400 mb-4 text-center">
          我的纪念碑子科目
        </h3>
        {monumentSubAccounts.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400">
            暂无纪念碑子科目。创建第一个吧！
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {monumentSubAccounts.map(([name, time]) => (
              <div key={name} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-800 dark:text-gray-100 text-lg">
                    {name.replace('纪念碑 - ', '')}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    已投入: {formatTime(time as number)}
                  </p>
                </div>
                {/* 简单的进度条或小图标作为子科目可视化 */}
                <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center bg-emerald-100 dark:bg-emerald-900 rounded-full">
                  <span className="text-emerald-600 dark:text-emerald-400 text-3xl">🏆</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="w-full bg-gray-50 dark:bg-gray-700 rounded-lg p-6 mt-6">
        <h3 className="text-xl font-bold text-indigo-700 dark:text-indigo-400 mb-4 text-center">
          时间报表 (待扩展)
        </h3>
        <p className="text-gray-600 dark:text-gray-300 text-center">
          此处将显示更详细的时间分析报表，例如：
        </p>
        <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 mt-2 text-center">
          <li>时间资产负债表</li>
          <li>投入产出比分析</li>
          <li>各任务时间趋势图</li>
        </ul>
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-center">
          （该功能将在未来版本中完善，以提供更深入的数据洞察。）
        </p>
      </div>
    </div>
  );
}; 