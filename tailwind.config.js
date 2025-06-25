/** @type {import('tailwindcss').Config} */
const themes = {
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                serif: ['Merriweather', 'Georgia', 'serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            colors: {
                primary: {
                    50: '#E8EDF2',
                    100: '#D1DBE5',
                    200: '#A3B7CB',
                    300: '#7593B1',
                    400: '#476F97',
                    500: '#1E2E3D',
                    600: '#182538',
                    700: '#121C33',
                    800: '#0C132E',
                    900: '#060A29',
                },
                secondary: {
                    50: '#F5F4F4',
                    100: '#EBE9E9',
                    200: '#D7D3D3',
                    300: '#C3BDBC',
                    400: '#AFA7A6',
                    500: '#291F1E',
                    600: '#211918',
                    700: '#191312',
                    800: '#110D0C',
                    900: '#090706',
                },
                accent: {
                    50: '#F5F7F3',
                    100: '#EBEFE7',
                    200: '#D7DFCF',
                    300: '#C3CFB7',
                    400: '#AFBF9F',
                    500: '#C4D6B0',
                    600: '#B0C69C',
                    700: '#9CB688',
                    800: '#88A674',
                    900: '#749660',
                },
            },
        },
    },
    plugins: [],
}

export default themes