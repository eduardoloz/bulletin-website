import { createClient } from '@supabase/supabase-js';

const supabaseUrl =  "https://wjzunomwbkpdvoukpdht.supabase.co";
const supabaseAnonKey = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqenVub213YmtwZHZvdWtwZGh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1MTU5MzIsImV4cCI6MjA3NTA5MTkzMn0.a7iKShIYHljLZEuEuA2IbnPW7NhWXHUzXcvK_9wc9c8;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function addUser(id, user_name, user_email, user_major, courses_taken){
    const { data, error } = await supabase
        .from('UserData')
        .insert([
            { id: id, user_name: user_name, user_email: user_email, user_major: user_major, courses_taken: courses_taken }
        ]);
        if (error) {
    console.error('Error adding user:', error);
  } else {
    console.log('User added:', data);
  }
}

async function getMajorById(id){
    const { data, error } = await supabase
        .from('UserData')
        .select('user_major')
        .eq('id', id);
    if (error) {
        console.error('Error fetching major:', error);
        return null;
    } else {
        return data.length > 0 ? data[0].user_major : null;
    }
}

async function addMajor(MajorName, requirements){
    const { data, error } = await supabase
        .from('MajorData')
        .insert([
            { Major_name: MajorName, requirements: requirements }
        ])};
        if (error) {
    console.error('Error adding major:', error);
  } else {
    console.log('Major added:', data);
  }

async function addCourse(CourseName, prereqs){
    const { data, error } = await supabase
        .from('CourseData')
        .insert([
            { Course_name: CourseName, prereqs: prereqs }
        ]);
        if (error) {
    console.error('Error adding course:', error);
  } else {
    console.log('Course added:', data);
  }
}