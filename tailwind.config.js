/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // 确保扫描 .js, .jsx, .ts, .tsx 文件
  ],
  theme: {
    extend: {
      fontFamily: {
        inter: ['Inter', 'sans-serif'], // 确保 Inter 字体系列被 Tailwind 识别
      },
    },
  },
  plugins: [],
}