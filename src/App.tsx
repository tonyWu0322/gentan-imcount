import React, { useState, useEffect, useRef, createContext, useContext, FC } from 'react';
// 注意：这里不再需要引入 CDN 脚本或 InjectStyles 组件。
// 因为 Tailwind CSS 会通过本地构建工具（如 Create React App 的 Webpack）进行编译和加载。

// 定义时间账户的类型
interface TimeAccounts {
  [key: string]: number;
}

// 定义待办任务的类型
interface Todo {
  id: string;
  text: string;
}

// 定义上下文的类型
interface TimeAccountsContextType {
  timeAccounts: TimeAccounts;
  setTimeAccounts: React.Dispatch<React.SetStateAction<TimeAccounts>>;
  formatTime: (seconds: number) => string;
  timeUnitForGrowth: number;
  addMonumentAccount: (name: string) => boolean;
}

// 创建一个上下文来管理时间账户数据
const TimeAccountsContext = createContext<TimeAccountsContextType | null>(null);

// 主要的应用组件
const App: FC = () => {
  // 定义时间账户的状态
  const [timeAccounts, setTimeAccounts] = useState<TimeAccounts>({
    '未分配时间 (Unallocated)': 18000, // 初始时间来源，设置为5小时（5 * 3600秒）
    '休息时间 (Rest Time)': 0,     // 番茄钟休息时间账户
    '学习会计 (Learn Accounting)': 0,
    '编写代码 (Coding Project)': 0,
    '阅读文档 (Reading Docs)': 0,
    '无效消耗 (Wasted Time)': 0,   // 时间损耗账户
    // 初始纪念碑子科目 (用户可自定义添加)
    '纪念碑 - 核心原型完成 (Core Proto Done)': 0,
  });

  // 待办任务列表，用于计时
  const [todos, setTodos] = useState<Todo[]>([
    { id: '学习会计 (Learn Accounting)', text: '完成会计原理学习' },
    { id: '编写代码 (Coding Project)', text: '开发复式记账法原型' },
    { id: '阅读文档 (Reading Docs)', text: '查阅 React 文档' },
  ]);

  // 当前激活的任务ID
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  // 当前番茄钟状态：'idle', 'focus', 'break'
  const [pomodoroState, setPomodoroState] = useState<'idle' | 'focus' | 'break'>('idle');
  // 番茄钟剩余时间 (秒)
  const [pomodoroRemainingTime, setPomodoroRemainingTime] = useState<number>(0);
  // 番茄钟设置
  const pomodoroSettings = {
    focusTime: 25 * 60, // 25 分钟专注
    breakTime: 5 * 60,  // 5 分钟休息
  };

  // 计时器ID
  const timerRef = useRef<NodeJS.Timeout | null>(null); // 明确计时器类型
  // 显示指导模态框
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  // 每个时间单位的树木增长视觉效果
  const timeUnitForGrowth: number = 60; // 60秒 = 1分钟，用于树木增长的单位

  // 导航栏当前视图
  const [currentView, setCurrentView] = useState<'timerTodo' | 'accountTransfer' | 'monuments' | 'settings'>('timerTodo'); // 默认为计时与待办界面

  // 计时器效果
  useEffect(() => {
    if (activeTaskId && pomodoroState !== 'idle') {
      // 每秒更新时间账户和番茄钟时间
      timerRef.current = setInterval(() => {
        setPomodoroRemainingTime((prevTime) => {
          // 如果未分配时间不足，则停止计时器
          if (timeAccounts['未分配时间 (Unallocated)'] <= 0 && prevTime > 0) {
            if (timerRef.current) { // 清除计时器前检查是否存在
              clearInterval(timerRef.current);
            }
            timerRef.current = null;
            setPomodoroState('idle');
            setActiveTaskId(null);
            alert('未分配时间不足，请补充或结束计时。');
            return 0;
          }

          if (prevTime <= 1) {
            // 时间到，切换番茄钟状态
            if (timerRef.current) { // 清除计时器前检查是否存在
              clearInterval(timerRef.current);
            }
            timerRef.current = null;

            if (pomodoroState === 'focus') {
              // 专注时间结束，进入休息
              setPomodoroState('break');
              setPomodoroRemainingTime(pomodoroSettings.breakTime);
              alert('专注时间结束！现在是休息时间。');
            } else if (pomodoroState === 'break') {
              // 休息时间结束，进入空闲
              setPomodoroState('idle');
              setPomodoroRemainingTime(0);
              setActiveTaskId(null); // 休息结束后停止任务关联
              alert('休息时间结束！准备开始下一个专注。');
            }
            return 0; // Prevent negative time
          } else {
            // 时间递减，并更新对应账户
            setTimeAccounts((prevAccounts) => {
              const newAccounts = { ...prevAccounts };
              // 从“未分配时间”贷出1秒，借入当前活跃账户1秒
              newAccounts['未分配时间 (Unallocated)'] = Math.max(0, newAccounts['未分配时间 (Unallocated)'] - 1);
              if (pomodoroState === 'focus') {
                newAccounts[activeTaskId] = (newAccounts[activeTaskId] || 0) + 1;
              } else if (pomodoroState === 'break') {
                newAccounts['休息时间 (Rest Time)'] = (newAccounts['休息时间 (Rest Time)'] || 0) + 1;
              }
              return newAccounts;
            });
            return prevTime - 1;
          }
        });
      }, 1000); // 每秒更新
    } else {
      // 停止计时器
      if (timerRef.current) { // 清除计时器前检查是否存在
        clearInterval(timerRef.current);
      }
    }

    // 清理函数：组件卸载时清除计时器
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [activeTaskId, pomodoroState, pomodoroRemainingTime, pomodoroSettings.focusTime, pomodoroSettings.breakTime, timeAccounts]); // 加上timeAccounts作为依赖，以便及时检查余额


  // 处理开始/停止番茄钟
  const handleStartPomodoro = (taskId: string) => {
    // 如果已有活跃任务，先停止
    if (activeTaskId && pomodoroState !== 'idle') {
      handleStopPomodoro(); // 确保旧任务时间入账
    }

    setActiveTaskId(taskId); // 关联到具体任务或'未分配时间'
    setPomodoroState('focus');
    setPomodoroRemainingTime(pomodoroSettings.focusTime);
  };

  const handleStopPomodoro = () => {
    // 停止当前番茄钟，并计算已用时间入账
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // 这里的逻辑已经通过每秒更新处理，所以无需在停止时再次分配大量时间
    // 仅需重置状态
    setPomodoroState('idle');
    setPomodoroRemainingTime(0);
    setActiveTaskId(null);
  };

  // 添加待办任务
  const addTodo = (text: string) => {
    const newId = `Todo-${Date.now()}`; // 为待办任务生成唯一ID
    setTodos([...todos, { id: newId, text }]);
    setTimeAccounts((prevAccounts) => ({ ...prevAccounts, [newId]: 0 })); // 为新待办添加账户
  };

  // 删除待办任务
  const deleteTodo = (id: string) => {
    setTodos(todos.filter(todo => todo.id !== id));
    setTimeAccounts((prevAccounts) => {
      const newAccounts = { ...prevAccounts };
      delete newAccounts[id]; // 删除对应账户
      return newAccounts;
    });
    if (activeTaskId === id) {
      handleStopPomodoro(); // 如果删除的是当前活跃任务，则停止计时
    }
  };

  // 添加纪念碑子科目
  const addMonumentAccount = (name: string): boolean => {
    const monumentId = `纪念碑 - ${name}`;
    if (timeAccounts[monumentId] !== undefined) {
      alert(`纪念碑科目 "${name}" 已经存在！`);
      return false;
    }
    setTimeAccounts((prevAccounts) => ({ ...prevAccounts, [monumentId]: 0 }));
    return true;
  };


  // 格式化时间显示 (秒 -> 小时:分钟:秒)
  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 确保上下文值不为空
  const contextValue = React.useMemo(() => ({
    timeAccounts,
    setTimeAccounts,
    formatTime,
    timeUnitForGrowth,
    addMonumentAccount
  }), [timeAccounts, formatTime, timeUnitForGrowth, addMonumentAccount]);


  return (
    // 使用Context Provider包裹整个应用，以便子组件访问时间账户数据
    <TimeAccountsContext.Provider value={contextValue}>
      <div className="min-h-screen bg-gray-100 font-inter text-gray-800 flex flex-col">
        {/* 导航栏 */}
        <nav className="bg-indigo-700 text-white shadow-lg p-4 sticky top-0 z-10">
          <ul className="flex justify-around text-lg font-semibold">
            <li>
              <button
                onClick={() => setCurrentView('timerTodo')}
                className={`py-2 px-4 rounded-full transition duration-300 ease-in-out
                  ${currentView === 'timerTodo' ? 'bg-indigo-500' : 'hover:bg-indigo-600'}`}
              >
                计时与待办
              </button>
            </li>
            <li>
              <button
                onClick={() => setCurrentView('accountTransfer')}
                className={`py-2 px-4 rounded-full transition duration-300 ease-in-out
                  ${currentView === 'accountTransfer' ? 'bg-indigo-500' : 'hover:bg-indigo-600'}`}
              >
                科目结转
              </button>
            </li>
            <li>
              <button
                onClick={() => setCurrentView('monuments')}
                className={`py-2 px-4 rounded-full transition duration-300 ease-in-out
                  ${currentView === 'monuments' ? 'bg-indigo-500' : 'hover:bg-indigo-600'}`}
              >
                纪念碑
              </button>
            </li>
            <li>
              <button
                onClick={() => setCurrentView('settings')}
                className={`py-2 px-4 rounded-full transition duration-300 ease-in-out
                  ${currentView === 'settings' ? 'bg-indigo-500' : 'hover:bg-indigo-600'}`}
              >
                设置
              </button>
            </li>
          </ul>
        </nav>

        {/* 主内容区域，根据 currentView 渲染不同界面 */}
        <main className="flex-grow p-4 sm:p-6 md:p-8">
          {currentView === 'timerTodo' && (
            <TimerTodoView
              activeTaskId={activeTaskId}
              pomodoroState={pomodoroState}
              pomodoroRemainingTime={pomodoroRemainingTime}
              onStartPomodoro={handleStartPomodoro}
              onStopPomodoro={handleStopPomodoro}
              todos={todos}
              addTodo={addTodo}
              deleteTodo={deleteTodo}
              onboarding={() => setShowOnboarding(true)}
            />
          )}

          {currentView === 'accountTransfer' && (
            <AccountTransferView
              allAccountNames={Object.keys(timeAccounts)}
            />
          )}

          {currentView === 'monuments' && (
            <MonumentsView />
          )}

          {currentView === 'settings' && (
            <SettingsView />
          )}
        </main>

        {/* 指导模态框，用于所有界面 */}
        {showOnboarding && (
          <OnboardingModal onClose={() => setShowOnboarding(false)} />
        )}
      </div>
    </TimeAccountsContext.Provider>
  );
};

// =====================================
// 界面组件
// =====================================

// 1. 计时与待办界面
interface TimerTodoViewProps {
  activeTaskId: string | null;
  pomodoroState: 'idle' | 'focus' | 'break';
  pomodoroRemainingTime: number;
  onStartPomodoro: (taskId: string) => void;
  onStopPomodoro: () => void;
  todos: Todo[];
  addTodo: (text: string) => void;
  deleteTodo: (id: string) => void;
  onboarding: () => void;
}

const TimerTodoView: FC<TimerTodoViewProps> = ({
  activeTaskId,
  pomodoroState,
  pomodoroRemainingTime,
  onStartPomodoro,
  onStopPomodoro,
  todos,
  addTodo,
  deleteTodo,
  onboarding
}) => {
  const context = useContext(TimeAccountsContext);
  if (!context) {
    throw new Error('TimerTodoView must be used within a TimeAccountsContext.Provider');
  }
  const { timeAccounts, formatTime } = context;
  const [newTodoText, setNewTodoText] = useState<string>('');

  const handleAddTodo = () => {
    if (newTodoText.trim()) {
      addTodo(newTodoText.trim());
      setNewTodoText('');
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-6xl mx-auto">
      {/* 左侧：计时器 */}
      <div className="w-full lg:w-1/2 bg-white rounded-lg shadow-md p-6 flex flex-col items-center justify-center">
        <h2 className="text-3xl font-bold text-indigo-700 mb-6">
          计时器
        </h2>
        <div className="text-center mb-8">
          <p className="text-lg font-medium text-gray-700">当前模式:</p>
          <p className={`text-4xl font-extrabold mb-4
            ${pomodoroState === 'focus' ? 'text-green-600' : ''}
            ${pomodoroState === 'break' ? 'text-blue-600' : ''}
            ${pomodoroState === 'idle' ? 'text-gray-500' : ''}
          `}>
            {pomodoroState === 'focus' ? '专注时间' : pomodoroState === 'break' ? '休息时间' : '空闲'}
          </p>
          <p className="text-7xl font-mono text-indigo-800">
            {formatTime(pomodoroRemainingTime)}
          </p>
          <p className="text-xl font-medium text-gray-700 mt-4">
            关联任务: {activeTaskId || '无'}
          </p>
        </div>

        <div className="flex space-x-4 mb-8">
          {pomodoroState === 'idle' ? (
            <>
              <button
                onClick={() => onStartPomodoro('未分配时间 (Unallocated)')}
                className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-full shadow-lg hover:bg-indigo-700 transition duration-300 ease-in-out"
              >
                开始计时 (未分配)
              </button>
            </>
          ) : (
            <button
              onClick={onStopPomodoro}
              className="px-6 py-3 bg-red-500 text-white font-semibold rounded-full shadow-lg hover:bg-red-600 transition duration-300 ease-in-out"
            >
              停止计时
            </button>
          )}
        </div>
        <button
          onClick={onboarding}
          className="px-4 py-2 text-indigo-600 hover:text-indigo-800 text-sm font-semibold rounded-lg transition duration-300 ease-in-out mt-4"
        >
          什么是时间复式记账法？
        </button>
      </div>

      {/* 右侧：待办列表 */}
      <div className="w-full lg:w-1/2 bg-white rounded-lg shadow-md p-6 flex flex-col">
        <h2 className="text-3xl font-bold text-indigo-700 mb-6 text-center">
          我的待办列表
        </h2>
        <div className="flex mb-4">
          <input
            type="text"
            className="flex-grow px-4 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="添加新的待办任务..."
            value={newTodoText}
            onChange={(e) => setNewTodoText(e.target.value)}
            onKeyPress={(e) => { if (e.key === 'Enter') handleAddTodo(); }}
          />
          <button
            onClick={handleAddTodo}
            className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-r-lg hover:bg-blue-700 transition duration-300 ease-in-out"
          >
            添加
          </button>
        </div>

        <ul className="space-y-3 overflow-y-auto max-h-96 flex-grow">
          {todos.length === 0 ? (
            <p className="text-center text-gray-500">暂无待办任务。快添加一个吧！</p>
          ) : (
            todos.map((todo) => (
              <li
                key={todo.id}
                className={`flex items-center justify-between p-3 rounded-lg border
                  ${activeTaskId === todo.id ? 'bg-indigo-50 border-indigo-300 shadow-sm' : 'bg-gray-50 border-gray-200'}
                `}
              >
                <div className="flex-grow mr-4">
                  <span className="text-lg text-gray-800 font-medium">{todo.text}</span>
                  <p className="text-sm text-gray-500">
                    已投入: {formatTime(timeAccounts[todo.id] || 0)}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => onStartPomodoro(todo.id)}
                    disabled={pomodoroState !== 'idle' && activeTaskId !== todo.id}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition duration-300 ease-in-out
                      ${activeTaskId === todo.id
                        ? 'bg-orange-500 text-white hover:bg-orange-600'
                        : 'bg-green-500 text-white hover:bg-green-600'}
                      ${(pomodoroState !== 'idle' && activeTaskId !== todo.id) ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    {activeTaskId === todo.id ? '正在计时' : '开始计时'}
                  </button>
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    className="p-2 text-red-500 hover:text-red-700 transition duration-300 ease-in-out"
                    title="删除任务"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm6 0a1 1 0 11-2 0v6a1 1 0 112 0V8z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
};


// 2. 科目结转界面
interface AccountTransferViewProps {
  allAccountNames: string[];
}

const AccountTransferView: FC<AccountTransferViewProps> = ({ allAccountNames }) => {
  const context = useContext(TimeAccountsContext);
  if (!context) {
    throw new Error('AccountTransferView must be used within a TimeAccountsContext.Provider');
  }
  const { timeAccounts, setTimeAccounts, formatTime } = context;
  const [fromAccount, setFromAccount] = useState<string>('');
  const [toAccount, setToAccount] = useState<string>('');
  const [amount, setAmount] = useState<string>(''); // 以秒为单位
  const [message, setMessage] = useState<string>('');

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
      newAccounts[fromAccount] -= transferAmount; // 贷出
      newAccounts[toAccount] = (newAccounts[toAccount] || 0) + transferAmount;   // 借入
      return newAccounts;
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

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-6xl mx-auto">
      {/* 左侧：T 字表模拟 */}
      <div className="w-full lg:w-1/2 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-3xl font-bold text-indigo-700 mb-6 text-center">
          科目结转 (T 字表模拟)
        </h2>
        <p className="text-sm text-gray-600 mb-4 text-center">
          每次结转操作会在此处显示借方和贷方对应关系。
        </p>
        <div className="flex border border-gray-300 rounded-lg overflow-hidden mb-6">
          <div className="w-1/2 p-4 border-r border-gray-300">
            <h3 className="text-lg font-bold text-green-700 mb-2">借方 (Debit)</h3>
            <ul className="space-y-1">
              {tAccountDebit.length === 0 ? (
                <li className="text-gray-500">无记录</li>
              ) : (
                tAccountDebit.map((entry, index) => (
                  <li key={index} className="text-gray-800">
                    {entry.account}: {formatTime(entry.amount)}
                  </li>
                ))
              )}
            </ul>
          </div>
          <div className="w-1/2 p-4">
            <h3 className="text-lg font-bold text-red-700 mb-2">贷方 (Credit)</h3>
            <ul className="space-y-1">
              {tAccountCredit.length === 0 ? (
                <li className="text-gray-500">无记录</li>
              ) : (
                tAccountCredit.map((entry, index) => (
                  <li key={index} className="text-gray-800">
                    {entry.account}: {formatTime(entry.amount)}
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>

        <h3 className="text-xl font-bold text-indigo-700 mb-4 text-center">
          当前账户余额
        </h3>
        <div className="space-y-3 overflow-y-auto max-h-64">
          {Object.entries(timeAccounts).map(([accountName, time]) => (
            <div
              key={accountName}
              className={`flex justify-between items-center p-2 rounded-lg
                ${accountName.includes('未分配') ? 'bg-blue-50' : ''}
                ${accountName.startsWith('纪念碑 -') ? 'bg-emerald-50' : ''}
                ${accountName.includes('无效') ? 'bg-red-50' : ''}
                ${accountName.includes('休息') ? 'bg-purple-50' : ''}
                ${!accountName.includes('未分配') && !accountName.startsWith('纪念碑 -') && !accountName.includes('无效') && !accountName.includes('休息') ? 'bg-gray-50' : ''}
              `}
            >
              <span className="font-medium text-gray-700">{accountName}:</span>
              <span className="font-bold text-indigo-600">
                {formatTime(time)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 右侧：结转操作表单 */}
      <div className="w-full lg:w-1/2 bg-white rounded-lg shadow-md p-6 flex flex-col">
        <h2 className="text-3xl font-bold text-indigo-700 mb-6 text-center">
          执行时间结转
        </h2>
        <p className="text-sm text-gray-600 mb-4 text-center">
          （例如：将“编写代码”的时间结转到“纪念碑 - 核心原型完成”）
        </p>
        <div className="space-y-4 flex-grow">
          <div>
            <label htmlFor="fromAccount" className="block text-sm font-medium text-gray-700 mb-1">
              来源账户 (贷方 - 时间减少):
            </label>
            <select
              id="fromAccount"
              value={fromAccount}
              onChange={(e) => setFromAccount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">选择账户</option>
              {allAccountNames.filter(name =>
                !name.startsWith('纪念碑 -') &&
                !name.includes('未分配') &&
                !name.includes('休息时间') &&
                !name.includes('无效消耗')
              ).map((name) => (
                <option key={name} value={name}>
                  {name} (当前: {formatTime(timeAccounts[name])})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="toAccount" className="block text-sm font-medium text-gray-700 mb-1">
              目标账户 (借方 - 时间增加):
            </label>
            <select
              id="toAccount"
              value={toAccount}
              onChange={(e) => setToAccount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">选择账户</option>
              {allAccountNames.filter(name =>
                !name.includes('未分配') &&
                !name.includes('休息时间') &&
                !name.includes('无效消耗')
              ).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
              结转时间 (秒):
            </label>
            <input
              type="number"
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="例如: 3600 (1小时)"
              min="1"
            />
          </div>
          <button
            onClick={handleTransfer}
            className="w-full py-3 px-4 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 transition duration-300 ease-in-out"
          >
            执行结转
          </button>
        </div>
        {message && (
          <p className="mt-4 text-center text-sm font-medium text-gray-700 p-2 bg-gray-100 rounded-lg">
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

// 3. 纪念碑界面
const MonumentsView: FC = () => {
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
      alert('请输入纪念碑名称！');
    }
  };

  return (
    <div className="flex flex-col items-center max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8">
      <h2 className="text-3xl font-bold text-indigo-700 mb-8 text-center">
        我的纪念碑
      </h2>
      <p className="text-lg text-gray-700 mb-6 text-center">
        “纪念碑”是您所有投入时间最终转化为的回报或成就的集合。您可以自定义不同的纪念碑来反映您的产出。
      </p>

      {/* 添加新的纪念碑子科目 */}
      <div className="w-full mb-8 p-4 bg-blue-50 rounded-lg shadow-sm">
        <h3 className="text-xl font-bold text-blue-700 mb-4 text-center">
          添加新的纪念碑子科目
        </h3>
        <div className="flex">
          <input
            type="text"
            className="flex-grow px-4 py-2 border border-blue-300 rounded-l-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="例如: 编写的开源库, 考取的证书, 完成的课程"
            value={newMonumentName}
            onChange={(e) => setNewMonumentName(e.target.value)}
            onKeyPress={(e) => { if (e.key === 'Enter') handleAddMonument(); }}
          />
          <button
            onClick={handleAddMonument}
            className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-r-lg hover:bg-blue-700 transition duration-300 ease-in-out"
          >
            创建纪念碑
          </button>
        </div>
      </div>

      {/* 纪念碑总计可视化 */}
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-indigo-700 mb-4">
          总计产出时间纪念碑
        </h3>
        <div className="relative mb-4 flex items-center justify-center">
          <div
            className="bg-gray-300 rounded-lg transform rotate-45"
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
        <p className="text-2xl font-bold text-indigo-800">
          总计产出时间: {formatTime(totalMonumentTime)}
        </p>
      </div>

      {/* 各个纪念碑子科目列表 */}
      <div className="w-full bg-gray-50 rounded-lg p-6 mt-6">
        <h3 className="text-xl font-bold text-indigo-700 mb-4 text-center">
          我的纪念碑子科目
        </h3>
        {monumentSubAccounts.length === 0 ? (
          <p className="text-center text-gray-500">
            暂无纪念碑子科目。创建第一个吧！
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {monumentSubAccounts.map(([name, time]) => (
              <div key={name} className="bg-white p-4 rounded-lg shadow-sm flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-800 text-lg">
                    {name.replace('纪念碑 - ', '')}
                  </h4>
                  <p className="text-sm text-gray-600">
                    已投入: {formatTime(time as number)}
                  </p>
                </div>
                {/* 简单的进度条或小图标作为子科目可视化 */}
                <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center bg-emerald-100 rounded-full">
                  <span className="text-emerald-600 text-3xl">🏆</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="w-full bg-gray-50 rounded-lg p-6 mt-6">
        <h3 className="text-xl font-bold text-indigo-700 mb-4 text-center">
          时间报表 (待扩展)
        </h3>
        <p className="text-gray-600 text-center">
          此处将显示更详细的时间分析报表，例如：
        </p>
        <ul className="list-disc list-inside text-gray-600 mt-2 text-center">
          <li>时间资产负债表</li>
          <li>投入产出比分析</li>
          <li>各任务时间趋势图</li>
        </ul>
        <p className="mt-4 text-sm text-gray-500 text-center">
          （该功能将在未来版本中完善，以提供更深入的数据洞察。）
        </p>
      </div>
    </div>
  );
};

// 4. 用户信息与设置界面
const SettingsView: FC = () => {
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
          <h3 className="text-xl font-semibold text-gray-800 mb-2">应用偏好</h3>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">主题模式:</span>
            <button className="px-3 py-1 bg-gray-200 rounded-md text-gray-800">
              亮色/暗色 (待实现)
            </button>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-gray-600">番茄钟时长:</span>
            <span className="text-gray-800">25 分钟专注 / 5 分钟休息 (待配置)</span>
          </div>
        </div>
      </div>
      <p className="mt-6 text-sm text-gray-500 text-center">
        （更多高级设置将在后续版本中添加。）
      </p>
    </div>
  );
};


// =====================================
// 辅助组件
// =====================================

interface TreeDisplayProps {
  taskId: string;
}

// 树木显示组件 (可视化激励)
const TreeDisplay: FC<TreeDisplayProps> = ({ taskId }) => {
  const context = useContext(TimeAccountsContext);
  if (!context) {
    throw new Error('TreeDisplay must be used within a TimeAccountsContext.Provider');
  }
  const { timeAccounts, formatTime, timeUnitForGrowth } = context;
  const timeSpent = timeAccounts[taskId];
  // 根据时间计算树木的尺寸和颜色
  const treeSize = Math.min(100, Math.floor((timeSpent || 0) / timeUnitForGrowth) * 5 + 20); // 最小20px，最大100px
  const leavesColor = `hsl(${Math.min(120, treeSize * 2)}, 70%, 50%)`; // 颜色随大小变化

  // 检查 taskId 是否存在于 timeAccounts 中，因为待办任务可能被删除
  if (timeSpent === undefined || taskId.includes('未分配') || taskId.includes('休息') || taskId.startsWith('纪念碑 -') || taskId.includes('无效')) {
      return null; // 不为这些特殊账户或纪念碑子科目显示树木
  }

  return (
    <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold text-gray-800 mb-3 text-center">{taskId}</h3>
      <div className="relative w-24 h-24 mb-4 flex items-end justify-center">
        {/* 树干 */}
        <div
          className="absolute bottom-0 w-4 bg-amber-800 rounded-t-full"
          style={{ height: `${treeSize * 0.6}px` }}
        ></div>
        {/* 树叶 */}
        <div
          className="absolute rounded-full"
          style={{
            width: `${treeSize}px`,
            height: `${treeSize}px`,
            backgroundColor: leavesColor,
            top: `${24 - treeSize * 0.8}px`, // 调整树叶位置
            boxShadow: `0px 4px 10px rgba(0,0,0,0.2)`
          }}
        ></div>
        {/* 根部阴影 */}
        <div className="absolute bottom-0 w-16 h-4 bg-gray-300 rounded-full opacity-60"></div>
      </div>
      <p className="text-sm text-gray-600">已投入时间:</p>
      <p className="text-xl font-bold text-indigo-600">{formatTime(timeSpent)}</p>
    </div>
  );
};


interface OnboardingModalProps {
  onClose: () => void;
}

// 指导模态框
const OnboardingModal: FC<OnboardingModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full m-4 relative animate-fade-in">
        <h2 className="text-3xl font-bold text-indigo-700 mb-6 text-center">
          时间复式记账法：工作原理
        </h2>
        <p className="text-gray-700 mb-4 leading-relaxed">
          想象一下，您的时间是您最宝贵的资产。就像会计中的资金一样，时间可以被“记账”和“流转”。
        </p>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">核心概念:</h3>
        <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
          <li>
            <strong>时间账户：</strong> 每个任务、项目、甚至您每天的“未分配时间”都可以视为一个独立的账户。
          </li>
          <li>
            <strong>借方与贷方：</strong>
            当你开始一个任务时，时间会从一个账户（如“未分配时间”）
            <span className="font-bold text-red-600">贷出</span> (减少)，同时被
            <span className="font-bold text-green-600">借入</span>
            到您正在进行的任务账户 (增加)。
          </li>
          <li>
            <strong>时间“结转”：</strong>
            当您完成一个任务或阶段性工作后，您可以将任务账户中花费的时间“结转”到“产出账户”或另一个相关项目账户。例如，您在“学习会计”上花费的时间，最终会“结转”到“项目产出 - 会计原型”账户中，代表您的投入已转化为实际成果。
          </li>
          <li>
            **平衡：** 永远保持总借方时间等于总贷方时间，确保您的时间流向清晰可追溯。
          </li>
        </ul>
        <p className="text-gray-700 mb-6 leading-relaxed">
          通过这种方式，您可以清晰地追踪时间投入，评估产出效率，并在每个“会计周期”结束后进行分析和调整。
        </p>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl font-bold"
          aria-label="关闭"
        >
          &times;
        </button>
        <button
          onClick={onClose}
          className="w-full px-6 py-3 bg-indigo-600 text-white font-semibold rounded-full shadow-lg hover:bg-indigo-700 transition duration-300 ease-in-out"
        >
          开始体验
        </button>
      </div>
    </div>
  );
};

// 移除了 InjectStyles 组件和 CDN script 标签，因为 CSS 将通过本地构建加载。

// 渲染主应用
export default function Main() {
  // 在本地 React 项目中，ReactDOM.createRoot 通常在 src/index.tsx 中调用
  // 这里的 Main 函数只是为了兼容 Canvas 环境的默认导出。
  // 实际运行本地项目时，你会在 src/index.tsx 中导入并渲染 <App />。
  return (
    <App />
  );
}

