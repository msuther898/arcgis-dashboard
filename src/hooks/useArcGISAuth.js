import { useState, useEffect, useCallback } from 'react';
import { generateToken, getToken, setToken, clearToken, getSelf, getOrganization } from '../services/arcgis';

const STORAGE_KEY = 'arcgis_auth';

export function useArcGISAuth() {
  const [token, setTokenState] = useState(null);
  const [user, setUser] = useState(null);
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load saved auth on mount
  useEffect(() => {
    const savedAuth = localStorage.getItem(STORAGE_KEY);
    if (savedAuth) {
      try {
        const { token: savedToken, expires, user: savedUser, org: savedOrg } = JSON.parse(savedAuth);
        if (Date.now() < expires) {
          setToken(savedToken, expires);
          setTokenState(savedToken);
          setUser(savedUser);
          setOrg(savedOrg);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (username, password) => {
    setLoading(true);
    setError(null);

    try {
      const { token: newToken, expires } = await generateToken(username, password);

      // Fetch user and org info
      const [userInfo, orgInfo] = await Promise.all([
        getSelf(newToken),
        getOrganization(newToken),
      ]);

      setTokenState(newToken);
      setUser(userInfo);
      setOrg(orgInfo);

      // Save to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        token: newToken,
        expires,
        user: userInfo,
        org: orgInfo,
      }));

      setLoading(false);
      return { success: true };
    } catch (err) {
      setError(err.message);
      setLoading(false);
      return { success: false, error: err.message };
    }
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setTokenState(null);
    setUser(null);
    setOrg(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const autoLogin = useCallback(async () => {
    const username = import.meta.env.VITE_ARCGIS_USERNAME;
    const password = import.meta.env.VITE_ARCGIS_PASSWORD;

    if (username && password && password !== 'your_password_here') {
      return login(username, password);
    }
    return { success: false, error: 'Credentials not configured' };
  }, [login]);

  return {
    token: token || getToken(),
    user,
    org,
    loading,
    error,
    isAuthenticated: !!token,
    login,
    logout,
    autoLogin,
  };
}
