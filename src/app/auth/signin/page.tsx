import { SignInForm } from '@/components/auth/SignInForm';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            登录您的账号
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            或{' '}
            <a href="/auth/signup" className="font-medium text-indigo-600 hover:text-indigo-500">
              注册新账号
            </a>
          </p>
        </div>
        <SignInForm />
      </div>
    </div>
  );
} 