import React, { useState } from 'react'
import { useAuthStore } from '../store/useAuthStore';
import { Link, useNavigate } from 'react-router-dom';
import MessageSquare from 'lucide-react/dist/esm/icons/message-square';
import User from 'lucide-react/dist/esm/icons/user';
import Mail from 'lucide-react/dist/esm/icons/mail';
import Lock from 'lucide-react/dist/esm/icons/lock';
import Eye from 'lucide-react/dist/esm/icons/eye';
import EyeOff from 'lucide-react/dist/esm/icons/eye-off';

const SignUpPage = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        password: "",
    });
    const [error, setError] = useState("");
    const { signup, isSigningUp } = useAuthStore();
    const navigate = useNavigate();
    
    const validateForm = () => {
        if (!formData.fullName.trim()) {
            setError("Full name is required");
            return false;
        }
        if (!formData.email.trim()) {
            setError("Email is required");
            return false;
        }
        if (!formData.email.includes("@")) {
            setError("Please enter a valid email");
            return false;
        }
        if (!formData.password) {
            setError("Password is required");
            return false;
        }
        if (formData.password.length < 6) {
            setError("Password must be at least 6 characters");
            return false;
        }
        setError("");
        return true;
    }
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;
        
        try {
            await signup(formData);
            navigate("/");
        } catch (error) {
            setError(error.message || "Failed to create account");
        }
    }
    
    return (
        <div className="min-h-screen grid lg:grid-cols-2">
            {/*Left Side*/}
            <div className="flex flex-col justify-center items-center p-6 sm:p-12">
                <div className="w-full max-w-md space-y-8">
                    {/*Logo*/}
                    <div className="text-center mb-8">
                        <div className="flex flex-col items-center gap-2 group">
                            <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center 
                            group-hover:bg-primary/20 transition-colors">
                                <MessageSquare size={24} className="text-primary"/>
                            </div>
                            <h1 className="text-2xl font-bold mt-2">Create Account </h1>
                            <p className="text-base-content/60">Get started with your free account</p>
                        </div>
                    </div>
                    {error && (
                        <div className="alert alert-error">
                            <span>{error}</span>
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text font-medium">Full Name</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User size={20} className="text-base-content/40"/>
                                </div>
                                <input
                                    type="text"
                                    className={'input input-bordered w-full pl-10'}
                                    placeholder="John Doe"
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="form-control">
                            <label className="label">
                                <span className="label-text font-medium">Email</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail size={20} className="text-base-content/40"/>
                                </div>
                                <input
                                    type="email"
                                    className={'input input-bordered w-full pl-10'}
                                    placeholder="john@example.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="form-control">
                            <label className="label">
                                <span className="label-text font-medium">Password</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock size={20} className="text-base-content/40"/>
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    className={'input input-bordered w-full pl-10'}
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                                />
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? (
                                        <EyeOff size={20} className="text-base-content/40"/>
                                    ) : (
                                        <Eye size={20} className="text-base-content/40"/>
                                    )}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary w-full"
                            disabled={isSigningUp}
                        >
                            {isSigningUp ? "Creating account..." : "Create Account"}
                        </button>
                    </form>
                    <div className="text-center">
                        <p className="text-base-content/60">
                            Already have an account?{" "}
                            <Link to="/login" className="link link-primary">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
            
            {/*Right Side*/}
            <div className="hidden lg:flex bg-primary/5 items-center justify-center p-12">
                <div className="max-w-md text-center">
                    <h2 className="text-3xl font-bold mb-4">Welcome to Our Platform</h2>
                    <p className="text-base-content/60">
                        Join our community and start connecting with others. Create your account today
                        and experience all the features we have to offer.
                    </p>
                </div>
            </div>
        </div>
    )
};

export default SignUpPage;