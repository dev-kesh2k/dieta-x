import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import { AppLayout, Logo } from './ui';
import Login from './pages/Login';
import Today from './pages/Today';
import Meals from './pages/Meals';
import Exercises from './pages/Exercises';
import Menu from './pages/Menu';
import Progress from './pages/Progress';
import Ranking from './pages/Ranking';
import Profile from './pages/Profile';
import Admin from './pages/Admin';

export default function App() {
  const { user, ready } = useAuth();

  if (!ready) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <Logo className="h-16 w-16 animate-pulse" />
      </div>
    );
  }

  return (
    <Routes>
      {!user ? (
        <Route path="*" element={<Login />} />
      ) : (
        <>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Today />} />
            <Route path="/refeicoes" element={<Meals />} />
            <Route path="/exercicios" element={<Exercises />} />
            <Route path="/cardapio" element={<Menu />} />
            <Route path="/progresso" element={<Progress />} />
            <Route path="/ranking" element={<Ranking />} />
            <Route path="/perfil" element={<Profile />} />
            <Route path="/admin" element={<Admin />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </>
      )}
    </Routes>
  );
}
