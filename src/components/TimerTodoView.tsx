import React, { useState, useContext, FC } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Todo } from '../types';
import { TimeAccountsContext } from '../contexts/TimeAccountsContext';

interface TimerTodoViewProps {
  activeTaskId: string | null;
  pomodoroState: 'idle' | 'focus' | 'break';
  pomodoroRemainingTime: number;
  onStartPomodoro: (taskId: string) => void;
  onStopPomodoro: () => void;
  handleFastForward: () => void;
  handleRestartPomodoro: () => void;
  todos: Todo[];
  addTodo: (text: string) => void;
  deleteTodo: (id: string) => void;
  completeTodo: (id: string) => void;
  renameTodo: (id: string, newText: string) => void;
  onboarding: () => void;
  reorderTodos: (startIndex: number, endIndex: number) => void;
}

export const TimerTodoView: FC<TimerTodoViewProps> = ({
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
  onboarding,
  reorderTodos
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

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) {
      return;
    }
    reorderTodos(result.source.index, result.destination.index);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-6xl mx-auto">
      {/* 左侧：计时器 */}
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
            关联任务: {activeTaskId || '无'}
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

        {/* 新增的控制按钮 */}
        <div className="flex space-x-4 mb-4">
          <button
            onClick={handleFastForward}
            disabled={pomodoroState === 'idle'}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition duration-300 ease-in-out
              ${pomodoroState === 'idle' ? 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400 cursor-not-allowed' : 'bg-yellow-500 text-white hover:bg-yellow-600 dark:hover:bg-yellow-400'}`}
          >
            快进当前阶段
          </button>
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

      {/* 右侧：待办列表 */}
      <div className="w-full lg:w-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 flex flex-col">
        <h2 className="text-3xl font-bold text-indigo-700 dark:text-indigo-400 mb-6 text-center">
          我的待办列表
        </h2>
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
          <Droppable droppableId="todos">
            {(provided) => (
              <ul
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-3 overflow-y-auto max-h-96 flex-grow"
              >
                {todos.map((todo, index) => (
                  <Draggable key={todo.id} draggableId={todo.id} index={index}>
                    {(provided, snapshot) => (
                      <li
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`p-3 rounded-lg border transition-all duration-300
                          ${activeTaskId === todo.id ? 'bg-indigo-50 dark:bg-indigo-900 border-indigo-300 dark:border-indigo-600 shadow-md' : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'}
                          ${snapshot.isDragging ? 'ring-2 ring-indigo-500 shadow-lg' : ''}
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-grow mr-4">
                            <span className="text-lg text-gray-800 dark:text-gray-100 font-medium">{todo.text}</span>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
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
                                  : 'bg-green-500 text-white hover:bg-green-600 dark:hover:bg-green-400'}
                                ${(pomodoroState !== 'idle' && activeTaskId !== todo.id) ? 'opacity-50 cursor-not-allowed' : ''}
                              `}
                            >
                              {activeTaskId === todo.id ? '计时中' : '开始'}
                            </button>
                            <button onClick={() => deleteTodo(todo.id)} title="删除" className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-full transition-colors">
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm6 0a1 1 0 11-2 0v6a1 1 0 112 0V8z" clipRule="evenodd"></path></svg>
                            </button>
                            <button onClick={() => completeTodo(todo.id)} title="完成" className="p-2 text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 rounded-full transition-colors">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                            </button>
                          </div>
                        </div>
                      </li>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </ul>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    </div>
  );
}; 