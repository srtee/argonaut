// Theme module - theme management

let themeToggle;
let sunIcon;
let moonIcon;
const THEME_KEY = 'theme';

export function initThemeDOM() {
    themeToggle = document.getElementById('themeToggle');
    sunIcon = document.querySelector('.theme-toggle__icon--sun');
    moonIcon = document.querySelector('.theme-toggle__icon--moon');
}

/**
 * Update theme icons based on dark mode
 */
export function updateThemeIcons(isDark) {
    if (sunIcon) sunIcon.style.display = isDark ? 'block' : 'none';
    if (moonIcon) moonIcon.style.display = isDark ? 'none' : 'block';
}

/**
 * Get system color scheme preference
 */
export function getSystemPreference() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Get stored theme from localStorage
 */
export function getStoredTheme() {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'dark') return 'dark';
    if (stored === 'light') return 'light';
    return null;
}

/**
 * Set the theme
 */
export function setTheme(theme) {
    const isDark = theme === 'dark';
    if (isDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem(THEME_KEY, theme);
    updateThemeIcons(isDark);
}

/**
 * Initialize theme on page load
 */
export function initTheme() {
    const storedTheme = getStoredTheme();
    if (storedTheme) {
        setTheme(storedTheme);
    } else {
        const isDark = getSystemPreference();
        // Set initial theme without saving to localStorage
        if (isDark) {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
        updateThemeIcons(isDark);
    }
}

/**
 * Initialize theme event listener
 */
export function initThemeListener() {
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            setTheme(newTheme);
        });
    }

    // System color scheme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem(THEME_KEY)) {
            setTheme(e.matches ? 'dark' : 'light');
        }
    });
}
