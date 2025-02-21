"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormField, FormItem, FormControl, FormMessage } from "@/components/ui/form";
import { emailLogin, signInWithGithub, signInWithGoogle } from "./actions";
import { useRouter, useSearchParams } from "next/navigation";

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

const Login = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "" },
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const formData = new FormData();
      formData.append('email', values.email);
      formData.append('password', values.password);
      
      const result = await emailLogin(formData);
      
      if (result?.error) {
        setError(result.error);
      } else if (result?.success && result.redirectTo) {
        router.push(result.redirectTo);
      }
    } catch (err) {
      setError('An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGithubLogin = async () => {
    try {
      setIsLoading(true);
      const result = await signInWithGithub();
      if (result.error) {
        setError(result.error);
      } else if (result.url) {
        // Redirect to the GitHub OAuth page
        window.location.href = result.url;
      }
    } catch (err) {
      setError('An error occurred during GitHub login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      const result = await signInWithGoogle();
      if (result.error) {
        setError(result.error);
      } else if (result.url) {
        // Redirect to the Google OAuth page
        window.location.href = result.url;
      }
    } catch (err) {
      setError('An error occurred during Google login');
    } finally {
      setIsLoading(false);
    }
  };

  // Show error message if present in URL
  useEffect(() => {
    const message = searchParams.get('message');
    if (message) setError(message);
  }, [searchParams]);

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <div className="w-full md:w-1/2 p-8 md:p-16 flex flex-col justify-between animate-fade-in">
        <div>
          <div className="flex items-center gap-2 mb-12">
            <div className="w-8 h-8 bg-brand-blue rounded-lg"></div>
            <span className="text-xl font-semibold">dotwork</span>
          </div>

          <div className="max-w-md">
            <h1 className="text-3xl font-bold mb-2">Log in to your Account</h1>
            <p className="text-gray-600 mb-8">Welcome back! Select method to log in:</p>

            <div className="flex gap-4 mb-8">
              <Button 
                variant="outline" 
                className="flex-1 gap-2 hover:bg-gray-50" 
                onClick={handleGoogleLogin}
                disabled={isLoading}
              >
                <Image src="/google.png" alt="Google" width={20} height={20} className="w-5 h-5" />
                {isLoading ? 'Connecting...' : 'Google'}
              </Button>
              <Button 
                variant="outline" 
                className="flex-1 gap-2 hover:bg-gray-50" 
                onClick={handleGithubLogin}
                disabled={isLoading}
              >
                <Image src="/github.png" alt="Github" width={20} height={20} className="w-5 h-5" />
                {isLoading ? 'Connecting...' : 'Github'}
              </Button>
            </div>

            <div className="relative mb-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">or continue with email</span>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-4 text-red-500 bg-red-50 rounded-md">
                {error}
              </div>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input type="email" placeholder="Email" {...field} className="w-full p-3" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="relative">
                        <FormControl>
                          <Input type={showPassword ? "text" : "password"} placeholder="Password" {...field} className="w-full p-3" />
                        </FormControl>
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                        </button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center justify-between">
                  <Link href="/forgot-password" className="text-sm text-brand-blue hover:underline">
                    Forgot Password?
                  </Link>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-brand-blue hover:bg-blue-700 text-white"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Log in'
                  )}
                </Button>
              </form>
            </Form>
          </div>
        </div>

        <p className="text-center text-gray-600 mt-8">
          Don't have an account?{" "}
          <Link href="/signup" className="text-brand-blue hover:underline">
            Create an account
          </Link>
        </p>
      </div>

      <div className="hidden md:flex md:w-1/2 bg-brand-blue p-16 items-center justify-center text-white">
        <div className="max-w-md text-center">
          <h2 className="text-3xl font-bold mb-4">Connect with every application.</h2>
          <p className="text-lg opacity-90">Everything you need in an easily customizable dashboard.</p>
          <div className="flex justify-center gap-2 mt-8">
            <div className="w-2 h-2 rounded-full bg-white opacity-90"></div>
            <div className="w-2 h-2 rounded-full bg-white opacity-50"></div>
            <div className="w-2 h-2 rounded-full bg-white opacity-50"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
