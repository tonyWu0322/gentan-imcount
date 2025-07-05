import React, { FC } from 'react';
import { TimeLog, Todo } from '../types';

interface TimeLogViewProps {
  timeLogs: TimeLog[];
  todos: Todo[];
  formatTime: (seconds: number) => string;
  clearTimeLogs: () => void;
}

export const TimeLogView: FC<TimeLogViewProps> = ({ timeLogs, todos, formatTime, clearTimeLogs }) => {
  // Helper to get display name for accounts
  const getAccountDisplayName = (accountId: string | undefined): string => {
    if (!accountId) {
      return "未知账户";
    }
    if (accountId.startsWith('Todo-')) {
      return todos.find(t => t.id === accountId)?.text || accountId;
    }
    return accountId;
  };

  // 新增：专门用于格式化结转时间量的函数
  const formatTransferAmount = (seconds: number): string => {
    if (seconds < 60) return `${seconds}秒`;
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    let result = '';
    if (hrs > 0) result += `${hrs}小时 `;
    if (mins > 0) result += `${mins}分钟 `;
    if (secs > 0) result += `${secs}秒`;
    return result.trim();
  };

  return (
    <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-indigo-700 dark:text-indigo-400">
          计时与结转日志
        </h2>
        {timeLogs.length > 0 && (
          <button
            onClick={clearTimeLogs}
            className="px-4 py-2 bg-red-500 text-white font-semibold rounded-lg shadow-md hover:bg-red-600 dark:hover:bg-red-500 transition duration-300 ease-in-out text-sm"
          >
            清除全部日志
          </button>
        )}
      </div>
      {timeLogs.length === 0 ? (
        <p className="text-center text-gray-500 dark:text-gray-400">暂无日志记录。</p>
      ) : (
        <ul className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
          {[...timeLogs].sort((a, b) => b.timestamp - a.timestamp).map((log) => (
            <li
              key={log.id}
              className={`p-4 rounded-lg shadow-sm
                ${log.type === 'timer' ? 'bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700' : 'bg-purple-50 dark:bg-purple-900 border border-purple-200 dark:border-purple-700'}
              `}
            >
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                {new Date(log.timestamp).toLocaleString()}
              </p>
              {log.type === 'timer' ? (
                <div>
                  <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                    <span className="text-blue-700 dark:text-blue-400">[计时]</span> {log.taskText || log.taskId}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    总计: {formatTime((log.endTime! - log.startTime!) / 1000)}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                    <span className="text-purple-700 dark:text-purple-400">[结转]</span> 将 <span className="font-bold">{formatTransferAmount(log.transferAmount || 0)}</span> 从
                    <span className="font-bold"> {getAccountDisplayName(log.fromAccount)}</span> 结转到
                    <span className="font-bold"> {getAccountDisplayName(log.toAccount)}</span>
                  </p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
