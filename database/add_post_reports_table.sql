-- Create post_reports table for reporting inappropriate posts
-- This script adds the ability to report posts for moderation

-- Create post_reports table
CREATE TABLE IF NOT EXISTS post_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES group_posts(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL DEFAULT 'inappropriate_content',
  additional_info TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES profiles(id),
  
  -- Prevent duplicate reports from the same user for the same post
  UNIQUE(post_id, reporter_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_post_reports_post_id ON post_reports(post_id);
CREATE INDEX IF NOT EXISTS idx_post_reports_reporter_id ON post_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_post_reports_status ON post_reports(status);
CREATE INDEX IF NOT EXISTS idx_post_reports_created_at ON post_reports(created_at);

-- Enable RLS
ALTER TABLE post_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for post_reports
-- Users can create reports
CREATE POLICY "Users can create post reports" ON post_reports
FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Users can view their own reports
CREATE POLICY "Users can view their own reports" ON post_reports
FOR SELECT USING (auth.uid() = reporter_id);

-- Moderators/admins can view all reports (for future admin functionality)
CREATE POLICY "Admins can view all reports" ON post_reports
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'moderator')
  )
);

-- Moderators/admins can update report status
CREATE POLICY "Admins can update reports" ON post_reports
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'moderator')
  )
);

-- Add comments
COMMENT ON TABLE post_reports IS 'Reports of inappropriate posts for moderation';
COMMENT ON COLUMN post_reports.reason IS 'Reason for reporting (inappropriate_content, spam, harassment, etc.)';
COMMENT ON COLUMN post_reports.status IS 'Status of the report (pending, reviewed, resolved, dismissed)';
COMMENT ON COLUMN post_reports.additional_info IS 'Optional additional information from the reporter';

-- Grant permissions
GRANT SELECT, INSERT ON post_reports TO authenticated;
GRANT UPDATE ON post_reports TO authenticated; -- For admin users only via RLS
