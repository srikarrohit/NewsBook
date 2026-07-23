import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { normalizeRole } from '../constants/roleUtils';

export default function Login() {
  const { login, user, isLoading } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isLoading && user) {
      const role = normalizeRole(user.role);
      const isSuperAdmin = role === 'super_admin' || user.username?.toLowerCase() === 'superadmin';
      if (isSuperAdmin) {
        navigate('/superadmin', { replace: true });
      } else if (role === 'admin' && user.tileId) {
        navigate(`/admin/${user.tileId}`, { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
    }
  }, [user, isLoading, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await login(username, password);
      setUsername('');
      setPassword('');
    } catch (e) {
      setError(e.message || 'Invalid credentials');
    }
  };

  if (isLoading) {
    return (
      <div className="login-container">
        <p className="login-subtitle">Checking credentials...</p>
      </div>
    );
  }

  return (
    <div className="login-container">
      <h1 className="login-title">Welcome back</h1>
      <p className="login-subtitle">Sign in to manage your dedicated newspaper grid.</p>
      <form onSubmit={handleLogin}>
        <input
          className="input"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoCapitalize="none"
        />
        <input
          className="input"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="error-text">{error}</p>}
        <button type="submit" className="submit-button">Continue</button>
      </form>
    </div>
  );
}
