import React, { useContext, FC } from 'react';
import { TimeAccountsContext } from '../contexts/TimeAccountsContext';

interface TreeDisplayProps {
  taskId: string;
}

export const TreeDisplay: FC<TreeDisplayProps> = ({ taskId }) => {
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