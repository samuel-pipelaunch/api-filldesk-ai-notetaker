import type { Config } from 'tailwindcss';

export const tailwindConfig: Config = {
  content: ['./src/app/**/*.{ts,tsx}', './src/components/**/*.{ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default tailwindConfig;