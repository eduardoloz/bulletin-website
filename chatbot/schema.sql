-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query)
-- Creates two tables that mirror your JSON data structure.

-- 1. professors
create table if not exists professors (
    id   integer primary key,   -- matches prof_id in your JSON
    name text    not null
);

-- 2. reviews
create table if not exists reviews (
    id          bigserial primary key,
    prof_id     integer references professors(id),
    prof_name   text,           -- denormalized for fast display (avoids joins)
    course      text,
    quality     numeric(3,1),
    difficulty  numeric(3,1),
    comment     text,
    tags        text,
    date        text,
    meta        text
);

-- Indexes speed up the queries we run most often
create index if not exists idx_reviews_prof_id on reviews(prof_id);
create index if not exists idx_reviews_course  on reviews(lower(course));
