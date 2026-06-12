-- Database Schema for St. Paul Secondary School ID Card Management System

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. School Settings Table
CREATE TABLE IF NOT EXISTS school_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_name TEXT NOT NULL DEFAULT 'St. Paul Secondary School, Nasuti',
    school_address TEXT NOT NULL DEFAULT 'P.O. Box 678, Nasuti, Iganga',
    telephone TEXT DEFAULT '+256 701 234567',
    email TEXT DEFAULT 'info@stpaulnasuti.ac.ug',
    motto TEXT DEFAULT 'Education for Service',
    school_logo_url TEXT,
    school_stamp_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed default settings
INSERT INTO school_settings (school_name, school_address, telephone, email, motto)
VALUES ('St. Paul Secondary School, Nasuti', 'P.O. Box 678, Nasuti, Iganga', '+256 701 234567', 'info@stpaulnasuti.ac.ug', 'Education for Service')
ON CONFLICT DO NOTHING;

-- 2. Staff Table
CREATE TABLE IF NOT EXISTS staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_number TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    gender TEXT NOT NULL CHECK (gender IN ('Male', 'Female', 'Other')),
    department TEXT NOT NULL,
    designation TEXT NOT NULL,
    subjects TEXT, -- Comma-separated or JSON list of subjects
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    photo_url TEXT, -- Path to photo in Supabase Storage or Base64
    signature_url TEXT, -- Path to signature in Supabase Storage or Base64
    card_number TEXT UNIQUE NOT NULL, -- Generated unique card code
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for searching staff
CREATE INDEX IF NOT EXISTS idx_staff_number ON staff(staff_number);
CREATE INDEX IF NOT EXISTS idx_staff_card_number ON staff(card_number);

-- 3. Signatures Table (for Authorized and Holder Signatures storage backup if separate)
CREATE TABLE IF NOT EXISTS signatures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
    signature_type TEXT NOT NULL CHECK (signature_type IN ('Holder', 'Authorised')),
    signature_image_url TEXT NOT NULL, -- Path or base64
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Card Templates Table
CREATE TABLE IF NOT EXISTS card_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_name TEXT NOT NULL DEFAULT 'Default Template',
    is_active BOOLEAN NOT NULL DEFAULT true,
    font_family TEXT DEFAULT 'Outfit',
    theme_color_primary TEXT DEFAULT '#0369a1', -- School blue
    theme_color_secondary TEXT DEFAULT '#0f172a',
    watermark_opacity NUMERIC DEFAULT 0.08,
    watermark_size TEXT DEFAULT 'large',
    logo_size INTEGER DEFAULT 48,
    qr_position JSONB DEFAULT '{"x": 80, "y": 80}',
    photo_position JSONB DEFAULT '{"x": 10, "y": 25}',
    element_positions JSONB DEFAULT '{}', -- Coordinate details for draggable texts
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Card Printing History Table
CREATE TABLE IF NOT EXISTS printing_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
    printed_by TEXT DEFAULT 'Administrator',
    printed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'Success'
);

-- Create trigger to auto-update timestamps
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_school_settings_modtime BEFORE UPDATE ON school_settings FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_staff_modtime BEFORE UPDATE ON staff FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_card_templates_modtime BEFORE UPDATE ON card_templates FOR EACH ROW EXECUTE FUNCTION update_modified_column();
