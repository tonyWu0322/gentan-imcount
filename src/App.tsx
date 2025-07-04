import React, { useState, useEffect, useRef, createContext, useContext, FC, useMemo } from 'react';

// =====================================
// 类型与接口定义 (Type & Interface Definitions)
// =====================================
interface TimeAccounts {
  [key: string]: number;
}

interface Todo {
  id: string;
  text: string;
  isCompleted: boolean;
}

interface TimeLog {
  id: string;
  type: 'timer' | 'transfer';
  timestamp: number;
  // Timer-specific
  taskId?: string;
  taskText?: string;
  startTime?: number;
  endTime?: number;
  // Transfer-specific
  fromAccount?: string;
  toAccount?: string;
  transferAmount?: number;
}

interface TimeAccountsContextType {
  timeAccounts: TimeAccounts;
  setTimeAccounts: React.Dispatch<React.SetStateAction<TimeAccounts>>;
  formatTime: (seconds: number) => string;
  timeUnitForGrowth: number;
  addMonumentAccount: (name: string) => boolean;
}

const TimeAccountsContext = createContext<TimeAccountsContextType | null>(null);

// =====================================
// 初始数据 (Initial Data)
// =====================================
const initialTodosData: Todo[] = [
  { id: 'initial-todo-1', text: '完成会计原理学习', isCompleted: false },
  { id: 'initial-todo-2', text: '开发复式记账法原型', isCompleted: false },
  { id: 'initial-todo-3', text: '查阅 React 文档', isCompleted: false },
];

// =====================================
// 主应用组件 (App Component)
// =====================================
const App: FC = () => {
  // 定义时间账户的状态
  const [timeAccounts, setTimeAccounts] = useState<TimeAccounts>({
    '未分配时间 (Unallocated)': 0,
    '休息时间 (Rest Time)': 0,
    '无效消耗 (Wasted Time)': 0,
    '默认损失 (Default Loss)': 0,
    '纪念碑 - 核心原型完成 (Core Proto Done)': 0,
    // 从待办数据动态生成初始账户
    ...initialTodosData.reduce((acc, todo) => {
      acc[todo.id] = 0;
      return acc;
    }, {} as TimeAccounts),
  });

  // 待办任务列表，使用新的稳定初始数据
  const [todos, setTodos] = useState<Todo[]>(initialTodosData);
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]); // 新增：计时日志状态
  const [isLoading, setIsLoading] = useState(true); // 新增：加载状态，防止初始状态覆盖本地存储

  // **加载数据**
  useEffect(() => {
    try {
      // 加载 Todos
      const savedTodos = localStorage.getItem('todos');
      if (savedTodos) {
        setTodos(JSON.parse(savedTodos));
      }

      // 加载 Time Accounts
      const savedTimeAccounts = localStorage.getItem('timeAccounts');
      if (savedTimeAccounts) {
        const parsedAccounts = JSON.parse(savedTimeAccounts);
        setTimeAccounts(prevAccounts => ({
          ...prevAccounts,
          ...parsedAccounts
        }));
      }
      
      // 加载 Time Logs
      const savedLogs = localStorage.getItem('timeLogs');
      if (savedLogs) {
        setTimeLogs(JSON.parse(savedLogs));
      }
    } catch (error) {
      console.error("Failed to load data from local storage", error);
    } finally {
      // 所有加载完成后，设置 loading 为 false
      setIsLoading(false);
    }
  }, []); // 空依赖数组，只在组件挂载时运行一次

  // **保存数据**
  useEffect(() => {
    // 只有在加载完成后才开始保存，防止初始状态覆盖
    if (!isLoading) {
      try {
        localStorage.setItem('todos', JSON.stringify(todos));
        localStorage.setItem('timeAccounts', JSON.stringify(timeAccounts));
        if (timeLogs.length > 0) {
            localStorage.setItem('timeLogs', JSON.stringify(timeLogs));
        }
      } catch (error) {
        console.error("Failed to save data to local storage", error);
      }
    }
  }, [todos, timeAccounts, timeLogs, isLoading]); // 当任何数据改变且加载完成后触发

  // 当前激活的任务ID (用于番茄钟将时间归类)
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  // 当前番茄钟状态：'idle', 'focus', 'break'
  const [pomodoroState, setPomodoroState] = useState<'idle' | 'focus' | 'break'>('idle');
  // 番茄钟剩余时间 (秒)
  const [pomodoroRemainingTime, setPomodoroRemainingTime] = useState<number>(0);
  // 番茄钟设置
  const pomodoroSettings = useMemo(() => ({
    focusTime: 25 * 60, // 25 分钟专注
    breakTime: 5 * 60,  // 5 分钟休息
  }), []); // 空依赖数组，确保对象引用稳定

  // 用于"重新开始"时回溯时间：记录当前阶段开始时，相关账户的初始时间值
  const initialTimeAtPhaseStartRef = useRef<number>(0);
  // 用于"重新开始"时回溯时间：记录当前阶段开始时，对应的活跃任务ID
  const activeTaskAtPhaseStartRef = useRef<string | null>(null);

  const phaseStartTimeRef = useRef<number | null>(null); // 新增：记录当前阶段开始时间

  // 计时器ID
  const timerRef = useRef<NodeJS.Timeout | null>(null); // 明确计时器类型
  
  // 使用 ref 存储当前状态，确保计时器总是使用最新值
  const currentPomodoroStateRef = useRef<'idle' | 'focus' | 'break'>(pomodoroState);
  const currentActiveTaskIdRef = useRef<string | null>(activeTaskId);
  
  // 更新 ref 值
  useEffect(() => {
    currentPomodoroStateRef.current = pomodoroState;
  }, [pomodoroState]);
  
  useEffect(() => {
    currentActiveTaskIdRef.current = activeTaskId;
  }, [activeTaskId]);

  // 显示指导模态框
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  // 每个时间单位的树木增长视觉效果
  const timeUnitForGrowth: number = 60; // 60秒 = 1分钟，用于树木增长的单位

  // 导航栏当前视图
  const [currentView, setCurrentView] = useState<'timerTodo' | 'accountTransfer' | 'monuments' | 'settings' | 'timeLog'>('timerTodo'); // 默认为计时与待办界面

  // 计时器效果的核心逻辑 (每秒更新)
  useEffect(() => {
    // 只有当有活跃任务且番茄钟不处于空闲状态时，才设置计时器
    if (activeTaskId && pomodoroState !== 'idle') {
      console.log('Starting timer with:', { activeTaskId, pomodoroState });
      
      timerRef.current = setInterval(() => {
        // 时间累加逻辑
        setTimeAccounts((prevAccounts) => {
          const newAccounts = { ...prevAccounts };
          if (currentPomodoroStateRef.current === 'focus') {
            const targetAccount = currentActiveTaskIdRef.current || '未分配时间 (Unallocated)';
            newAccounts[targetAccount] = (newAccounts[targetAccount] || 0) + 1;
          } else if (currentPomodoroStateRef.current === 'break') {
            newAccounts['休息时间 (Rest Time)'] = (newAccounts['休息时间 (Rest Time)'] || 0) + 1;
          }
          return newAccounts;
        });

        // 计时器递减和阶段切换逻辑
        setPomodoroRemainingTime((prevTime) => {
          if (prevTime <= 1) {
            // 时间耗尽，切换阶段
            if (currentPomodoroStateRef.current === 'focus') {
              const stopTime = Date.now();
              if (currentActiveTaskIdRef.current && phaseStartTimeRef.current) {
                    addTimeLogEntry({
                       type: 'timer',
                       taskId: currentActiveTaskIdRef.current,
                       startTime: phaseStartTimeRef.current,
                       endTime: stopTime,
                    });
                  }

              phaseStartTimeRef.current = stopTime;

              setPomodoroState('break');
              setPomodoroRemainingTime(pomodoroSettings.breakTime);
              alert('专注时间结束！现在是休息时间。');
            } else if (currentPomodoroStateRef.current === 'break') {
              const stopTime = Date.now();
              if (phaseStartTimeRef.current) {
                if (phaseStartTimeRef.current) {
                      addTimeLogEntry({
                         type: 'timer',
                         taskId: '休息时间 (Rest Time)',
                         startTime: phaseStartTimeRef.current,
                         endTime: stopTime,
                      });
                    }
              }
              phaseStartTimeRef.current = null;
              
              setPomodoroState('idle');
              setPomodoroRemainingTime(0);
              setActiveTaskId(null);
              activeTaskAtPhaseStartRef.current = null;
              initialTimeAtPhaseStartRef.current = 0;
              alert('休息时间结束！准备开始下一个专注。');
            }
            
            // 阶段切换后，当前计时器完成其使命，可以被清除
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    }

    // 清理函数：这是此 effect 的核心。
    // 它在组件卸载或依赖项 (activeTaskId, pomodoroState) 改变时运行
    // 确保任何旧的计时器都被彻底清除
    return () => {
      if (timerRef.current) {
        console.log('Cleaning up timer ID:', timerRef.current);
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
    
  // 依赖项：只有当 activeTaskId 或 pomodoroState 改变时，才重新运行此 effect
  }, [activeTaskId, pomodoroState]);


  // 处理开始番茄钟
  const handleStartPomodoro = (taskId: string) => {
    // 如果已有活跃任务，先停止当前计时，避免时间混乱
    if (currentActiveTaskIdRef.current && currentPomodoroStateRef.current !== 'idle') {
      handleStopPomodoro(); // 确保旧的计时状态被清理
    }

    // 记录当前阶段开始时，活跃任务账户的初始时间值
    // 这对于"重新开始"时计算损失非常重要
    initialTimeAtPhaseStartRef.current = timeAccounts[taskId] || 0;
    activeTaskAtPhaseStartRef.current = taskId; // 记录哪个任务开始了当前阶段
    phaseStartTimeRef.current = Date.now(); // 记录日志的开始时间

    setActiveTaskId(taskId); // 设置当前活跃任务
    setPomodoroState('focus'); // 进入专注模式
    setPomodoroRemainingTime(pomodoroSettings.focusTime); // 设置专注时间
  };

  // 处理停止番茄钟（正常停止或切换任务）
  const handleStopPomodoro = () => {
    // 清除计时器
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const stopTime = Date.now();
    const startTime = phaseStartTimeRef.current;
    const taskToLog = currentActiveTaskIdRef.current;
    const stateToLog = currentPomodoroStateRef.current;
    
    if (startTime && taskToLog) {
            if (stateToLog === 'focus') {
              addTimeLogEntry({
                 type: 'timer',
                 taskId: taskToLog,
                 startTime,
                 endTime: stopTime,
              });
            } else if (stateToLog === 'break') {
              addTimeLogEntry({
                 type: 'timer',
                 taskId: '休息时间 (Rest Time)',
                 startTime,
                 endTime: stopTime,
              });
            }
         }
    phaseStartTimeRef.current = null;

    // 重置番茄钟状态为初始空闲状态
    setPomodoroState('idle');
    setPomodoroRemainingTime(0);
    setActiveTaskId(null); // 清除关联任务
    activeTaskAtPhaseStartRef.current = null; // 清除阶段开始时的任务引用
    initialTimeAtPhaseStartRef.current = 0;   // 重置初始时间
  };

  // 新增：快进当前阶段（用于调试或快速跳过当前阶段）
  // 此时已累积的时间会保留在原账户
  const handleFastForward = () => {
    if (currentPomodoroStateRef.current !== 'idle') {
      setPomodoroRemainingTime(1); // 将剩余时间设置为1秒，强制在下一次更新时触发阶段结束
      // 注意：这里不需要额外操作 timeAccounts，因为每秒更新逻辑已经处理了累加。
      // 阶段结束时，时间已经正确地累积在目标账户中。
    }
  };

  // 新增：重新开始番茄钟（完全重置，已投入时间计入"默认损失"）
  const handleRestartPomodoro = () => {
    // 停止计时器
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // 获取当前阶段被中断的任务ID
    const interruptedTask = activeTaskAtPhaseStartRef.current;
    if (interruptedTask && (currentPomodoroStateRef.current === 'focus' || currentPomodoroStateRef.current === 'break')) {
      // 计算从阶段开始到中断为止，已累积在该任务账户中的时间
      // timeAccounts[interruptedTask] 是当前的总累积时间
      // initialTimeAtPhaseStartRef.current 是该阶段开始时的账户时间
      const timeAccumulatedInCurrentPhase = (timeAccounts[interruptedTask] || 0) - initialTimeAtPhaseStartRef.current;

      if (timeAccumulatedInCurrentPhase > 0) {
        setTimeAccounts((prevAccounts) => {
          const newAccounts = { ...prevAccounts };

          // 从原账户中扣除这些时间
          newAccounts[interruptedTask] = Math.max(0, newAccounts[interruptedTask] - timeAccumulatedInCurrentPhase);

          // 将这些时间转移到"默认损失"账户
          newAccounts['默认损失 (Default Loss)'] = (newAccounts['默认损失 (Default Loss)'] || 0) + timeAccumulatedInCurrentPhase;
          return newAccounts;
        });
        alert(`已将 ${formatTime(timeAccumulatedInCurrentPhase)} 计入"默认损失"账户。`);
      }
    }

    // 重置番茄钟和任务状态
    setPomodoroState('idle');
    setPomodoroRemainingTime(0);
    setActiveTaskId(null);
    activeTaskAtPhaseStartRef.current = null; // 清除阶段开始时的任务引用
    initialTimeAtPhaseStartRef.current = 0;   // 重置初始时间
  };

  // 添加待办任务
  const addTodo = (text: string) => {
    const newId = `Todo-${Date.now()}`;
    setTodos(prevTodos => [...prevTodos, { id: newId, text, isCompleted: false }]);
    setTimeAccounts(prevAccounts => ({ ...prevAccounts, [newId]: 0 }));
  };

  const completeTodo = (todoId: string) => {
    setTodos(prevTodos =>
      prevTodos.map(todo =>
        todo.id === todoId ? { ...todo, isCompleted: true } : todo
      )
    );
    // 如果完成的是当前计时任务，则停止计时
    if (activeTaskId === todoId) {
        handleStopPomodoro();
    }
  };

  // 删除待办任务
  const deleteTodo = (id: string) => {
    setTodos(todos.filter(todo => todo.id !== id)); // 从待办列表中移除
    setTimeAccounts((prevAccounts) => {
      const newAccounts = { ...prevAccounts };
      delete newAccounts[id]; // 从时间账户中删除对应账户
      return newAccounts;
    });
    if (currentActiveTaskIdRef.current === id) {
      handleStopPomodoro(); // 如果删除的是当前活跃任务，则停止计时
    }
  };

  // 添加纪念碑子科目（供 MonumentsView 调用）
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

  // 确保上下文值不为空且稳定
  const contextValue = React.useMemo(() => ({
    timeAccounts,
    setTimeAccounts,
    formatTime,
    timeUnitForGrowth,
    addMonumentAccount
  }), [timeAccounts, formatTime, timeUnitForGrowth, addMonumentAccount]);

  const addTimeLogEntry = (logDetails: {
     type: 'timer';
     taskId: string;
     startTime: number;
     endTime: number;
   } | {
     type: 'transfer';
     fromAccount: string;
     toAccount: string;
     transferAmount: number;
   }) => {
     const baseLog: TimeLog = {
        id: `log-${Date.now()}-${Math.random()}`,
        timestamp: Date.now(), // 记录操作发生的精确时间
        type: logDetails.type,
     };

     let newLog: TimeLog;

     if (logDetails.type === 'timer') {
        const { taskId, startTime, endTime } = logDetails;
        if (!taskId || !startTime || !endTime || endTime <= startTime) {
          console.warn("Invalid timer log entry attempted:", logDetails);
          return;
        }
        const taskText = taskId.startsWith('Todo-')
          ? todos.find(t => t.id === taskId)?.text || taskId
          : taskId;

        newLog = {
          ...baseLog,
          taskId,
          taskText,
          startTime,
          endTime,
        };
     } else { // type === 'transfer'
        const { fromAccount, toAccount, transferAmount } = logDetails;
        if (!fromAccount || !toAccount || !transferAmount || transferAmount <= 0) {
          console.warn("Invalid transfer log entry attempted:", logDetails);
          return;
        }
        newLog = {
          ...baseLog,
          fromAccount,
          toAccount,
          transferAmount,
        };
     }
     setTimeLogs(prevLogs => [...prevLogs, newLog]);
   };

  const clearTimeLogs = () => {
    if (window.confirm('您确定要清除所有计时和结转日志吗？此操作无法撤销。')) {
      setTimeLogs([]);
      localStorage.removeItem('timeLogs');
    }
  };

  // 新增：重命名待办事项的函数
  const renameTodo = (todoId: string, newText: string) => {
    setTodos(prevTodos =>
      prevTodos.map(todo =>
        todo.id === todoId ? { ...todo, text: newText.trim() } : todo
      )
    );
  };

  const [completedMonuments, setCompletedMonuments] = useState<string[]>([]);

  useEffect(() => {
    // In the main data loading useEffect
    const savedCompletedMonuments = localStorage.getItem('completedMonuments');
    if (savedCompletedMonuments) {
      setCompletedMonuments(JSON.parse(savedCompletedMonuments));
    }
  }, []);

  useEffect(() => {
    // In the main data saving useEffect
    if (!isLoading) {
      localStorage.setItem('completedMonuments', JSON.stringify(completedMonuments));
    }
  }, [completedMonuments, isLoading]);

  const archiveMonument = (monumentId: string) => {
    setCompletedMonuments(prev => [...prev, monumentId]);
  };
  
  const renameAccount = (oldName: string, newName: string) => {
    const trimmedNewName = newName.trim();
    if (!trimmedNewName) {
      alert("账户名称不能为空。");
      return;
    }

    const accountType = getAccountType(oldName);

    // 如果是待办事项，我们只修改它的显示文本
    if (accountType === 'todo') {
      renameTodo(oldName, trimmedNewName);
      return;
    }

    // 对于通用账户或纪念碑，我们要重命名账户键
    // 首先检查新名称是否已存在
    if (timeAccounts[trimmedNewName] !== undefined && oldName !== trimmedNewName) {
      alert(`账户 "${trimmedNewName}" 已存在。`);
      return;
    }

    // 更新 timeAccounts 状态
    setTimeAccounts(prevAccounts => {
      const newAccounts = { ...prevAccounts };
      const accountValue = newAccounts[oldName];
      delete newAccounts[oldName];
      newAccounts[trimmedNewName] = accountValue;
      return newAccounts;
    });

    // 如果被重命名的账户是当前活动任务，则更新活动任务ID
    if (activeTaskId === oldName) {
      setActiveTaskId(trimmedNewName);
    }
    if (activeTaskAtPhaseStartRef.current === oldName) {
      activeTaskAtPhaseStartRef.current = trimmedNewName;
    }

    // 当重命名纪念碑时，如果它在已归档列表中，也需要更新
    if (accountType === 'monument' && completedMonuments.includes(oldName)) {
      setCompletedMonuments(prev => prev.map(m => m === oldName ? trimmedNewName : m));
    }
  };

  const deleteAccount = (accountName: string) => {
    // 使用显示名称进行确认，更友好
    const displayName = getAccountDisplayName(accountName);
    if (window.confirm(`您确定要删除账户 "${displayName}" 吗？\n此操作将移除其所有累计时间，且无法撤销。`)) {
      
      const accountType = getAccountType(accountName);

      // 如果是待办事项，也需要从todos列表中删除
      if (accountType === 'todo') {
        setTodos(prev => prev.filter(t => t.id !== accountName));
      }

      // 从时间账户中删除
      setTimeAccounts(prev => {
        const newAccounts = { ...prev };
        delete newAccounts[accountName];
        return newAccounts;
      });
      
      // 如果删除的是当前活动任务，则停止计时
      if (activeTaskId === accountName) {
        handleStopPomodoro();
      }

      // 如果删除的是已归档的纪念碑，也从归档列表中移除
      if (accountType === 'monument' && completedMonuments.includes(accountName)) {
          setCompletedMonuments(prev => prev.filter(m => m !== accountName));
      }
    }
  };

  const isManageable = (accountName: string): boolean => {
    const type = getAccountType(accountName);
    return type === 'todo' || type === 'general';
  };

  const getAccountDisplayName = (accountName: string): string => {
    if (getAccountType(accountName) === 'todo') {
        return todos.find(t => t.id === accountName)?.text || accountName;
    }
    return accountName;
  };

  // Helper functions that need access to App's state (todos)
  const getAccountType = (accountName: string): string => {
    if (accountName.startsWith('Todo-')) return 'todo';
    if (accountName.startsWith('纪念碑 -')) return 'monument';
    if (['未分配时间 (Unallocated)', '休息时间 (Rest Time)', '无效消耗 (Wasted Time)', '默认损失 (Default Loss)'].includes(accountName)) return 'system';
    return 'general';
  };


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
                账户管理
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
                onClick={() => setCurrentView('timeLog')}
                className={`py-2 px-4 rounded-full transition duration-300 ease-in-out
                  ${currentView === 'timeLog' ? 'bg-indigo-500' : 'hover:bg-indigo-600'}`}
              >
                计时日志
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
              handleFastForward={handleFastForward} // 传递快进按钮的handler
              handleRestartPomodoro={handleRestartPomodoro} // 传递重新开始按钮的handler
              todos={todos.filter(todo => !todo.isCompleted)} // 只传递未完成的待办
              addTodo={addTodo}
              deleteTodo={deleteTodo}
              completeTodo={completeTodo} // 传递新函数
              renameTodo={renameTodo}
              onboarding={() => setShowOnboarding(true)}
            />
          )}

          {currentView === 'accountTransfer' && (
            <AccountTransferView
              allAccountNames={Object.keys(timeAccounts)}
              todos={todos}
              renameAccount={renameAccount}
              deleteAccount={deleteAccount}
              addTimeLogEntry={addTimeLogEntry}
              completedMonuments={completedMonuments}
              archiveMonument={archiveMonument}
              getAccountType={getAccountType}
              getAccountDisplayName={getAccountDisplayName}
              isManageable={isManageable}
            />
          )}

          {currentView === 'monuments' && (
            <MonumentsView />
          )}

          {currentView === 'timeLog' && (
            <TimeLogView
              timeLogs={timeLogs}
              todos={todos}
              formatTime={formatTime}
              clearTimeLogs={clearTimeLogs}
            />
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
  handleFastForward: () => void; // 新增 prop
  handleRestartPomodoro: () => void; // 新增 prop
  todos: Todo[];
  addTodo: (text: string) => void;
  deleteTodo: (id: string) => void;
  completeTodo: (id: string) => void;
  renameTodo: (id: string, newText: string) => void;
  onboarding: () => void;
}

const TimerTodoView: FC<TimerTodoViewProps> = ({
  activeTaskId,
  pomodoroState,
  pomodoroRemainingTime,
  onStartPomodoro,
  onStopPomodoro,
  handleFastForward,
  handleRestartPomodoro,
  todos,
  addTodo,
  deleteTodo,
  completeTodo,
  renameTodo,
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

        {/* 新增的控制按钮 */}
        <div className="flex space-x-4 mb-4">
          <button
            onClick={handleFastForward}
            disabled={pomodoroState === 'idle'}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition duration-300 ease-in-out
              ${pomodoroState === 'idle' ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-yellow-500 text-white hover:bg-yellow-600'}`}
          >
            快进当前阶段
          </button>
          <button
            onClick={handleRestartPomodoro}
            className="px-4 py-2 bg-gray-500 text-white font-semibold rounded-full shadow-lg hover:bg-gray-600 transition duration-300 ease-in-out"
          >
            重新开始
          </button>
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
          {todos.map((todo) => (
            <li
              key={todo.id}
              className={`p-3 rounded-lg border transition-all duration-300
                ${activeTaskId === todo.id ? 'bg-indigo-50 border-indigo-300 shadow-sm' : 'bg-gray-50 border-gray-200'}
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex-grow mr-4">
                  <span className="text-lg text-gray-800 font-medium">{todo.text}</span>
                  <p className="text-sm text-gray-500">
                    已投入: {formatTime(timeAccounts[todo.id] || 0)}
                  </p>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => onStartPomodoro(todo.id)}
                    disabled={pomodoroState !== 'idle' && activeTaskId !== todo.id}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200
                      ${activeTaskId === todo.id
                        ? 'bg-orange-500 text-white'
                        : 'bg-green-500 text-white hover:bg-green-600'}
                      ${(pomodoroState !== 'idle' && activeTaskId !== todo.id) ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    {activeTaskId === todo.id ? '计时中' : '开始'}
                  </button>
                  <button onClick={() => deleteTodo(todo.id)} title="删除" className="p-2 text-gray-500 hover:text-red-600 rounded-full transition-colors">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm6 0a1 1 0 11-2 0v6a1 1 0 112 0V8z" clipRule="evenodd"></path></svg>
                  </button>
                  <button onClick={() => completeTodo(todo.id)} title="完成" className="p-2 text-gray-500 hover:text-green-600 rounded-full transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};


// 2. 账户管理与结转界面
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

const AccountTransferView: FC<AccountTransferViewProps> = ({ allAccountNames, todos, renameAccount, deleteAccount, addTimeLogEntry, completedMonuments, archiveMonument, getAccountType, getAccountDisplayName, isManageable }) => {
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
    switch (getAccountType(accountName)) {
      case 'todo': return 'bg-blue-50 hover:bg-blue-100';
      case 'monument': return 'bg-emerald-50 hover:bg-emerald-100';
      case 'system': return 'bg-purple-50 hover:bg-purple-100';
      default: return 'bg-gray-50 hover:bg-gray-100';
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-6xl mx-auto">
      {/* 左侧：账户列表与管理 */}
      <div className="w-full lg:w-1/2 bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-3xl font-bold text-indigo-700">账户列表</h2>
          <div className="relative">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="appearance-none bg-gray-100 border border-gray-300 rounded-md py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">所有账户</option>
              <option value="todo">待办账户</option>
              <option value="monument">纪念碑</option>
              <option value="system">系统账户</option>
              <option value="general">通用账户</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
          </div>
          <label className="flex items-center text-sm text-gray-600">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
              className="mr-2 h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
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
                      className="flex-grow px-2 py-1 border border-indigo-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      autoFocus
                      onKeyPress={(e) => { if (e.key === 'Enter') handleSaveEditing(accountName); }}
                    />
                    <button onClick={() => handleSaveEditing(accountName)} className="p-1 text-green-600 hover:text-green-800" title="保存">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    </button>
                    <button onClick={handleCancelEditing} className="p-1 text-gray-500 hover:text-gray-700" title="取消">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="font-medium text-gray-700 flex-grow">
                      {isCompleted && <span className="text-gray-400">[已归档] </span>}
                      {getAccountDisplayName(accountName)}
                    </span>
                    <span className="font-bold text-indigo-600 mr-4">
                      {formatTime(timeAccounts[accountName])}
                    </span>
                    
                    <div className="flex items-center space-x-1">
                      {isManageable(accountName) && (
                        <>
                          <button onClick={() => handleStartEditing(accountName)} title="重命名" className="p-2 text-gray-500 hover:text-blue-600 rounded-full transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z"></path></svg>
                          </button>
                          <button onClick={() => deleteAccount(accountName)} title="删除" className="p-2 text-gray-500 hover:text-red-600 rounded-full transition-colors">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm6 0a1 1 0 11-2 0v6a1 1 0 112 0V8z" clipRule="evenodd"></path></svg>
                          </button>
                        </>
                      )}
                      {getAccountType(accountName) === 'monument' && !isCompleted && (
                        <button onClick={() => archiveMonument(accountName)} title="归档纪念碑" className="p-2 text-gray-500 hover:text-blue-600 rounded-full transition-colors">
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
      <div className="w-full lg:w-1/2 bg-white rounded-lg shadow-md p-6 flex flex-col">
        <h2 className="text-3xl font-bold text-indigo-700 mb-6 text-center">
          执行时间结转
        </h2>
        <p className="text-sm text-gray-600 mb-4 text-center">
          （例如：将"编写代码"的时间结转到"纪念碑 - 核心原型完成"）
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
        </div>
        <button
          onClick={handleTransfer}
          className="w-full py-3 px-4 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 transition duration-300 ease-in-out mt-4"
        >
          执行结转
        </button>
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
        "纪念碑"是您所有投入时间最终转化为的回报或成就的集合。您可以自定义不同的纪念碑来反映您的产出。
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
  // 不为这些特殊账户或纪念碑子科目显示树木
  if (timeSpent === undefined || taskId.includes('未分配') || taskId.includes('休息') || taskId.startsWith('纪念碑 -') || taskId.includes('无效') || taskId.includes('默认损失')) {
      return null; // 新增过滤"默认损失"账户
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

// 指导模态框组件 (在真实项目中应独立为单独文件，便于非技术人员编辑内容)
const OnboardingModal: FC<OnboardingModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full m-4 relative animate-fade-in">
        <h2 className="text-3xl font-bold text-indigo-700 mb-6 text-center">
          时间复式记账法：工作原理
        </h2>
        <p className="text-gray-700 mb-4 leading-relaxed">
          想象一下，您的时间是您最宝贵的资产。就像会计中的资金一样，时间可以被"记账"和"流转"。
        </p>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">核心概念:</h3>
        <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
          <li>
            <strong>时间账户：</strong> 每个任务、项目、甚至您每天的"未分配时间"都可以视为一个独立的账户。
          </li>
          <li>
            <strong>借方与贷方：</strong>
            当你开始一个任务时，时间会从一个账户（如"未分配时间"）
            <span className="font-bold text-red-600">贷出</span> (减少)，同时被
            <span className="font-bold text-green-600">借入</span>
            到您正在进行的任务账户 (增加)。
          </li>
          <li>
            <strong>时间"结转"：</strong>
            当您完成一个任务或阶段性工作后，您可以将任务账户中花费的时间"结转"到"产出账户"或另一个相关项目账户。例如，您在"学习会计"上花费的时间，最终会"结转"到"项目产出 - 会计原型"账户中，代表您的投入已转化为实际成果。
          </li>
          <li>
            <strong>平衡：</strong>
            永远保持总借方时间等于总贷方时间，确保您的时间流向清晰可追溯。
          </li>
        </ul>
        <p className="text-gray-700 mb-6 leading-relaxed">
          通过这种方式，您可以清晰地追踪时间投入，评估产出效率，并在每个"会计周期"结束后进行分析和调整。
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

// 计时日志界面
interface TimeLogViewProps {
  timeLogs: TimeLog[];
  todos: Todo[];
  formatTime: (seconds: number) => string;
  clearTimeLogs: () => void;
}

const TimeLogView: FC<TimeLogViewProps> = ({ timeLogs, todos, formatTime, clearTimeLogs }) => {
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
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-indigo-700">
          计时与结转日志
        </h2>
        {timeLogs.length > 0 && (
          <button
            onClick={clearTimeLogs}
            className="px-4 py-2 bg-red-500 text-white font-semibold rounded-lg shadow-md hover:bg-red-600 transition duration-300 ease-in-out text-sm"
          >
            清除全部日志
          </button>
        )}
      </div>
      {timeLogs.length === 0 ? (
        <p className="text-center text-gray-500">暂无日志记录。</p>
      ) : (
        <ul className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
          {[...timeLogs].sort((a, b) => b.timestamp - a.timestamp).map((log) => (
            <li
              key={log.id}
              className={`p-4 rounded-lg shadow-sm
                ${log.type === 'timer' ? 'bg-blue-50 border border-blue-200' : 'bg-purple-50 border border-purple-200'}
              `}
            >
              <p className="text-xs text-gray-500 mb-1">
                {new Date(log.timestamp).toLocaleString()}
              </p>
              {log.type === 'timer' ? (
                <div>
                  <p className="text-lg font-semibold text-gray-800">
                    <span className="text-blue-700">[计时]</span> {log.taskText || log.taskId}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    总计: {formatTime((log.endTime! - log.startTime!) / 1000)}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-lg font-semibold text-gray-800">
                    <span className="text-purple-700">[结转]</span> 将 <span className="font-bold">{formatTransferAmount(log.transferAmount || 0)}</span> 从
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
