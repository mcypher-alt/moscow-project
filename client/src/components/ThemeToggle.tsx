import { Button } from '@/components/ui/button';
import { useTheme } from './ui/theme-provider';

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
            {theme === 'dark' ? '☀️ Светлая' : '🌙 Темная'}
        </Button>
    );
}