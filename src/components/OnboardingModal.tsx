import React, { FC } from 'react';

interface OnboardingModalProps {
  onClose: () => void;
}

export const OnboardingModal: FC<OnboardingModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-2xl w-full m-4 relative animate-fade-in">
        <h2 className="text-3xl font-bold text-indigo-700 dark:text-indigo-400 mb-6 text-center">
          时间复式记账法：工作原理
        </h2>
        <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
          想象一下，您的时间是您最宝贵的资产。就像会计中的资金一样，时间可以被"记账"和"流转"。
        </p>
        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">核心概念:</h3>
        <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-4 space-y-2">
          <li>
            <strong>时间账户：</strong> 每个任务、项目、甚至您每天的"未分配时间"都可以视为一个独立的账户。
          </li>
          <li>
            <strong>借方与贷方：</strong>
            当你开始一个任务时，时间会从一个账户（如"未分配时间"）
            <span className="font-bold text-red-600 dark:text-red-400">贷出</span> (减少)，同时被
            <span className="font-bold text-green-600 dark:text-green-400">借入</span>
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
        <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
          通过这种方式，您可以清晰地追踪时间投入，评估产出效率，并在每个"会计周期"结束后进行分析和调整。
        </p>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white text-2xl font-bold"
          aria-label="关闭"
        >
          &times;
        </button>
        <button
          onClick={onClose}
          className="w-full px-6 py-3 bg-indigo-600 text-white font-semibold rounded-full shadow-lg hover:bg-indigo-700 dark:hover:bg-indigo-500 transition duration-300 ease-in-out"
        >
          开始体验
        </button>
      </div>
    </div>
  );
}; 