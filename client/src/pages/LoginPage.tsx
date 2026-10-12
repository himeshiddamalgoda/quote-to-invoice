import { LoginForm } from '../features/auth/components/LoginForm';
export default function LoginPage() {
  return (
    <section className="panel login">
      <h1>Sign in</h1>
      <p>Use your provisioned Quote Flow account.</p>
      <LoginForm />
    </section>
  );
}
