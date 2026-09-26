import { Button } from '@/components/ui/button';
import { useTheme } from './ui/theme-provider';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
            {theme === 'dark' ? (
                <>
                    <Sun className="mr-2 h-4 w-4" />
                    <span>Светлая</span>
                </>
            ) : (
                <>
                    <Moon className="mr-2 h-4 w-4" />
                    <span>Темная</span>
                </>
            )}
        </Button>
    );
}