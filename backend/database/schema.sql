-- Strokes Gained Application Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    data_source TEXT DEFAULT 'garmin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shots table - stores individual shot data
CREATE TABLE IF NOT EXISTS public.shots (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    shot_date DATE NOT NULL,
    shot_time TIME,
    hole_number INTEGER,
    shot_number INTEGER,
    club TEXT,
    distance_yards DECIMAL(10, 2),
    lie_type TEXT,
    starting_position TEXT,
    ending_position TEXT,
    strokes_gained DECIMAL(10, 4),
    benchmark TEXT DEFAULT 'pga_tour',
    raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_shots_user_id ON public.shots(user_id);
CREATE INDEX IF NOT EXISTS idx_shots_date ON public.shots(shot_date);
CREATE INDEX IF NOT EXISTS idx_shots_user_date ON public.shots(user_id, shot_date DESC);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shots ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
    ON public.profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- RLS Policies for shots
CREATE POLICY "Users can view own shots" 
    ON public.shots FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own shots" 
    ON public.shots FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shots" 
    ON public.shots FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own shots" 
    ON public.shots FOR DELETE 
    USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shots_updated_at 
    BEFORE UPDATE ON public.shots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile when user signs up
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
