import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function GoogleAuthBtn() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSuccess = async (credentialResponse: CredentialResponse) => {
    try {
      // Get the ID Token from Google
      const { credential } = credentialResponse;

      if (!credential) {
        throw new Error("No credential received from Google");
      }

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
    <div className="w-full flex justify-center overflow-hidden">
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => console.error('Login Failed')}
        theme="filled_blue"
        shape="pill"
        width="320"
        text="continue_with"
        logo_alignment="left"
      />
    </div>
  );
}