import { LoginForm } from '../components/Auth/LoginForm';

export function LoginPage() {
  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1 className="login-logo">Birdie & Ripsaw's Diner</h1>
          <p className="login-subtitle">Family Meal Planning</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
