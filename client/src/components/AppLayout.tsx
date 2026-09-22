import { NavLink, Outlet } from 'react-router';
import {
    LayoutDashboard,
    Map,
    Building2,
    TriangleAlert,
    ClipboardList,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/hooks/useDispatcher';

const navigation = [
    {
        to: '/dashboard',
        label: 'Дашборд',
        icon: LayoutDashboard,
    },
    {
        to: '/map',
        label: 'Карта',
        icon: Map,
    },
    {
        to: '/objects',
        label: 'Объекты',
        icon: Building2,
    },
    {
        to: '/forecasts',
        label: 'Прогнозы',
        icon: TriangleAlert,
    },
    {
        to: '/journal',
        label: 'Журнал',
        icon: ClipboardList,
    },
];

export function AppLayout() {
    const { user, logout } = useAuth();

    return (
        <div className="min-h-screen bg-background text-foreground">
            <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border bg-card lg:flex lg:flex-col">
                <div className="border-b border-border px-6 py-5">
                    <h1 className="text-lg font-bold">
                        Москоллектор
                    </h1>

                    <p className="mt-1 text-xs text-muted-foreground">
                        Предиктивный мониторинг
                    </p>
                </div>

                <nav className="flex-1 space-y-1 p-4">
                    {navigation.map((item) => {
                        const Icon = item.icon;

                        return (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                className={({ isActive }) =>
                                    [
                                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                                        isActive
                                            ? 'bg-primary text-primary-foreground'
                                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                                    ].join(' ')
                                }
                            >
                                <Icon className="h-4 w-4" />
                                {item.label}
                            </NavLink>
                        );
                    })}
                </nav>

                <div className="border-t border-border p-4">
                    <div className="mb-4">
                        <p className="text-sm font-medium">
                            {user?.name ?? 'Диспетчер'}
                        </p>

                        <p className="text-xs text-muted-foreground">
                            {user?.role ?? ''}
                        </p>
                    </div>

                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => logout()}
                    >
                        Завершить смену
                    </Button>
                </div>
            </aside>

            <div className="lg:pl-64">
                <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/95 px-6 backdrop-blur">
                    <div>
                        <p className="font-semibold">
                            Центр предиктивного мониторинга
                        </p>

                        <p className="text-xs text-muted-foreground">
                            Инженерные коллекторы Москвы
                        </p>
                    </div>

                    <ThemeToggle />
                </header>

                <main>
                    <Outlet />
                </main>
            </div>
        </div>
    );
}