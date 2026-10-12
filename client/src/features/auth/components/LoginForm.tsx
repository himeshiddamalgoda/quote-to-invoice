import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { login } from '../api/auth.api';
import { loginSchema, type LoginInput } from '../schemas/login.schema';
import { useAuth } from '../hooks/use-auth';
import { getErrorMessage } from '../../../api/http';
export function LoginForm() {
  const auth = useAuth();
  const navigate = useNavigate();
  const form = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });
  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (session) => {
      auth.signIn(session);
      navigate('/', { replace: true });
    },
  });
  return (
    <form onSubmit={form.handleSubmit((input) => mutation.mutate(input))} noValidate>
      <label htmlFor="email">Email</label>
      <input
        id="email"
        type="email"
        autoComplete="username"
        aria-invalid={!!form.formState.errors.email}
        aria-describedby="email-error"
        {...form.register('email')}
      />
      <span id="email-error" className="error">
        {form.formState.errors.email?.message}
      </span>
      <label htmlFor="password">Password</label>
      <input
        id="password"
        type="password"
        autoComplete="current-password"
        aria-invalid={!!form.formState.errors.password}
        aria-describedby="password-error"
        {...form.register('password')}
      />
      <span id="password-error" className="error">
        {form.formState.errors.password?.message}
      </span>
      {mutation.isError && (
        <p role="alert" className="error">
          {getErrorMessage(mutation.error)}
        </p>
      )}
      <button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
