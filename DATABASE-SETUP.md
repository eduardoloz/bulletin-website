# Database Setup Instructions

## Overview
Your course planner now **automatically saves** all user progress to Supabase! When users click on courses to mark them as completed or add external courses, the changes are immediately persisted to the database.

## Setup Steps

### 1. Create the Database Table

1. Go to your Supabase SQL Editor:
   - Visit: https://supabase.com/dashboard/project/ivgfwasqkndbtucqpkkw/editor

2. Copy the entire contents of `supabase-schema.sql` from this repo

3. Paste it into the SQL editor and click "Run"

This will:
- ✅ Create the `user_progress` table
- ✅ Enable Row Level Security (RLS) so users can only access their own data
- ✅ Set up policies for secure access
- ✅ Add indexes for performance
- ✅ Create auto-update triggers for timestamps

### 2. Verify the Table Was Created

Run this query in the SQL editor to verify:

```sql
SELECT * FROM user_progress LIMIT 5;
```

You should see an empty table with these columns:
- `user_id` (UUID)
- `completed_courses` (UUID[])
- `taking_now` (UUID[])
- `external_courses` (TEXT[])
- `standing` (INTEGER)
- `major_id` (UUID)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

### 3. Test the Application

1. **Fix Google OAuth first** (if you haven't already):
   - Go to Google Cloud Console: https://console.cloud.google.com/apis/credentials
   - Add this to your OAuth redirect URIs: `https://ivgfwasqkndbtucqpkkw.supabase.co/auth/v1/callback`

2. **Start your app**:
   ```bash
   npm start
   ```

3. **Sign in with Google**

4. **Test course selection**:
   - Switch to "Completed Mode"
   - Click on a course to mark it as completed (it should turn green)
   - You should see a "Saving your progress..." indicator briefly
   - Refresh the page - your selections should persist!

5. **Test external courses**:
   - Add an external course (e.g., "MAT 125")
   - Refresh the page - it should still be there!

## How It Works

### Automatic Saving
Every time you:
- ✅ Click a course to mark as completed
- ✅ Add an external course
- ✅ Remove an external course

The app **immediately** saves to Supabase. No manual "Save" button needed!

### Data Persistence
- **Local state**: Fast UI updates using React state
- **Database sync**: Automatic background saves to Supabase
- **On page load**: Automatically loads your saved progress

### Security
- ✅ Row Level Security (RLS) enabled
- ✅ Users can ONLY access their own data
- ✅ All queries are authenticated via Supabase auth tokens

## Troubleshooting

### "Failed to save progress" error
1. Check your browser console for detailed errors
2. Verify you're signed in (check top-right corner)
3. Verify the database table exists in Supabase
4. Check RLS policies are enabled

### Progress doesn't load
1. Check browser console for errors
2. Verify your `.env` file has correct Supabase credentials
3. Try signing out and back in

### Changes don't persist
1. Open browser DevTools → Network tab
2. Click a course to mark completed
3. Look for a POST request to Supabase
4. If no request appears, check console for errors

## Database Schema Details

```typescript
interface UserProgress {
  user_id: UUID;                    // Links to auth.users.id
  completed_courses: UUID[];        // Course IDs marked as done
  taking_now: UUID[];              // Currently enrolled (not used yet)
  external_courses: string[];       // e.g., ["MAT 125", "AMS 151"]
  standing: number;                 // 1-5 (Freshman to Graduate)
  major_id: UUID | null;           // Future: link to majors table
  created_at: timestamp;
  updated_at: timestamp;            // Auto-updates on every save
}
```

## Next Steps

Once this is working, you could add:
- 📊 Progress statistics (% completion, credits earned, etc.)
- 📅 Semester planning (use the `taking_now` field)
- 🎓 Major requirements tracking (use `major_id`)
- 📱 Export/import progress as JSON
- 👥 Share progress with advisors

---

**Need help?** Check the browser console for errors or reach out to the team!
