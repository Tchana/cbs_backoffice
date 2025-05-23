/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
        extend: {
            colors: {
                primary: '#6610F2',
                secondary: '#291F1E',
                accent: '#C4D6B0',
            },
        },
    },
    plugins: [],
};
