'use client';

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
import { signup, signInWithGithub, signInWithGoogle } from "../login/actions";
import { useRouter, useSearchParams } from "next/navigation";

const formSchema = z.object({
  name: z.string().min(2, "Full Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const Signup = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const formData = new FormData();
      formData.append('email', data.email);
      formData.append('password', data.password);
      
      const result = await signup(formData);
      
      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        router.push('/login?message=Please check your email to confirm your account');
      }
    } catch (err) {
      setError('An error occurred during signup');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGithubSignup = async () => {
    try {
      setIsLoading(true);
      const result = await signInWithGithub();
      if (result.error) {
        setError(result.error);
      } else if (result.url) {
        window.location.href = result.url;
      }
    } catch (err) {
      setError('An error occurred during GitHub signup');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      setIsLoading(true);
      const result = await signInWithGoogle();
      if (result.error) {
        setError(result.error);
      } else if (result.url) {
        window.location.href = result.url;
      }
    } catch (err) {
      setError('An error occurred during Google signup');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const message = searchParams.get('message');
    if (message) setError(message);
  }, [searchParams]);

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left Panel */}
      <div className="w-full md:w-1/2 p-8 md:p-16 flex flex-col justify-between animate-fade-in">
        <div>
          <div className="flex items-center gap-2 mb-12">
            <div className="w-8 h-8 bg-brand-blue rounded-lg"></div>
            <span className="text-xl font-semibold">dotwork</span>
          </div>

          <div className="max-w-md">
            <h1 className="text-3xl font-bold mb-2">Create an Account</h1>
            <p className="text-gray-600 mb-8">Get started with your free account</p>

            <div className="flex gap-4 mb-8">
              <Button 
                variant="outline" 
                className="flex-1 gap-2" 
                onClick={handleGoogleSignup}
                disabled={isLoading}
              >
                <Image src="/google.png" alt="Google" width={20} height={20} />
                {isLoading ? 'Connecting...' : 'Google'}
              </Button>
              <Button 
                variant="outline" 
                className="flex-1 gap-2" 
                onClick={handleGithubSignup}
                disabled={isLoading}
              > 
                <Image src="/github.png" alt="Github" width={20} height={20} />
                {isLoading ? 'Connecting...' : 'Github'}
              </Button>
            </div>

            <div className="relative mb-8">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t"></div></div>
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
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormControl><Input placeholder="Full Name" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormControl><Input type="email" placeholder="Email" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                
                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative">
                        <Input type={showPassword ? "text" : "password"} placeholder="Password" {...field} />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
                          {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                
                <Button 
                  type="submit" 
                  className="w-full bg-brand-blue hover:bg-blue-700 text-white"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </form>
            </Form>
          </div>
        </div>

        <p className="text-center text-gray-600 mt-8">
          Already have an account? <Link href="/login" className="text-brand-blue hover:underline">Log in</Link>
        </p>
      </div>

      {/* Right Panel */}
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

export default Signup;
