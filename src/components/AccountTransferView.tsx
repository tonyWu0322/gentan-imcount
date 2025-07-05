import React, { useState, useContext, FC } from 'react';
import { Todo } from '../types';
import { TimeAccountsContext } from '../contexts/TimeAccountsContext';

interface AccountTransferViewProps {
  allAccountNames: string[];
  todos: Todo[];
  renameAccount: (oldName: string, newName: string) => void;
  deleteAccount: (accountName: string) => void;
  addTimeLogEntry: (details: {
    type: 'transfer';
    fromAccount: string;
    toAccount: string;
    transferAmount: number;
  }) => void;
  completedMonuments: string[];
  archiveMonument: (monumentId: string) => void;
  getAccountType: (accountName: string) => string;
  getAccountDisplayName: (accountName: string) => string;
  isManageable: (accountName: string) => boolean;
}

export const AccountTransferView: FC<AccountTransferViewProps> = ({ allAccountNames, todos, renameAccount, deleteAccount, addTimeLogEntry, completedMonuments, archiveMonument, getAccountType, getAccountDisplayName, isManageable }) => {
  const context = useContext(TimeAccountsContext);
  if (!context) {
    throw new Error('AccountTransferView must be used within a TimeAccountsContext.Provider');
  }
  const { timeAccounts, setTimeAccounts, formatTime } = context;
  const [fromAccount, setFromAccount] = useState<string>('');
  const [toAccount, setToAccount] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [editingAccountName, setEditingAccountName] = useState<string | null>(null);
  const [newAccountName, setNewAccountName] = useState<string>('');
  const [filter, setFilter] = useState('all');
  const [showCompleted, setShowCompleted] = useState(false);

  const filteredAccounts = Object.keys(timeAccounts)
    .filter(name => {
      const isMonument = name.startsWith('纪念碑 -');
      const isCompleted = completedMonuments.includes(name);
      
      if(isMonument && isCompleted && !showCompleted) {
          return false;
      }
      
      if (filter === 'all') return true;
      return getAccountType(name) === filter;
    })
    .sort();

  // 模拟 T 字表数据，显示最近一次结转
  const [tAccountDebit, setTAccountDebit] = useState<{ account: string; amount: number }[]>([]);
  const [tAccountCredit, setTAccountCredit] = useState<{ account: string; amount: number }[]>([]);

  // 处理时间结转
  const handleTransfer = () => {
    if (!fromAccount || !toAccount || !amount) {
      setMessage('请选择来源账户、目标账户并输入时间。');
      return;
    }
    const transferAmount = parseInt(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      setMessage('时间量必须是正整数。');
      return;
    }
    if (fromAccount === toAccount) {
      setMessage('来源账户和目标账户不能相同。');
      return;
    }
    if (timeAccounts[fromAccount] < transferAmount) {
      setMessage(`来源账户 (${fromAccount}) 时间不足以结转 ${formatTime(transferAmount)}。`);
      return;
    }

    setTimeAccounts((prevAccounts) => {
      const newAccounts = { ...prevAccounts };
      newAccounts[fromAccount] -= transferAmount; // 贷出 (减少)
      newAccounts[toAccount] = (newAccounts[toAccount] || 0) + transferAmount;   // 借入 (增加)
      return newAccounts;
    });
    
    // 记录结转日志
    addTimeLogEntry({
      type: 'transfer',
      fromAccount,
      toAccount,
      transferAmount
    });

    // 更新 T 字表模拟数据
    setTAccountDebit([{ account: toAccount, amount: transferAmount }]);
    setTAccountCredit([{ account: fromAccount, amount: transferAmount }]);

    setMessage(`成功将 ${formatTime(transferAmount)} 从 ${fromAccount} 结转到 ${toAccount}。`);
    // 清空表单
    setFromAccount('');
    setToAccount('');
    setAmount('');
    setTimeout(() => setMessage(''), 3000); // 3秒后清除消息
  };

  const handleStartEditing = (accountName: string) => {
    setEditingAccountName(accountName);
    setNewAccountName(getAccountDisplayName(accountName));
  };

  const handleCancelEditing = () => {
    setEditingAccountName(null);
    setNewAccountName('');
  };

  const handleSaveEditing = (oldName: string) => {
    renameAccount(oldName, newAccountName);
    handleCancelEditing();
  };

  const getAccountBgColor = (accountName: string): string => {
    const isDark = document.documentElement.classList.contains('dark');
    switch (getAccountType(accountName)) {
      case 'todo': return isDark ? 'bg-blue-900 hover:bg-blue-800' : 'bg-blue-50 hover:bg-blue-100';
      case 'monument': return isDark ? 'bg-emerald-900 hover:bg-emerald-800' : 'bg-emerald-50 hover:bg-emerald-100';
      case 'system': return isDark ? 'bg-purple-900 hover:bg-purple-800' : 'bg-purple-50 hover:bg-purple-100';
      default: return isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100';
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-6xl mx-auto">
      {/* 左侧：账户列表与管理 */}
      <div className="w-full lg:w-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-3xl font-bold text-indigo-700 dark:text-indigo-400">账户列表</h2>
          <div className="relative">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="appearance-none bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md py-2 pl-3 pr-8 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">所有账户</option>
              <option value="todo">待办账户</option>
              <option value="monument">纪念碑</option>
              <option value="system">系统账户</option>
              <option value="general">通用账户</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-400">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
          </div>
          <label className="flex items-center text-sm text-gray-600 dark:text-gray-300">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
              className="mr-2 h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
            />
            显示已归档纪念碑
          </label>
        </div>
        <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-22rem)] pr-2">
          {filteredAccounts.map((accountName) => {
            const isCompleted = completedMonuments.includes(accountName);

            return (
              <div key={accountName} className={`flex justify-between items-center p-3 rounded-lg ${getAccountBgColor(accountName)}`}>
                {editingAccountName === accountName ? (
                  <div className="flex-grow flex items-center gap-2">
                    <input
                      type="text"
                      value={newAccountName}
                      onChange={(e) => setNewAccountName(e.target.value)}
                      className="flex-grow px-2 py-1 border border-indigo-300 dark:border-indigo-500 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:text-white"
                      autoFocus
                      onKeyPress={(e) => { if (e.key === 'Enter') handleSaveEditing(accountName); }}
                    />
                    <button onClick={() => handleSaveEditing(accountName)} className="p-1 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300" title="保存">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    </button>
                    <button onClick={handleCancelEditing} className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" title="取消">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="font-medium text-gray-700 dark:text-gray-200 flex-grow">
                      {isCompleted && <span className="text-gray-400 dark:text-gray-500">[已归档] </span>}
                      {getAccountDisplayName(accountName)}
                    </span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 mr-4">
                      {formatTime(timeAccounts[accountName])}
                    </span>
                    
                    <div className="flex items-center space-x-1">
                      {isManageable(accountName) && (
                        <>
                          <button onClick={() => handleStartEditing(accountName)} title="重命名" className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 rounded-full transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z"></path></svg>
                          </button>
                          <button onClick={() => deleteAccount(accountName)} title="删除" className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 rounded-full transition-colors">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm6 0a1 1 0 11-2 0v6a1 1 0 112 0V8z" clipRule="evenodd"></path></svg>
                          </button>
                        </>
                      )}
                      {getAccountType(accountName) === 'monument' && !isCompleted && (
                        <button onClick={() => archiveMonument(accountName)} title="归档纪念碑" className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 rounded-full transition-colors">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path></svg>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 右侧：结转操作 */}
      <div className="w-full lg:w-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 flex flex-col">
        <h2 className="text-3xl font-bold text-indigo-700 dark:text-indigo-400 mb-6 text-center">
          执行时间结转
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-center">
          （例如：将"编写代码"的时间结转到"纪念碑 - 核心原型完成"）
        </p>
        <div className="space-y-4 flex-grow">
          <div>
            <label htmlFor="fromAccount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              来源账户 (贷方 - 时间减少):
            </label>
            <select
              id="fromAccount"
              value={fromAccount}
              onChange={(e) => setFromAccount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
            >
              <option value="">选择账户</option>
              {allAccountNames.filter(name =>
                !name.startsWith('纪念碑 -') &&
                !name.includes('休息时间') &&
                !name.includes('默认损失')
              ).map((name) => {
                const displayedName = name.startsWith('Todo-')
                  ? todos.find(t => t.id === name)?.text || name
                  : name;
                return (
                  <option key={name} value={name}>
                    {displayedName} (当前: {formatTime(timeAccounts[name])})
                  </option>
                );
              })}
            </select>
          </div>
          <div>
            <label htmlFor="toAccount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              目标账户 (借方 - 时间增加):
            </label>
            <select
              id="toAccount"
              value={toAccount}
              onChange={(e) => setToAccount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
            >
              <option value="">选择账户</option>
              {allAccountNames.filter(name =>
                !name.includes('未分配') &&
                !name.includes('休息时间') &&
                !name.includes('无效消耗') &&
                !name.includes('默认损失')
              ).map((name) => {
                const displayedName = name.startsWith('Todo-')
                  ? todos.find(t => t.id === name)?.text || name
                  : name;
                return (
                  <option key={name} value={name}>
                    {displayedName}
                  </option>
                );
              })}
            </select>
          </div>
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              结转时间 (秒):
            </label>
            <input
              type="number"
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
              placeholder="例如: 3600 (1小时)"
              min="1"
            />
          </div>
        </div>
        <button
          onClick={handleTransfer}
          className="w-full py-3 px-4 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 dark:hover:bg-purple-500 transition duration-300 ease-in-out mt-4"
        >
          执行结转
        </button>
        {message && (
          <p className="mt-4 text-center text-sm font-medium text-gray-700 dark:text-gray-300 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}; 