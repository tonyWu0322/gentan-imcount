import React, { useState, useContext, FC, useMemo, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Todo } from '../types';
import { TimeAccountsContext } from '../contexts/TimeAccountsContext';

interface TimerTodoViewProps {
  activeTaskId: string | null;
  pomodoroState: 'idle' | 'focus' | 'break';
  pomodoroRemainingTime: number;
  onStartPomodoro: (taskId: string) => void;
  onStopPomodoro: () => void;
  handleRestartPomodoro: () => void;
  todos: Todo[];
  addTodo: (text: string, parentId?: string | null) => string;
  deleteTodo: (id: string) => void;
  completeTodo: (id: string) => void;
  renameTodo: (id: string, newText: string) => void;
  onboarding: () => void;
  todoViewMode: 'visual' | 'text';
  setTodoViewMode: (mode: 'visual' | 'text') => void;
  replaceTodos: (todos: Todo[]) => void;
  moveTodo: (draggableId: string, newParentId: string | null, targetId: string | null) => void;
  showConfirm: (title: string, message: string, onConfirm: () => void) => void;
  convertToTodo: (accountName: string) => void;
  timeAccounts: { [key: string]: number };
  formatTime: (seconds: number) => string;
  getAccountType: (accountName: string) => string;
  getAccountDisplayName: (accountName: string) => string;
  isManageable: (accountName: string) => boolean;
}

// Helper to render the todo item content, now separated for clarity
const TodoItemContent: FC<{
  todo: Todo;
  addTodo: (text: string, parentId?: string | null) => string;
  onStartPomodoro: (taskId: string) => void;
  deleteTodo: (id: string) => void;
  completeTodo: (id: string) => void;
  activeTaskId: string | null;
  pomodoroState: 'idle' | 'focus' | 'break';
  timeAccounts: { [key: string]: number };
  formatTime: (seconds: number) => string;
  showConfirm: (title: string, message: string, onConfirm: () => void) => void;
  moveTodo: (draggableId: string, newParentId: string | null, targetId: string | null) => void;
}> = ({ todo, addTodo, ...props }) => {
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [subtaskText, setSubtaskText] = useState('');

  const handleAddSubtask = () => {
    if (subtaskText.trim()) {
      addTodo(subtaskText.trim(), todo.id);
      setSubtaskText('');
      setIsAddingSubtask(false);
    }
  };

  return (
    <div>
      <div className={`p-3 rounded-lg border transition-all duration-300
        ${props.activeTaskId === todo.id ? 'bg-indigo-50 dark:bg-indigo-900 border-indigo-300 dark:border-indigo-600 shadow-md' : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'}
      `}>
        <div className="flex items-center justify-between">
          <div className="flex-grow mr-4">
            <span className="text-lg text-gray-800 dark:text-gray-100 font-medium">{todo.text}</span>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              已投入: {props.formatTime(props.timeAccounts[todo.id] || 0)}
            </p>
          </div>
          <div className="flex items-center space-x-1">
            <button onClick={() => setIsAddingSubtask(!isAddingSubtask)} title="Add Sub-task" className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-full transition-colors">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </button>
            <button
              onClick={() => props.onStartPomodoro(todo.id)}
              disabled={props.pomodoroState !== 'idle' && props.activeTaskId !== todo.id}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200
                ${props.activeTaskId === todo.id ? 'bg-orange-500 text-white' : 'bg-green-500 text-white hover:bg-green-600 dark:hover:bg-green-400'}
                ${(props.pomodoroState !== 'idle' && props.activeTaskId !== todo.id) ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {props.activeTaskId === todo.id ? '计时中' : '开始'}
            </button>
            <button onClick={() => props.deleteTodo(todo.id)} title="删除" className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-full transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm6 0a1 1 0 11-2 0v6a1 1 0 112 0V8z" clipRule="evenodd"></path></svg>
            </button>
            <button onClick={() => props.completeTodo(todo.id)} title="完成" className="p-2 text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 rounded-full transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
            </button>
          </div>
        </div>
        {isAddingSubtask && (
          <div className="mt-3 flex">
            <input
              type="text"
              value={subtaskText}
              onChange={(e) => setSubtaskText(e.target.value)}
              placeholder="输入子任务..."
              className="flex-grow px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-l-lg focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
              onKeyPress={(e) => { if (e.key === 'Enter') handleAddSubtask(); }}
              autoFocus
            />
            <button onClick={handleAddSubtask} className="px-4 py-1 bg-indigo-600 text-white font-semibold rounded-r-lg hover:bg-indigo-700 dark:hover:bg-indigo-500 transition duration-300 ease-in-out">
              添加
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export const TimerTodoView: FC<TimerTodoViewProps> = ({
  activeTaskId,
  pomodoroState,
  pomodoroRemainingTime,
  onStartPomodoro,
  onStopPomodoro,
  handleRestartPomodoro,
  todos,
  addTodo,
  deleteTodo,
  completeTodo,
  renameTodo,
  onboarding,
  todoViewMode,
  setTodoViewMode,
  replaceTodos,
  moveTodo,
  showConfirm,
  convertToTodo,
  timeAccounts,
  formatTime,
  getAccountType,
  getAccountDisplayName,
  isManageable
}) => {
  const context = useContext(TimeAccountsContext);
  if (!context) {
    throw new Error('TimerTodoView must be used within a TimeAccountsContext.Provider');
  }
  const { timeAccounts: contextTimeAccounts, formatTime: contextFormatTime } = context;
  const [newTodoText, setNewTodoText] = useState<string>('');
  const [textModeContent, setTextModeContent] = useState('');

  // Filter out accounts that are already todos or system accounts
  const convertibleAccounts = useMemo(() => {
    return Object.keys(timeAccounts)
      .filter(accountName => getAccountType(accountName) !== 'todo' && getAccountType(accountName) !== 'system')
      .sort((a, b) => timeAccounts[b] - timeAccounts[a]); // Sort by time, descending
  }, [timeAccounts, getAccountType]);

  // Serializer: Converts the todos array to an indented text string
  const serializeTodos = useMemo(() => {
    const buildText = (parentId: string | null, level: number): string => {
      return todos
        .filter(todo => todo.parentId === parentId)
        .map(todo => {
          const prefix = '  '.repeat(level);
          const childrenText = buildText(todo.id, level + 1);
          return `${prefix}- ${todo.text}\n${childrenText}`;
        })
        .join('');
    };
    return buildText(null, 0);
  }, [todos]);
  
  // When switching to text mode, initialize the textarea with the current todos
  useEffect(() => {
    if (todoViewMode === 'text') {
      setTextModeContent(serializeTodos);
    }
  }, [todoViewMode, serializeTodos]);

  const handleAddTodo = () => {
    if (newTodoText.trim()) {
      addTodo(newTodoText.trim(), null); // Top-level todos have null parentId
      setNewTodoText('');
    }
  };

  // Parser: Converts indented text into a structured Todo array
  const parseTodos = (text: string): Todo[] => {
      const lines = text.split('\n').filter(line => line.trim() !== '');
      const newTodos: Todo[] = [];
      const parentStack: (string | null)[] = [null]; // Stack to keep track of current parent

      lines.forEach(line => {
          const indentation = line.match(/^\s*/)?.[0].length || 0;
          const level = Math.floor(indentation / 2);
          const text = line.trim().substring(2); // Remove "- "

          // Find the corresponding todo or create a new one
          const existingTodo = todos.find(t => t.text === text && (t.parentId === parentStack[level] || (level === 0 && !t.parentId)));
          
          const newId = existingTodo ? existingTodo.id : `Todo-${Date.now()}-${Math.random()}`;
          const parentId = parentStack[level];
          
          newTodos.push({ id: newId, text, isCompleted: false, parentId });
          
          // Update parent stack for next lines
          parentStack[level + 1] = newId;
      });

      return newTodos;
  };

  const handleSaveTextMode = () => {
    const newTodos = parseTodos(textModeContent);
    const oldTodoIds = new Set(todos.map(t => t.id));
    const newTodoIds = new Set(newTodos.map(t => t.id));
    const deletedIds = Array.from(oldTodoIds).filter(id => !newTodoIds.has(id));

    if (deletedIds.length > 0) {
      showConfirm(
        '确认删除',
        `与存档相比，待办列表发生了更新，您确定要修改 ${deletedIds.length} 个任务吗？此操作无法撤销。`,
        () => {
          replaceTodos(newTodos);
          setTodoViewMode('visual');
        }
      );
    } else {
      replaceTodos(newTodos);
      setTodoViewMode('visual');
    }
  };

  type FlatTodo = { id: string; level: number; parentId: string | null | undefined };
  const getFlattenedTodos = (allTodos: Todo[]): FlatTodo[] => {
    const flatList: FlatTodo[] = [];
    const addChildren = (parentId: string | null, level: number) => {
      const children = allTodos.filter(t => t.parentId === parentId);
      children.forEach(child => {
        flatList.push({ id: child.id, level, parentId: child.parentId });
        addChildren(child.id, level + 1);
      });
    }
    addChildren(null, 0);
    return flatList;
  };
  
  const displayedTodos = todos.filter(todo => !todo.isCompleted);
  const flattenedDisplayedTodos = getFlattenedTodos(displayedTodos);

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;

    // Find the item we are dropping before
    const targetInFlatList = destination.index < flattenedDisplayedTodos.length
        ? flattenedDisplayedTodos[destination.index]
        : null;

    // If we're dropping at the end of the list, the target is null.
    // We need to figure out the new parent.
    let newParentId: string | null = null;
    let targetId: string | null = null;

    if (targetInFlatList) {
        // Dropping before a specific item. It becomes a sibling.
        newParentId = targetInFlatList.parentId || null;
        targetId = targetInFlatList.id;
    } else {
        // Dropping at the very end of the flattened list.
        // It should become a sibling of the last item in the list if it's a top-level item,
        // otherwise it becomes a top-level item itself.
        if (flattenedDisplayedTodos.length > 0) {
            const lastItem = flattenedDisplayedTodos[flattenedDisplayedTodos.length - 1];
            // If the last item is a top-level item, the new item will also be a top-level item.
            newParentId = lastItem.parentId || null;
            targetId = null; // append to the end of this sibling group
        } else {
            // Dropping into an empty list. Becomes a top-level item.
            newParentId = null;
            targetId = null;
        }
    }

    // Prevent dropping a todo onto one of its own descendants
    let p = newParentId;
    while (p) {
        if (p === draggableId) return;
        p = todos.find(t => t.id === p)?.parentId || null;
    }

    moveTodo(draggableId, newParentId, targetId);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-6xl mx-auto">
      {/* Left side: Timer ... no changes here */}
      <div className="w-full lg:w-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 flex flex-col items-center justify-center">
        <h2 className="text-3xl font-bold text-indigo-700 dark:text-indigo-400 mb-6">
          计时器
        </h2>
        <div className="text-center mb-8">
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">当前模式:</p>
          <p className={`text-4xl font-extrabold mb-4
            ${pomodoroState === 'focus' ? 'text-green-600 dark:text-green-400' : ''}
            ${pomodoroState === 'break' ? 'text-blue-600 dark:text-blue-400' : ''}
            ${pomodoroState === 'idle' ? 'text-gray-500 dark:text-gray-400' : ''}
          `}>
            {pomodoroState === 'focus' ? '专注时间' : pomodoroState === 'break' ? '休息时间' : '空闲'}
          </p>
          <p className="text-7xl font-mono text-indigo-800 dark:text-indigo-300">
            {formatTime(pomodoroRemainingTime)}
          </p>
          <p className="text-xl font-medium text-gray-700 dark:text-gray-300 mt-4">
            关联任务: {activeTaskId ? (todos.find(t=>t.id === activeTaskId)?.text || activeTaskId) : '无'}
          </p>
        </div>

        <div className="flex space-x-4 mb-8">
          {pomodoroState === 'idle' ? (
            <>
              <button
                onClick={() => onStartPomodoro('未分配时间 (Unallocated)')}
                className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-full shadow-lg hover:bg-indigo-700 dark:hover:bg-indigo-500 transition duration-300 ease-in-out"
              >
                开始计时 (未分配)
              </button>
            </>
          ) : (
            <button
              onClick={onStopPomodoro}
              className="px-6 py-3 bg-red-500 text-white font-semibold rounded-full shadow-lg hover:bg-red-600 dark:hover:bg-red-400 transition duration-300 ease-in-out"
            >
              停止计时
            </button>
          )}
        </div>
        <div className="flex space-x-4 mb-4">
          <button
            onClick={handleRestartPomodoro}
            className="px-4 py-2 bg-gray-500 text-white font-semibold rounded-full shadow-lg hover:bg-gray-600 dark:hover:bg-gray-400 transition duration-300 ease-in-out"
          >
            重新开始
          </button>
        </div>
        <button
          onClick={onboarding}
          className="px-4 py-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-sm font-semibold rounded-lg transition duration-300 ease-in-out mt-4"
        >
          什么是时间复式记账法？
        </button>
      </div>

      {/* Right side: Todo List */}
      <div className="w-full lg:w-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-3xl font-bold text-indigo-700 dark:text-indigo-400">
            我的待办列表
          </h2>
          <button
            onClick={() => setTodoViewMode(todoViewMode === 'visual' ? 'text' : 'visual')}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            {todoViewMode === 'visual' ? '文本模式' : '可视化模式'}
          </button>
        </div>
        
        {todoViewMode === 'visual' ? (
          <>
            <div className="flex mb-4">
              <input
                type="text"
                className="flex-grow px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-l-lg focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                placeholder="添加新的待办任务..."
                value={newTodoText}
                onChange={(e) => setNewTodoText(e.target.value)}
                onKeyPress={(e) => { if (e.key === 'Enter') handleAddTodo(); }}
              />
              <button
                onClick={handleAddTodo}
                className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-r-lg hover:bg-blue-700 dark:hover:bg-blue-500 transition duration-300 ease-in-out"
              >
                添加
              </button>
            </div>
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="todos-root" type="TASK">
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={`space-y-1 overflow-y-auto max-h-96 flex-grow p-1 rounded-lg transition-colors ${snapshot.isDraggingOver ? 'bg-blue-50 dark:bg-blue-900/50' : ''}`}
                  >
                    {flattenedDisplayedTodos.map(({ id, level }, index) => {
                      const todo = displayedTodos.find(t => t.id === id);
                      if (!todo) return null;

                      return (
                        <Draggable key={id} draggableId={id} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={{
                                ...provided.draggableProps.style,
                                paddingLeft: `${level * 25}px`,
                              }}
                              className="rounded-lg"
                            >
                              <TodoItemContent
                                todo={todo}
                                addTodo={addTodo}
                                onStartPomodoro={onStartPomodoro}
                                deleteTodo={deleteTodo}
                                completeTodo={completeTodo}
                                activeTaskId={activeTaskId}
                                pomodoroState={pomodoroState}
                                timeAccounts={timeAccounts}
                                formatTime={formatTime}
                                showConfirm={showConfirm}
                                moveTodo={moveTodo}
                              />
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </>
        ) : (
          <div className="flex flex-col h-full">
            <textarea
              className="flex-grow w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-900 font-mono text-sm"
              value={textModeContent}
              onChange={(e) => setTextModeContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Tab') {
                  e.preventDefault();
                  const start = e.currentTarget.selectionStart;
                  const end = e.currentTarget.selectionEnd;
                  const text = e.currentTarget.value;
                  if (e.shiftKey) {
                    // Outdent
                  } else {
                    // Indent
                    e.currentTarget.value = text.substring(0, start) + '  ' + text.substring(end);
                    e.currentTarget.selectionStart = e.currentTarget.selectionEnd = start + 2;
                  }
                }
              }}
            />
            <div className="flex justify-end space-x-2 mt-2">
              <button
                onClick={() => setTodoViewMode('visual')}
                className="px-4 py-2 rounded-md bg-gray-300 dark:bg-gray-600 hover:bg-gray-400"
              >
                取消
              </button>
              <button
                onClick={handleSaveTextMode}
                className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
              >
                保存
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 