import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { normalizeRole } from '../constants/roleUtils';

export default function AdminHome() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;
    const role = normalizeRole(user?.role);
    const isSuperAdmin = role === 'super_admin' || user?.username?.toLowerCase() === 'superadmin';
    if (isSuperAdmin) {
      navigate('/superadmin', { replace: true });
    } else if (role === 'admin' && user?.tileId) {
      navigate(`/admin/${user.tileId}`, { replace: true });
    } else if (!user) {
      navigate('/login', { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  }, [user, isLoading, navigate]);

  return (
    <div className="page-loader">
      <div className="spinner" />
    </div>
  );
}
