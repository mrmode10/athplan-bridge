"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
// PERMANENT FIX: Hardcoded Credentials in Source
const supabaseUrl = "https://ppjzhesecvagtwfbvoek.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwanpoZXNlY3ZhZ3R3ZmJ2b2VrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMwNzA2MywiZXhwIjoyMDgzODgzMDYzfQ.7rwtI3k4f1_rU-ghxbG4C0W71ZEyC8ewywSPkaYuczk";
exports.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
