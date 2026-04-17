import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAppParams from '../shared/hooks/useAppParams';
import { selectIsAuthenticated } from '../store/auth/authSelectors';
import { useAppSelector } from '../store/hooks';

const RequireAuth = () => {
  const { appId } = useAppParams();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    const loginPath =
      appId && appId !== 'undefined' ? `/${appId}/login` : '/login';
    return (
      <Navigate
        to={loginPath}
        state={{ from: location }}
        replace
      />
    );
  }

  return <Outlet />;
};

export default RequireAuth;
