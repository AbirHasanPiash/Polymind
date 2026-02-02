import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function GoogleAuthBtn() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSuccess = async (credentialResponse: any) => {
    try {
      // Get the ID Token from Google
      const { credential } = credentialResponse;

      // Send it to Backend
      const res = await api.post('/auth/google', { token: credential });

      // Log the user in
      login(res.data.access_token);

      // Redirect to Dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error("Google Login Failed", error);
      alert("Login failed. Please try again.");
    }
  };

  return (
    <div className="flex justify-center">
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => console.log('Login Failed')}
        theme="filled_blue"
        shape="pill"
        width="350"
      />
    </div>
  );
}