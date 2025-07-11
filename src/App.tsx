import React, { useState, useEffect, useRef, useMemo } from 'react';
import { TimeAccounts, Todo, TimeLog } from './types';
import { TimeAccountsContext } from './contexts/TimeAccountsContext';
import { ModalProvider, useModal } from './contexts/ModalContext';
import { TimerTodoView } from './components/TimerTodoView';
import { AccountTransferView } from './components/AccountTransferView';
import { MonumentsView } from './components/MonumentsView';
import { SettingsView } from './components/SettingsView';
import { TimeLogView } from './components/TimeLogView';
import { OnboardingModal } from './components/OnboardingModal';

const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: { on: () => {}, send: () => {} } };

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
const AppContent: React.FC = () => {
  const { showConfirm, showAlert } = useModal();
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
  const [accountOrder, setAccountOrder] = useState<string[]>([]); // 新增：账户顺序
  const [isLoading, setIsLoading] = useState(true); // 新增：加载状态，防止初始状态覆盖本地存储
  
  // 番茄钟设置
  const [pomodoroSettings, setPomodoroSettings] = useState({
    focusTime: 25 * 60, // 25 分钟专注
    breakTime: 5 * 60,  // 5 分钟休息
  });

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

      // 加载 Pomodoro Settings
      const savedSettings = localStorage.getItem('pomodoroSettings');
      if (savedSettings) {
        setPomodoroSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error("Failed to load data from local storage", error);
    } finally {
      // 所有加载完成后，设置 loading 为 false
      setIsLoading(false);
    }
  }, []); // 空依赖数组，只在组件挂载时运行一次

  // Effect to synchronize accountOrder with timeAccounts after loading or changes
  useEffect(() => {
    // Don't run this logic until the initial load is complete
    if (isLoading) {
      return;
    }

    const savedOrder = JSON.parse(localStorage.getItem('accountOrder') || '[]');
    const accountKeys = Object.keys(timeAccounts);

    // Reconcile the order: keep existing ordered keys, and add new keys to the end.
    const reconciledOrder = [
      ...savedOrder.filter((key: string) => accountKeys.includes(key)),
      ...accountKeys.filter((key: string) => !savedOrder.includes(key))
    ];
    
    // Only update if they are actually different to avoid render loops.
    if (JSON.stringify(reconciledOrder) !== JSON.stringify(accountOrder)) {
       setAccountOrder(reconciledOrder);
    }
  // This effect should run whenever the source of truth for accounts changes.
  }, [timeAccounts, isLoading]);

  // **保存数据**
  useEffect(() => {
    // 只有在加载完成后才开始保存，防止初始状态覆盖
    if (!isLoading) {
      try {
        localStorage.setItem('todos', JSON.stringify(todos));
        localStorage.setItem('timeAccounts', JSON.stringify(timeAccounts));
        localStorage.setItem('accountOrder', JSON.stringify(accountOrder)); // 保存账户顺序
        localStorage.setItem('pomodoroSettings', JSON.stringify(pomodoroSettings)); // 保存设置
        if (timeLogs.length > 0) {
            localStorage.setItem('timeLogs', JSON.stringify(timeLogs));
        }
      } catch (error) {
        console.error("Failed to save data to local storage", error);
      }
    }
  }, [todos, timeAccounts, timeLogs, isLoading, pomodoroSettings, accountOrder]); // 当任何数据改变且加载完成后触发

  // 当前激活的任务ID (用于番茄钟将时间归类)
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  // 当前番茄钟状态：'idle', 'focus', 'break'
  const [pomodoroState, setPomodoroState] = useState<'idle' | 'focus' | 'break'>('idle');
  // 番茄钟剩余时间 (秒)
  const [pomodoroRemainingTime, setPomodoroRemainingTime] = useState<number>(0);

  // 用于"重新开始"时回溯时间：记录当前阶段开始时，相关账户的初始时间值
  const initialTimeAtPhaseStartRef = useRef<number>(0);
  // 用于"重新开始"时回溯时间：记录当前阶段开始时，对应的活跃任务ID
  const activeTaskAtPhaseStartRef = useRef<string | null>(null);

  const phaseStartTimeRef = useRef<number | null>(null); // 新增：记录当前阶段开始时间

  // 计时器ID
  const timerWorkerRef = useRef<Worker | null>(null);
  
  // 使用 ref 存储当前状态，确保计时器总是使用最新值
  const currentPomodoroStateRef = useRef<'idle' | 'focus' | 'break'>(pomodoroState);
  const currentActiveTaskIdRef = useRef<string | null>(activeTaskId);
  const currentTodosRef = useRef<Todo[]>(todos); // New: Ref to store the latest todos
  
  // 更新 ref 值
  useEffect(() => {
    currentPomodoroStateRef.current = pomodoroState;
  }, [pomodoroState]);
  
  useEffect(() => {
    currentActiveTaskIdRef.current = activeTaskId;
  }, [activeTaskId]);

  useEffect(() => {
    currentTodosRef.current = todos; // New: Update currentTodosRef whenever todos changes
  }, [todos]);

  // Web Worker for the timer
  useEffect(() => {
    // Vite specific syntax for loading a worker
    timerWorkerRef.current = new Worker(new URL('/timer.worker.js', import.meta.url), { type: 'module' });

    timerWorkerRef.current.onmessage = (e) => {
      const { type, remainingTime } = e.data;

      if (type === 'tick') {
        setPomodoroRemainingTime(remainingTime);
        
        // Time accumulation logic, now driven by worker ticks
        setTimeAccounts((prevAccounts) => {
          const newAccounts = { ...prevAccounts };
          if (currentPomodoroStateRef.current === 'focus') {
            const activeTodo = currentTodosRef.current.find(t => t.id === currentActiveTaskIdRef.current);
            const targetAccount = activeTodo?.linkedAccountId || currentActiveTaskIdRef.current || '未分配时间 (Unallocated)';
            newAccounts[targetAccount] = (newAccounts[targetAccount] || 0) + 1;
          } else if (currentPomodoroStateRef.current === 'break') {
            newAccounts['休息时间 (Rest Time)'] = (newAccounts['休息时间 (Rest Time)'] || 0) + 1;
          }
          return newAccounts;
        });
      } else if (type === 'done') {
        // Time has run out, switch phase
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
          showNotification('专注时间结束！', '现在是休息时间。');
          timerWorkerRef.current?.postMessage({ command: 'start', value: pomodoroSettings.breakTime });
        } else if (currentPomodoroStateRef.current === 'break') {
          const stopTime = Date.now();
          if (phaseStartTimeRef.current) {
            addTimeLogEntry({
              type: 'timer',
              taskId: '休息时间 (Rest Time)',
              startTime: phaseStartTimeRef.current,
              endTime: stopTime,
            });
          }
          phaseStartTimeRef.current = null;
          setPomodoroState('idle');
          setPomodoroRemainingTime(0);
          setActiveTaskId(null);
          activeTaskAtPhaseStartRef.current = null;
          initialTimeAtPhaseStartRef.current = 0;
          showNotification('休息时间结束！', '准备开始下一个专注。');
        }
      }
    };
    
    // Cleanup on component unmount
    return () => {
      timerWorkerRef.current?.terminate();
    };
  }, []); // Empty dependency array, run once on mount

  // 显示指导模态框
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  // 每个时间单位的树木增长视觉效果
  const timeUnitForGrowth: number = 60; // 60秒 = 1分钟，用于树木增长的单位

  // 导航栏当前视图
  const [currentView, setCurrentView] = useState<'timerTodo' | 'accountTransfer' | 'monuments' | 'settings' | 'timeLog'>('timerTodo'); // 默认为计时与待办界面
  const [todoViewMode, setTodoViewMode] = useState<'visual' | 'text'>('visual');

  // 新增：通知权限状态
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'system');
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(false);

  useEffect(() => {
    const root = window.document.documentElement;
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    root.classList.toggle('dark', isDark);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    // 组件挂载时检查当前通知权限
    setNotificationPermission(Notification.permission);
  }, []);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      showAlert('不支持的浏览器', '此浏览器不支持桌面通知');
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
  };

  const handleExportData = () => {
    const backupData = {
      todos,
      timeAccounts,
      timeLogs,
      completedMonuments,
      pomodoroSettings,
      theme,
    };
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(backupData, null, 2)
    )}`;
    const link = document.createElement("a");
    link.href = jsonString;
    const date = new Date().toISOString().split('T')[0];
    link.download = `imcount-backup-${date}.json`;
    link.click();
    showAlert('导出成功', '您的数据已成功导出为 JSON 文件。');
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text !== 'string') {
        showAlert('导入失败', '无法读取文件内容。');
        return;
      }

      showConfirm(
        '确认导入数据',
        '这将覆盖您当前的所有数据，此操作无法撤销。您确定要继续吗？',
        () => {
          try {
            const data = JSON.parse(text);
            // Basic validation
            if (data.todos && data.timeAccounts && data.pomodoroSettings) {
              setTodos(data.todos);
              setTimeAccounts(data.timeAccounts);
              setTimeLogs(data.timeLogs || []);
              setCompletedMonuments(data.completedMonuments || []);
              setPomodoroSettings(data.pomodoroSettings);
              setTheme(data.theme || 'system');
              showAlert('导入成功', '您的数据已成功恢复。');
            } else {
              showAlert('导入失败', '文件格式无效或缺少必要数据。');
            }
          } catch (error) {
            showAlert('导入失败', '解析文件时出错，请确保文件是有效的 JSON 格式。');
          }
        }
      );
    };
    reader.readAsText(file);
    // Reset file input so the same file can be imported again
    event.target.value = '';
  };

  const showNotification = (title: string, body: string) => {
    if (notificationPermission === 'granted') {
      new Notification(title, { body });
    }
  };

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
    const focusTime = pomodoroSettings.focusTime;
    setPomodoroRemainingTime(focusTime); // 设置专注时间
    timerWorkerRef.current?.postMessage({ command: 'start', value: focusTime });
  };

  // 处理停止番茄钟（正常停止或切换任务）
  const handleStopPomodoro = () => {
    timerWorkerRef.current?.postMessage({ command: 'stop' });

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

  // 新增：重新开始番茄钟（完全重置，已投入时间计入"默认损失"）
  const handleRestartPomodoro = () => {
    timerWorkerRef.current?.postMessage({ command: 'stop' });

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
        showAlert('操作成功', `已将 ${formatTime(timeAccumulatedInCurrentPhase)} 计入"默认损失"账户。`);
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
  const addTodo = (text: string, parentId: string | null = null, linkedAccountId?: string) => {
    const newId = `Todo-${Date.now()}`;
    const newTodo: Todo = { id: newId, text, isCompleted: false, parentId, linkedAccountId };
    setTodos(prevTodos => [...prevTodos, newTodo]);
    // Only create a new time account entry if it's not a linked todo
    if (!linkedAccountId) {
      setTimeAccounts(prevAccounts => ({ ...prevAccounts, [newId]: 0 }));
    }
    return newId; // Explicitly return the new todo's ID
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

  // 删除待办任务 (包括所有子任务)
  const deleteTodo = (id: string) => {
    // Find all children and grand-children recursively
    const idsToDelete = [id];
    const findChildren = (parentId: string) => {
      todos.forEach(todo => {
        if (todo.parentId === parentId) {
          idsToDelete.push(todo.id);
          findChildren(todo.id);
        }
      });
    };
    findChildren(id);

    // Stop timer if any of the deleted todos were the active one
    if (idsToDelete.includes(currentActiveTaskIdRef.current || '')) {
      handleStopPomodoro();
    }

    // Filter out all todos to be deleted
    setTodos(prevTodos => prevTodos.filter(todo => !idsToDelete.includes(todo.id)));

    // Remove the corresponding time accounts
    setTimeAccounts((prevAccounts) => {
      const newAccounts = { ...prevAccounts };
      idsToDelete.forEach(deletedId => {
        delete newAccounts[deletedId];
      });
      return newAccounts;
    });
  };

  const moveTodo = (draggableId: string, newParentId: string | null, targetId: string | null) => {
    setTodos(currentTodos => {
      const newTodos = [...currentTodos];

      const draggedSubtree: Todo[] = [];
      const idMap = new Map(newTodos.map(t => [t.id, t]));

      const findDescendantsRecursive = (id: string) => {
        const todo = idMap.get(id);
        if (todo) {
          draggedSubtree.push(todo);
          const children = newTodos.filter(t => t.parentId === id);
          children.forEach(child => findDescendantsRecursive(child.id));
        }
      };
      findDescendantsRecursive(draggableId);

      if (draggedSubtree.length === 0) {
        return currentTodos;
      }

      const subtreeIds = new Set(draggedSubtree.map(t => t.id));
      const remainingTodos = newTodos.filter(t => !subtreeIds.has(t.id));

      const draggedItem = draggedSubtree[0];
      draggedItem.parentId = newParentId;

      let insertionIndex = -1;
      if (targetId) {
        insertionIndex = remainingTodos.findIndex(t => t.id === targetId);
      } else if (newParentId) {
        const parentSubtreeIds = new Set<string>();
        const findParentDescendants = (id: string) => {
          parentSubtreeIds.add(id);
          const children = remainingTodos.filter(t => t.parentId === id);
          children.forEach(child => findParentDescendants(child.id));
        };
        findParentDescendants(newParentId);
        
        let lastIndexOfParentSubtree = -1;
        for (let i = remainingTodos.length - 1; i >= 0; i--) {
          if (parentSubtreeIds.has(remainingTodos[i].id)) {
            lastIndexOfParentSubtree = i;
            break;
          }
        }
        insertionIndex = lastIndexOfParentSubtree + 1;
      }

      if (insertionIndex !== -1 && insertionIndex < remainingTodos.length) {
        remainingTodos.splice(insertionIndex, 0, ...draggedSubtree);
      } else {
        remainingTodos.push(...draggedSubtree);
      }
      
      return remainingTodos;
    });
  };

  const reorderAccounts = (startIndex: number, endIndex: number) => {
    const result = Array.from(accountOrder);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    setAccountOrder(result);
  };

  const transferTime = (fromAccount: string, toAccount: string, transferAmount: number) => {
    setTimeAccounts((prevAccounts) => {
      const newAccounts = { ...prevAccounts };
      newAccounts[fromAccount] -= transferAmount;
      newAccounts[toAccount] = (newAccounts[toAccount] || 0) + transferAmount;
      return newAccounts;
    });

    addTimeLogEntry({
      type: 'transfer',
      fromAccount,
      toAccount,
      transferAmount
    });
  };

  // Helper function to allow replacing the entire todos array, useful for text parsing.
  const replaceTodos = (newTodos: Todo[]) => {
    setTodos(newTodos);

    // Also update time accounts to match the new set of todos
    const newAccountKeys = newTodos.map(t => t.id);
    setTimeAccounts(prevAccounts => {
        const updatedAccounts = { ...prevAccounts };
        // Remove accounts for deleted todos
        Object.keys(prevAccounts).forEach(key => {
            if (key.startsWith('Todo-') && !newAccountKeys.includes(key)) {
                delete updatedAccounts[key];
            }
        });
        // Add accounts for new todos
        newTodos.forEach(todo => {
            if (updatedAccounts[todo.id] === undefined) {
                updatedAccounts[todo.id] = 0;
            }
        });
        return updatedAccounts;
    });
  };

  // 添加纪念碑子科目（供 MonumentsView 调用）
  const addMonumentAccount = (name: string): boolean => {
    const monumentId = `纪念碑 - ${name}`;
    if (timeAccounts[monumentId] !== undefined) {
      showAlert('创建失败', `纪念碑科目 "${name}" 已经存在！`);
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
    showConfirm(
      '确认清除',
      '您确定要清除所有计时和结转日志吗？此操作无法撤销。',
      () => {
      setTimeLogs([]);
      localStorage.removeItem('timeLogs');
    }
    );
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
  
  // Helper functions for account types and display names
  const getAccountType = (accountName: string): string => {
    if (accountName.startsWith('Todo-')) return 'todo';
    if (accountName.startsWith('纪念碑 -')) return 'monument';
    if (['未分配时间 (Unallocated)', '休息时间 (Rest Time)', '无效消耗 (Wasted Time)', '默认损失 (Default Loss)'].includes(accountName)) return 'system';
    return 'general';
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

  const renameAccount = (oldName: string, newName: string) => {
    const trimmedNewName = newName.trim();
    if (!trimmedNewName) {
      showAlert('重命名失败', "账户名称不能为空。");
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
      showAlert('重命名失败', `账户 "${trimmedNewName}" 已存在。`);
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

    // 更新 accountOrder 状态
    setAccountOrder(prevOrder => prevOrder.map(key => key === oldName ? trimmedNewName : key));

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
    const displayName = getAccountDisplayName(accountName);
    showConfirm(
      `确认删除账户`,
      `您确定要删除账户 "${displayName}" 吗？\n此操作将移除其所有累计时间，且无法撤销。`,
      () => {
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
      
      // 从顺序中删除
      setAccountOrder(prevOrder => prevOrder.filter(key => key !== accountName));

      // 如果删除的是当前活动任务，则停止计时
      if (activeTaskId === accountName) {
        handleStopPomodoro();
      }

      // 如果删除的是已归档的纪念碑，也从归档列表中移除
      if (accountType === 'monument' && completedMonuments.includes(accountName)) {
          setCompletedMonuments(prev => prev.filter(m => m !== accountName));
      }
    }
    );
  };

  const convertToTodo = (accountName: string) => {
    // Create a new todo, linking it to the original account.
    // The time accumulation will now happen directly on the original account via linkedAccountId.
    addTodo(accountName, null, accountName); // text, parentId, linkedAccountId
    // No need to transfer time or delete the original account, as it remains the target for time accumulation.
  };

  const addAccount = (name: string, type: 'general' | 'monument'): boolean => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      showAlert('创建失败', '账户名称不能为空。');
      return false;
    }

    let accountKey = trimmedName;
    if (type === 'monument') {
      // Reuse existing logic for monument accounts
      return addMonumentAccount(trimmedName);
    }

    if (timeAccounts[accountKey] !== undefined) {
      showAlert('创建失败', `账户 "${trimmedName}" 已存在！`);
      return false;
    }

    setTimeAccounts(prevAccounts => ({
      ...prevAccounts,
      [accountKey]: 0,
    }));
    setAccountOrder(prevOrder => [...prevOrder, accountKey]);
    showAlert('创建成功', `账户 "${trimmedName}" 已成功创建。`);
    return true;
  };

  const handleToggleAlwaysOnTop = (isAlwaysOnTop: boolean) => {
    setIsAlwaysOnTop(isAlwaysOnTop);
    ipcRenderer.send('toggle-always-on-top', isAlwaysOnTop);
  };

  return (
    // 使用Context Provider包裹整个应用，以便子组件访问时间账户数据
    <TimeAccountsContext.Provider value={contextValue}>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 font-inter text-gray-800 dark:text-gray-200 flex flex-col">
        {/* 导航栏 */}
        <nav className="bg-indigo-700 dark:bg-gray-800 text-white shadow-lg p-4 sticky top-0 z-10">
          <ul className="flex justify-around text-lg font-semibold">
            <li>
              <button
                onClick={() => setCurrentView('timerTodo')}
                className={`py-2 px-4 rounded-full transition duration-300 ease-in-out
                  ${currentView === 'timerTodo' ? 'bg-indigo-500 dark:bg-indigo-600' : 'hover:bg-indigo-600 dark:hover:bg-indigo-700'}`}
              >
                计时与待办
              </button>
            </li>
            <li>
              <button
                onClick={() => setCurrentView('accountTransfer')}
                className={`py-2 px-4 rounded-full transition duration-300 ease-in-out
                  ${currentView === 'accountTransfer' ? 'bg-indigo-500 dark:bg-indigo-600' : 'hover:bg-indigo-600 dark:hover:bg-indigo-700'}`}
              >
                账户管理
              </button>
            </li>
            <li>
              <button
                onClick={() => setCurrentView('monuments')}
                className={`py-2 px-4 rounded-full transition duration-300 ease-in-out
                  ${currentView === 'monuments' ? 'bg-indigo-500 dark:bg-indigo-600' : 'hover:bg-indigo-600 dark:hover:bg-indigo-700'}`}
              >
                纪念碑
              </button>
            </li>
            <li>
              <button
                onClick={() => setCurrentView('timeLog')}
                className={`py-2 px-4 rounded-full transition duration-300 ease-in-out
                  ${currentView === 'timeLog' ? 'bg-indigo-500 dark:bg-indigo-600' : 'hover:bg-indigo-600 dark:hover:bg-indigo-700'}`}
              >
                计时日志
              </button>
            </li>
            <li>
              <button
                onClick={() => setCurrentView('settings')}
                className={`py-2 px-4 rounded-full transition duration-300 ease-in-out
                  ${currentView === 'settings' ? 'bg-indigo-500 dark:bg-indigo-600' : 'hover:bg-indigo-600 dark:hover:bg-indigo-700'}`}
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
              handleRestartPomodoro={handleRestartPomodoro}
              todos={todos}
              addTodo={addTodo}
              deleteTodo={deleteTodo}
              completeTodo={completeTodo}
              renameTodo={renameTodo}
              onboarding={() => setShowOnboarding(true)}
              moveTodo={moveTodo}
              todoViewMode={todoViewMode}
              setTodoViewMode={setTodoViewMode}
              replaceTodos={replaceTodos}
              showConfirm={showConfirm}
              convertToTodo={convertToTodo}
              timeAccounts={timeAccounts}
              formatTime={formatTime}
              getAccountType={getAccountType}
              getAccountDisplayName={getAccountDisplayName}
              isManageable={isManageable}
            />
          )}

          {currentView === 'accountTransfer' && (
            <AccountTransferView
              accountOrder={accountOrder}
              timeAccounts={timeAccounts}
              todos={todos}
              renameAccount={renameAccount}
              deleteAccount={deleteAccount}
              transferTime={transferTime}
              formatTime={formatTime}
              completedMonuments={completedMonuments}
              archiveMonument={archiveMonument}
              getAccountType={getAccountType}
              getAccountDisplayName={getAccountDisplayName}
              isManageable={isManageable}
              reorderAccounts={reorderAccounts}
              convertToTodo={convertToTodo}
              addAccount={addAccount}
            />
          )}

          {currentView === 'monuments' && (
            <MonumentsView showAlert={showAlert} />
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
            <SettingsView
              settings={pomodoroSettings}
              onSettingsChange={setPomodoroSettings}
              notificationPermission={notificationPermission}
              onRequestNotificationPermission={requestNotificationPermission}
              onExport={handleExportData}
              onImport={handleImportData}
              theme={theme}
              setTheme={setTheme}
              isAlwaysOnTop={isAlwaysOnTop}
              onToggleAlwaysOnTop={handleToggleAlwaysOnTop}
            />
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

const App: React.FC = () => {
  return (
    <ModalProvider>
      <AppContent />
    </ModalProvider>
  );
};

export default App;
