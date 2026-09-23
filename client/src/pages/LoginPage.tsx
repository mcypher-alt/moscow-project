import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api';
import { QUERY_KEYS } from '../hooks/useDispatcher';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '../components/ThemeToggle';
import { AxiosError } from 'axios';

export function LoginPage() {
    const [login, setLogin] = useState('');
    const [password, setPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const queryClient = useQueryClient();

    const loginMutation = useMutation({
        mutationFn: authApi.login,
        onSuccess: (data) => {
            // Мгновенно кладем профиль в кэш без лишнего перезапроса /auth/me
            queryClient.setQueryData(QUERY_KEYS.auth, data.user);
        },
        onError: (err: AxiosError<{ message?: string }>) => {
            setErrorMessage(err.response?.data?.message || 'Неверный логин или пароль');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage(null);
        loginMutation.mutate({ email: login, password });
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 relative">
            <div className="absolute top-4 right-4">
                <ThemeToggle />
            </div>

            <Card className="w-full max-w-md border-border shadow-md">
                <CardHeader className="space-y-1 text-center">
                    <CardTitle className="text-2xl font-bold tracking-tight">Авторизация</CardTitle>
                    <CardDescription>Вход в систему оперативно-диспетчерского контроля</CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        {errorMessage && (
                            <div className="p-3 text-sm rounded bg-destructive/15 text-destructive border border-destructive/20 font-medium">
                                {errorMessage}
                            </div>
                        )}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Имя пользователя / Табельный номер</label>
                            <Input
                                placeholder="Email или табельный номер"
                                value={login}
                                onChange={(e) => setLogin(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Пароль</label>
                            <Input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="pt-2 border-t-0 border-none">
                        <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                            {loginMutation.isPending ? 'Проверка прав...' : 'Войти в систему'}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}